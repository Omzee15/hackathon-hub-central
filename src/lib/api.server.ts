import {
  addEntry,
  listEntries,
  listHackathons,
  removeEntry,
  updateEntry,
  upsertHackathon,
  upsertUser,
} from "./db.server";
import { syncScrapedHackathons } from "./scrapers.server";
import type { Entry, Hackathon, Mode } from "./types";

const COOKIE = "hh_phone";
const YEAR = 60 * 60 * 24 * 365;

export async function handleApiRequest(request: Request, env: unknown) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;

  try {
    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      return json({ phone: getPhone(request) });
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const body = await readBody(request);
      const phone = String(body.phone ?? "").replace(/\s+/g, "");
      if (!/^\+?\d{7,15}$/.test(phone)) {
        return json({ error: "Enter a valid phone number." }, 400);
      }
      await upsertUser(env, phone);
      return json({ phone }, 200, {
        "set-cookie": `${COOKIE}=${encodeURIComponent(phone)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${YEAR}`,
      });
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      return json({ ok: true }, 200, {
        "set-cookie": `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      });
    }

    if (url.pathname === "/api/hackathons" && request.method === "GET") {
      return json(await listHackathons(env));
    }

    if (url.pathname === "/api/hackathons" && request.method === "POST") {
      const hackathon = parseHackathon(await readBody(request));
      await upsertHackathon(env, hackathon, { source: "community", userAdded: true });
      return json(hackathon, 201);
    }

    if (url.pathname === "/api/scrape" && request.method === "POST") {
      const force = url.searchParams.get("force") === "1";
      return json(await syncScrapedHackathons(env, force));
    }

    if (url.pathname === "/api/entries" && request.method === "GET") {
      const phone = requirePhone(request);
      return json(await listEntries(env, phone));
    }

    if (url.pathname === "/api/entries" && request.method === "POST") {
      const phone = requirePhone(request);
      const entry = parseEntry(await readBody(request));
      await addEntry(env, phone, entry);
      return json(entry, 201);
    }

    const entryMatch = url.pathname.match(/^\/api\/entries\/([^/]+)$/);
    if (entryMatch && request.method === "PATCH") {
      const phone = requirePhone(request);
      const patch = parseEntryPatch(await readBody(request));
      await updateEntry(env, phone, decodeURIComponent(entryMatch[1]), patch);
      return json({ ok: true });
    }

    if (entryMatch && request.method === "DELETE") {
      const phone = requirePhone(request);
      await removeEntry(env, phone, decodeURIComponent(entryMatch[1]));
      return json({ ok: true });
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error(error);
    return json({ error: "Server error" }, 500);
  }
}

class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new ApiError("Invalid JSON body.");
  }
}

function parseHackathon(body: Record<string, unknown>): Hackathon {
  const hackathon = {
    id: String(body.id || crypto.randomUUID()),
    name: requireText(body.name, "name"),
    platform: "Community" as const,
    date: requireDate(body.date, "date"),
    registrationDeadline: requireDate(body.registrationDeadline, "registrationDeadline"),
    prize: requireText(body.prize, "prize"),
    venue: requireText(body.venue, "venue"),
    mode: parseMode(body.mode),
    link: requireUrl(body.link),
    description: optionalText(body.description),
    userAdded: true,
  };

  if (
    new Date(`${hackathon.registrationDeadline}T00:00:00`) > new Date(`${hackathon.date}T00:00:00`)
  ) {
    throw new ApiError("Last registration date cannot be after the hackathon date.");
  }

  return hackathon;
}

function parseEntry(body: Record<string, unknown>): Entry {
  return {
    id: String(body.id || crypto.randomUUID()),
    hackathonId: requireText(body.hackathonId, "hackathonId"),
    idea: String(body.idea ?? "").trim(),
    status: "registered",
    createdAt: new Date().toISOString(),
  };
}

function parseEntryPatch(body: Record<string, unknown>): Partial<Pick<Entry, "idea" | "status">> {
  const patch: Partial<Pick<Entry, "idea" | "status">> = {};
  if ("idea" in body) patch.idea = String(body.idea ?? "").trim();
  if ("status" in body) {
    const status = String(body.status);
    if (!["registered", "submitted", "won", "dropped"].includes(status)) {
      throw new ApiError("Invalid entry status.");
    }
    patch.status = status as Entry["status"];
  }
  return patch;
}

function parseMode(value: unknown): Mode {
  if (value === "online" || value === "offline" || value === "hybrid") return value;
  return "online";
}

function requireText(value: unknown, field: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new ApiError(`${field} is required.`);
  return text;
}

function optionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function requireDate(value: unknown, field: string) {
  const text = requireText(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new ApiError(`${field} must be an ISO date.`);
  return text;
}

function requireUrl(value: unknown) {
  const text = requireText(value, "link");
  try {
    return new URL(text).toString();
  } catch {
    throw new ApiError("Announcement link must be a valid URL.");
  }
}

function requirePhone(request: Request) {
  const phone = getPhone(request);
  if (!phone) throw new ApiError("Sign in required.", 401);
  return phone;
}

function getPhone(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  const match = cookies.match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...headers,
    },
  });
}
