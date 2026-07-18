import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { store } from "@/lib/store";
import type { Entry, Hackathon } from "@/lib/types";
import { CalendarDays, MapPin, Trophy, ExternalLink, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/my")({
  head: () => ({ meta: [{ title: "My hackathons — hackhub" }] }),
  component: My,
});

const STATUS_LABEL: Record<Entry["status"], string> = {
  registered: "Registered",
  submitted: "Submitted",
  won: "Won",
  dropped: "Dropped",
};

function My() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [all, setAll] = useState<Hackathon[]>([]);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      try {
        const nextUser = await store.getUser();
        const [nextEntries, nextAll] = nextUser
          ? await Promise.all([store.getEntries(), store.getAll()])
          : [[], await store.getAll()];
        if (!active) return;
        setUser(nextUser);
        setEntries(nextEntries);
        setAll(nextAll);
        setReady(true);
      } catch (error) {
        console.error(error);
        if (active) setReady(true);
      }
    };
    void sync();
    window.addEventListener("hh:update", sync);
    return () => {
      active = false;
      window.removeEventListener("hh:update", sync);
    };
  }, []);

  useEffect(() => {
    if (ready && user === null && typeof window !== "undefined") {
      router.navigate({ to: "/login" });
    }
  }, [ready, user, router]);

  const map = new Map(all.map((h) => [h.id, h]));

  const editIdea = async (e: Entry) => {
    const idea = window.prompt("Update your idea:", e.idea);
    if (idea === null) return;
    await store.updateEntry(e.id, { idea: idea.trim() });
  };

  const cycleStatus = async (e: Entry) => {
    const order: Entry["status"][] = ["registered", "submitted", "won", "dropped"];
    const next = order[(order.indexOf(e.status) + 1) % order.length];
    await store.updateEntry(e.id, { status: next });
  };

  const remove = async (id: string) => {
    if (confirm("Remove this hackathon from your list?")) await store.removeEntry(id);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-2 font-display text-4xl">My hackathons</h1>
            <p className="text-muted-foreground">
              {entries.length} tracked · signed in as {user ?? "—"}
            </p>
          </div>
          <Link
            to="/"
            className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-secondary"
          >
            Browse more
          </Link>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-16 text-center">
            <h2 className="mb-2 font-display text-2xl">Nothing tracked yet.</h2>
            <p className="mb-6 text-muted-foreground">
              Head to the browse page and hit "Track" on any hackathon.
            </p>
            <Link
              to="/"
              className="inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Browse hackathons
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((e) => {
              const h = map.get(e.hackathonId);
              if (!h) return null;
              const d = new Date(h.date);
              return (
                <div
                  key={e.id}
                  className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-[1.1fr_1.4fr_auto]"
                >
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">{h.platform}</div>
                    <h3 className="mb-2 font-display text-xl leading-tight">{h.name}</h3>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {d.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {h.venue} · {h.mode}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5" /> {h.prize}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Your idea
                      </span>
                      <button
                        onClick={() => editIdea(e)}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-secondary"
                      >
                        <Pencil className="h-3 w-3" /> edit
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap rounded-md bg-background/70 p-3 text-sm">
                      {e.idea || (
                        <span className="text-muted-foreground italic">
                          No idea yet — click edit.
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <button
                      onClick={() => cycleStatus(e)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle(e.status)}`}
                      title="Click to advance status"
                    >
                      {STATUS_LABEL[e.status]}
                    </button>
                    <a
                      href={h.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Announcement <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => remove(e.id)}
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function statusStyle(s: Entry["status"]) {
  switch (s) {
    case "registered":
      return "bg-secondary text-secondary-foreground";
    case "submitted":
      return "bg-accent text-accent-foreground";
    case "won":
      return "bg-primary text-primary-foreground";
    case "dropped":
      return "bg-muted text-muted-foreground line-through";
  }
}
