import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HackathonCard } from "@/components/HackathonCard";
import { store } from "@/lib/store";
import type { Hackathon, Platform } from "@/lib/types";
import { Search } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "hackhub — every hackathon, one place" },
      {
        name: "description",
        content:
          "Discover hackathons from Devfolio, Unstop, HackCulture, LinkedIn, HackerRank and community submissions. Track your entries and ideas in one dashboard.",
      },
      { property: "og:title", content: "hackhub — every hackathon, one place" },
      {
        property: "og:description",
        content: "Discover hackathons and track your submissions in one place.",
      },
    ],
  }),
  component: Index,
});

const PLATFORMS: (Platform | "All")[] = [
  "All",
  "Devfolio",
  "Unstop",
  "HackCulture",
  "LinkedIn",
  "HackerRank",
  "Community",
];

function Index() {
  const [items, setItems] = useState<Hackathon[]>([]);
  const [entries, setEntries] = useState<string[]>([]); // hackathon ids
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("All");
  const [mode, setMode] = useState<"all" | "online" | "offline" | "hybrid">("all");
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setItems(store.getAll().map((h) => (store.getCustom().some((c) => c.id === h.id) ? { ...h, userAdded: true } : h)));
      setEntries(store.getEntries().map((e) => e.hackathonId));
      setUser(store.getUser());
    };
    sync();
    window.addEventListener("hh:update", sync);
    return () => window.removeEventListener("hh:update", sync);
  }, []);

  const filtered = useMemo(() => {
    return items.filter((h) => {
      if (platform !== "All" && h.platform !== platform) return false;
      if (mode !== "all" && h.mode !== mode) return false;
      if (q && !h.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, platform, mode, q]);

  const track = (h: Hackathon) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    if (entries.includes(h.id)) return;
    const idea = window.prompt(`What idea are you submitting to "${h.name}"?`, "");
    if (idea === null) return;
    store.addEntry({
      id: crypto.randomUUID(),
      hackathonId: h.id,
      idea: idea.trim(),
      status: "registered",
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <AppShell>
      {/* Hero */}
      <section className="border-b border-border/60 bg-surface/60">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-clay" />
              Aggregating Devfolio · Unstop · HackCulture · LinkedIn · HackerRank
            </div>
            <h1 className="mb-4 font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
              Every hackathon,<br />
              <span className="italic text-clay">one honest place.</span>
            </h1>
            <p className="mb-8 max-w-xl text-lg text-muted-foreground">
              Browse curated hackathons from major platforms, submit ones we've missed,
              and keep every idea you pitched in a single dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/add"
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Submit a hackathon
              </Link>
              {!user && (
                <Link
                  to="/login"
                  className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-secondary"
                >
                  Sign in to track
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="mx-auto max-w-7xl px-6 pt-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search hackathons..."
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-ring"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "online", "offline", "hybrid"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
                  mode === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                {m === "all" ? "All modes" : m}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                platform === p
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((h) => (
            <HackathonCard
              key={h.id}
              h={h}
              tracked={entries.includes(h.id)}
              onTrack={() => track(h)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
              No hackathons match your filters.
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
