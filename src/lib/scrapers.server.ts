import { recordScrapeRun, shouldScrape, upsertHackathon } from "./db.server";
import type { Hackathon, Mode, Platform } from "./types";

type ScrapeResult = {
  source: string;
  imported: number;
  skipped: boolean;
  error?: string;
};

type LinkMatch = {
  href: string;
  text: string;
  index: number;
};

type ScrapedHackathon = Omit<Hackathon, "id" | "userAdded"> & {
  source: string;
};

const SCRAPE_SOURCES = [
  { source: "Devfolio", scrape: scrapeDevfolio },
  { source: "Unstop", scrape: scrapeUnstop },
  { source: "HackerRank", scrape: scrapeHackerRank },
  { source: "HackCulture", scrape: scrapeHackCulture },
] as const;

export async function syncScrapedHackathons(env: unknown, force = false): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];

  for (const { source, scrape } of SCRAPE_SOURCES) {
    if (!force && !(await shouldScrape(env, source))) {
      results.push({ source, imported: 0, skipped: true });
      continue;
    }

    try {
      const hackathons = dedupeByLink(await scrape());
      for (const h of hackathons) {
        await upsertHackathon(env, { ...h, id: stableId(h.platform, h.link) }, { source });
      }
      await recordScrapeRun(env, source, hackathons.length);
      results.push({ source, imported: hackathons.length, skipped: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scrape error";
      await recordScrapeRun(env, source, 0, message);
      results.push({ source, imported: 0, skipped: false, error: message });
    }
  }

  return results;
}

async function scrapeDevfolio(): Promise<ScrapedHackathon[]> {
  const sourceUrl = "https://devfolio.co/explore";
  const html = await fetchText(sourceUrl);
  const links = extractLinks(html, sourceUrl);
  const results: ScrapedHackathon[] = [];

  for (const link of links) {
    if (!link.href.includes("devfolio.co")) continue;
    if (!link.text || isUtilityLabel(link.text)) continue;

    const context = normalizeText(stripTags(html.slice(link.index, link.index + 2800)));
    if (!/\bHackathon\b/i.test(context)) continue;
    if (!/\b(Open|Upcoming)\b/i.test(context)) continue;

    const starts = context.match(/\bStarts\s+(\d{2}\/\d{2}\/\d{2})\b/i);
    const opens = context.match(/\bOpens\s+(\d{2}\/\d{2}\/\d{2})\b/i);
    const date = starts?.[1] ? parseDdMmYy(starts[1]) : opens?.[1] ? parseDdMmYy(opens[1]) : null;
    if (!date) continue;

    results.push({
      name: link.text,
      platform: "Devfolio",
      date,
      registrationDeadline: null,
      prize: "See announcement",
      venue: pickMode(context) === "online" ? "Remote" : "See announcement",
      mode: pickMode(context),
      link: link.href,
      description: "Imported from Devfolio's public hackathon listing.",
      source: "Devfolio",
    });
  }

  return results;
}

async function scrapeUnstop(): Promise<ScrapedHackathon[]> {
  const sourceUrl = "https://api.unstop.com/hackathons/";
  const html = await fetchText(sourceUrl);
  const links = extractLinks(html, sourceUrl);
  const results: ScrapedHackathon[] = [];

  for (const link of links) {
    const text = normalizeText(link.text);
    if (!/^hackathons\b/i.test(text)) continue;

    const deadline = parseRelativeDeadline(text);
    if (!deadline) continue;

    const nameBlock = text
      .replace(/^hackathons\s*/i, "")
      .replace(/^\d+\s+/, "")
      .split(/\d+\s+Registered\b/i)[0]
      ?.trim();
    if (!nameBlock) continue;

    results.push({
      name: compactName(nameBlock),
      platform: "Unstop",
      date: deadline,
      registrationDeadline: deadline,
      prize: parseLeadingPrize(text) ?? "See announcement",
      venue: /\bOnline\b/i.test(text) ? "Remote" : "See announcement",
      mode: /\bOnline\b/i.test(text) ? "online" : "hybrid",
      link: link.href,
      description: "Imported from Unstop's public hackathon listing.",
      source: "Unstop",
    });
  }

  return results;
}

async function scrapeHackerRank(): Promise<ScrapedHackathon[]> {
  const sourceUrl = "https://www.hackerrank.com/contests";
  const html = await fetchText(sourceUrl);
  const text = normalizeText(stripTags(html));
  const activeBlock = text.split("Active Contests")[1]?.split("Archived Contests")[0] ?? "";
  const chunks = activeBlock.split("Sign Up");
  const results: ScrapedHackathon[] = [];

  for (const chunk of chunks) {
    const name = chunk
      .replace(/Open Indefinitely/i, "")
      .replace(/Starts from .*/i, "")
      .trim();
    if (!name || isUtilityLabel(name)) continue;

    const starts = chunk.match(/Starts from\s+([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+)/i);
    const date = starts?.[1] ? parseNaturalDate(starts[1]) : todayIso();

    results.push({
      name: compactName(name),
      platform: "HackerRank",
      date,
      registrationDeadline: null,
      prize: "See announcement",
      venue: "Remote",
      mode: "online",
      link: sourceUrl,
      description: "Imported from HackerRank's public contests page.",
      source: "HackerRank",
    });
  }

  return results;
}

async function scrapeHackCulture(): Promise<ScrapedHackathon[]> {
  const urls = ["https://hackculture.io/programs", "https://zerotoone.hackculture.io/"];
  const results: ScrapedHackathon[] = [];

  for (const sourceUrl of urls) {
    const html = await fetchText(sourceUrl);
    const text = normalizeText(stripTags(html));
    const title = text.match(/#?\s*([A-Z][A-Za-z0-9\s:.'-]+Hackathon[A-Za-z0-9\s:.'-]*)/i)?.[1];
    const dateRange = text.match(/\b(\d{1,2})\s*[–-]\s*\d{1,2}\s+([A-Za-z]+)\s+(\d{4})\b/);
    if (!title || !dateRange) continue;

    const eventDate = parseDayMonthYear(dateRange[1], dateRange[2], dateRange[3]);
    const closeMatch = text.match(/close\s+\w+,\s+(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/i);
    const registrationDeadline = closeMatch
      ? parseDayMonthYear(closeMatch[1], closeMatch[2], closeMatch[3] ?? dateRange[3])
      : null;

    results.push({
      name: compactName(title),
      platform: "HackCulture",
      date: eventDate,
      registrationDeadline,
      prize: "See announcement",
      venue: /\bBengaluru\b/i.test(text) ? "Bengaluru" : "See announcement",
      mode: /\bOffline\b/i.test(text) ? "offline" : "hybrid",
      link: sourceUrl,
      description: "Imported from HackCulture's public program pages.",
      source: "HackCulture",
    });
  }

  return results;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "hackhub/1.0 (+https://hackhub.local)",
    },
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

function extractLinks(html: string, baseUrl: string): LinkMatch[] {
  const links: LinkMatch[] = [];
  const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html))) {
    try {
      links.push({
        href: new URL(decodeEntities(match[1]), baseUrl).toString(),
        text: normalizeText(stripTags(match[2])),
        index: match.index,
      });
    } catch {
      // Ignore malformed source links.
    }
  }

  return links;
}

function stripTags(value: string) {
  return decodeEntities(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]*>/g, " "));
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function normalizeText(value: string) {
  return decodeEntities(value).replace(/\s+/g, " ").trim();
}

function isUtilityLabel(text: string) {
  return /^(Home|Blog|Image|All open hackathons|All upcoming hackathons|Your hackathons|Browse Hackathons|View All)$/i.test(
    text,
  );
}

function parseDdMmYy(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return null;
  const fullYear = year < 80 ? 2000 + year : 1900 + year;
  return toIsoDate(fullYear, month, day);
}

function parseRelativeDeadline(text: string) {
  const match = text.match(/(\d+)\s+(hours?|days?|months?)\s+left/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const date = new Date();

  if (unit.startsWith("hour")) date.setHours(date.getHours() + amount);
  if (unit.startsWith("day")) date.setDate(date.getDate() + amount);
  if (unit.startsWith("month")) date.setMonth(date.getMonth() + amount);

  return date.toISOString().slice(0, 10);
}

function parseNaturalDate(value: string) {
  const match = value.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/i);
  if (!match) return todayIso();

  const now = new Date();
  const month = monthNumber(match[2]);
  const day = Number(match[1]);
  let year = now.getFullYear();
  const candidate = new Date(year, month - 1, day);
  if (candidate.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) year += 1;

  return toIsoDate(year, month, day);
}

function parseDayMonthYear(day: string, month: string, year: string) {
  return toIsoDate(Number(year), monthNumber(month), Number(day));
}

function monthNumber(month: string) {
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const index = months.findIndex((m) => m.startsWith(month.toLowerCase()));
  return index >= 0 ? index + 1 : 1;
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function pickMode(text: string): Mode {
  if (/\bHybrid\b/i.test(text)) return "hybrid";
  if (/\bOffline\b/i.test(text)) return "offline";
  return "online";
}

function parseLeadingPrize(text: string) {
  const match = text.match(/^hackathons\s+(\d{4,})\b/i);
  return match ? `₹${Number(match[1]).toLocaleString("en-IN")}` : null;
}

function compactName(name: string) {
  return name.replace(/\s+/g, " ").trim().slice(0, 90);
}

function dedupeByLink(items: ScrapedHackathon[]) {
  return [...new Map(items.map((item) => [item.link, item])).values()];
}

function stableId(platform: Platform, link: string) {
  let hash = 5381;
  const value = `${platform}:${link}`;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return `${platform.toLowerCase()}-${(hash >>> 0).toString(36)}`;
}
