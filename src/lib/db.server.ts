import { neon } from "@neondatabase/serverless";
import { SEED_HACKATHONS } from "./seed";
import type { Entry, Hackathon, Mode, Platform } from "./types";

type Sql = ReturnType<typeof neon>;
type Env = Record<string, unknown> | undefined;

type HackathonRow = {
  id: string;
  name: string;
  platform: Platform;
  event_date: string | Date;
  registration_deadline: string | Date | null;
  prize: string;
  venue: string;
  mode: Mode;
  link: string;
  description: string | null;
  user_added: boolean;
};

type EntryRow = {
  id: string;
  hackathon_id: string;
  idea: string;
  status: Entry["status"];
  created_at: string | Date;
};

const sqlByUrl = new Map<string, Sql>();
const schemaReadyByUrl = new Map<string, Promise<void>>();

export function getDatabaseUrl(env: unknown) {
  const fromEnv = env && typeof env === "object" ? (env as Env)?.DATABASE_URL : undefined;
  if (typeof fromEnv === "string" && fromEnv) return fromEnv;
  if (typeof process !== "undefined" && process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  throw new Error("DATABASE_URL is not configured.");
}

export function getSql(env: unknown) {
  const databaseUrl = getDatabaseUrl(env);
  const existing = sqlByUrl.get(databaseUrl);
  if (existing) return existing;

  const sql = neon(databaseUrl);
  sqlByUrl.set(databaseUrl, sql);
  return sql;
}

export async function ensureDatabase(env: unknown) {
  const databaseUrl = getDatabaseUrl(env);
  const existing = schemaReadyByUrl.get(databaseUrl);
  if (existing) return existing;

  const ready = createSchemaAndSeed(env);
  schemaReadyByUrl.set(databaseUrl, ready);
  return ready;
}

async function createSchemaAndSeed(env: unknown) {
  const sql = getSql(env);

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      phone TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS hackathons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      event_date DATE NOT NULL,
      registration_deadline DATE,
      prize TEXT NOT NULL DEFAULT 'Not listed',
      venue TEXT NOT NULL DEFAULT 'Not listed',
      mode TEXT NOT NULL DEFAULT 'online',
      link TEXT NOT NULL UNIQUE,
      description TEXT,
      user_added BOOLEAN NOT NULL DEFAULT false,
      source TEXT NOT NULL DEFAULT 'seed',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
      hackathon_id TEXT NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
      idea TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'registered',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (phone, hackathon_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS scrape_runs (
      source TEXT PRIMARY KEY,
      scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      imported_count INTEGER NOT NULL DEFAULT 0,
      error TEXT
    )
  `;

  for (const h of SEED_HACKATHONS) {
    await writeHackathon(sql, h, { source: "seed", userAdded: false });
  }
}

export async function listHackathons(env: unknown): Promise<Hackathon[]> {
  await ensureDatabase(env);
  const rows = await getSql(env)<HackathonRow[]>`
    SELECT
      id,
      name,
      platform,
      event_date,
      registration_deadline,
      prize,
      venue,
      mode,
      link,
      description,
      user_added
    FROM hackathons
    ORDER BY event_date ASC, created_at DESC
  `;

  return rows.map(rowToHackathon);
}

export async function upsertHackathon(
  env: unknown,
  h: Hackathon,
  options: { source: string; userAdded?: boolean },
) {
  await ensureDatabase(env);
  await writeHackathon(getSql(env), h, options);
}

async function writeHackathon(
  sql: Sql,
  h: Hackathon,
  options: { source: string; userAdded?: boolean },
) {
  const registrationDeadline = h.registrationDeadline || null;
  const userAdded = options.userAdded ?? h.userAdded ?? false;

  await sql`
    INSERT INTO hackathons (
      id,
      name,
      platform,
      event_date,
      registration_deadline,
      prize,
      venue,
      mode,
      link,
      description,
      user_added,
      source
    )
    VALUES (
      ${h.id},
      ${h.name},
      ${h.platform},
      ${h.date},
      ${registrationDeadline},
      ${h.prize},
      ${h.venue},
      ${h.mode},
      ${h.link},
      ${h.description ?? null},
      ${userAdded},
      ${options.source}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      platform = EXCLUDED.platform,
      link = EXCLUDED.link,
      event_date = EXCLUDED.event_date,
      registration_deadline = EXCLUDED.registration_deadline,
      prize = EXCLUDED.prize,
      venue = EXCLUDED.venue,
      mode = EXCLUDED.mode,
      description = EXCLUDED.description,
      updated_at = now()
  `;
}

export async function upsertUser(env: unknown, phone: string) {
  await ensureDatabase(env);
  await getSql(env)`
    INSERT INTO users (phone)
    VALUES (${phone})
    ON CONFLICT (phone) DO UPDATE SET last_seen_at = now()
  `;
}

export async function listEntries(env: unknown, phone: string): Promise<Entry[]> {
  await ensureDatabase(env);
  const rows = await getSql(env)<EntryRow[]>`
    SELECT id, hackathon_id, idea, status, created_at
    FROM entries
    WHERE phone = ${phone}
    ORDER BY created_at DESC
  `;

  return rows.map(rowToEntry);
}

export async function addEntry(env: unknown, phone: string, entry: Entry) {
  await ensureDatabase(env);
  await upsertUser(env, phone);
  await getSql(env)`
    INSERT INTO entries (id, phone, hackathon_id, idea, status, created_at)
    VALUES (
      ${entry.id},
      ${phone},
      ${entry.hackathonId},
      ${entry.idea},
      ${entry.status},
      ${entry.createdAt}
    )
    ON CONFLICT (phone, hackathon_id) DO UPDATE SET
      idea = EXCLUDED.idea,
      status = EXCLUDED.status,
      updated_at = now()
  `;
}

export async function updateEntry(
  env: unknown,
  phone: string,
  id: string,
  patch: Partial<Pick<Entry, "idea" | "status">>,
) {
  await ensureDatabase(env);
  const existing = await listEntries(env, phone);
  const current = existing.find((entry) => entry.id === id);
  if (!current) return;

  await getSql(env)`
    UPDATE entries
    SET
      idea = ${patch.idea ?? current.idea},
      status = ${patch.status ?? current.status},
      updated_at = now()
    WHERE id = ${id} AND phone = ${phone}
  `;
}

export async function removeEntry(env: unknown, phone: string, id: string) {
  await ensureDatabase(env);
  await getSql(env)`DELETE FROM entries WHERE id = ${id} AND phone = ${phone}`;
}

export async function shouldScrape(env: unknown, source: string, maxAgeHours = 6) {
  await ensureDatabase(env);
  const rows = await getSql(env)<{ stale: boolean }[]>`
    SELECT COALESCE(MAX(scraped_at) < now() - (${maxAgeHours} || ' hours')::interval, true) AS stale
    FROM scrape_runs
    WHERE source = ${source} AND error IS NULL
  `;
  return rows[0]?.stale ?? true;
}

export async function recordScrapeRun(
  env: unknown,
  source: string,
  importedCount: number,
  error?: string,
) {
  await ensureDatabase(env);
  await getSql(env)`
    INSERT INTO scrape_runs (source, imported_count, error, scraped_at)
    VALUES (${source}, ${importedCount}, ${error ?? null}, now())
    ON CONFLICT (source) DO UPDATE SET
      imported_count = EXCLUDED.imported_count,
      error = EXCLUDED.error,
      scraped_at = now()
  `;
}

function rowToHackathon(row: HackathonRow): Hackathon {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    date: toDateInput(row.event_date),
    registrationDeadline: row.registration_deadline ? toDateInput(row.registration_deadline) : null,
    prize: row.prize,
    venue: row.venue,
    mode: row.mode,
    link: row.link,
    description: row.description ?? undefined,
    userAdded: row.user_added,
  };
}

function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    hackathonId: row.hackathon_id,
    idea: row.idea,
    status: row.status,
    createdAt: toDateTime(row.created_at),
  };
}

function toDateInput(value: string | Date) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
      value.getDate(),
    ).padStart(2, "0")}`;
  }
  return value.slice(0, 10);
}

function toDateTime(value: string | Date) {
  if (value instanceof Date) return value.toISOString();
  return value;
}
