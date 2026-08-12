import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  HackathonForm,
  emptyHackathonForm,
  validateHackathonForm,
  type HackathonFormValues,
} from "@/components/HackathonForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TeamMembers } from "@/components/TeamMembers";
import { store } from "@/lib/store";
import type { Entry, Hackathon } from "@/lib/types";
import { CalendarDays, MapPin, Trophy, ExternalLink, Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/my")({
  head: () => ({ meta: [{ title: "Manage hackathons — hackhub" }] }),
  component: My,
});

const STATUS_LABEL: Record<Entry["status"], string> = {
  registered: "Registered",
  submitted: "Submitted",
  won: "Won",
  dropped: "Dropped",
};

function toForm(h?: Hackathon, e?: Entry): HackathonFormValues {
  return {
    name: h?.name ?? "",
    date: h?.date ?? "",
    registrationDeadline: h?.registrationDeadline ?? "",
    prize: h?.prize ?? "",
    venue: h?.venue ?? "",
    mode: h?.mode ?? "online",
    link: h?.link ?? "",
    description: h?.description ?? "",
    idea: e?.idea ?? "",
    status: e?.status ?? "registered",
  };
}

function My() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [all, setAll] = useState<Hackathon[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<HackathonFormValues>(emptyHackathonForm);
  const [addErr, setAddErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState<HackathonFormValues>(emptyHackathonForm);
  const [editErr, setEditErr] = useState("");

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

  const openAdd = () => {
    setAddForm(emptyHackathonForm);
    setAddErr("");
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const error = validateHackathonForm(addForm);
    if (error) {
      setAddErr(error);
      return;
    }
    try {
      setSaving(true);
      const hackathon: Hackathon = {
        id: crypto.randomUUID(),
        platform: "Community",
        userAdded: true,
        name: addForm.name,
        date: addForm.date,
        registrationDeadline: addForm.registrationDeadline || null,
        prize: addForm.prize,
        venue: addForm.venue,
        mode: addForm.mode,
        link: addForm.link,
        description: addForm.description || undefined,
      };
      await store.addCustom(hackathon);
      await store.addEntry({
        id: crypto.randomUUID(),
        hackathonId: hackathon.id,
        idea: addForm.idea.trim(),
        status: addForm.status,
        createdAt: new Date().toISOString(),
      });
      setAddOpen(false);
    } catch (error) {
      setAddErr(error instanceof Error ? error.message : "Could not add hackathon.");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (e: Entry) => {
    const h = map.get(e.hackathonId);
    setEditEntry(e);
    setEditForm(toForm(h, e));
    setEditErr("");
  };

  const submitEdit = async () => {
    if (!editEntry) return;
    const error = validateHackathonForm(editForm);
    if (error) {
      setEditErr(error);
      return;
    }
    try {
      setSaving(true);
      await store.updateHackathon(editEntry.hackathonId, {
        name: editForm.name,
        date: editForm.date,
        registrationDeadline: editForm.registrationDeadline || null,
        prize: editForm.prize,
        venue: editForm.venue,
        mode: editForm.mode,
        link: editForm.link,
        description: editForm.description || undefined,
      });
      await store.updateEntry(editEntry.id, {
        idea: editForm.idea.trim(),
        status: editForm.status,
      });
      setEditEntry(null);
    } catch (error) {
      setEditErr(error instanceof Error ? error.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const cycleStatus = async (e: Entry) => {
    const order: Entry["status"][] = ["registered", "submitted", "won", "dropped"];
    const next = order[(order.indexOf(e.status) + 1) % order.length];
    await store.updateEntry(e.id, { status: next });
  };

  const remove = async (e: Entry) => {
    if (!confirm("Remove this hackathon from your list?")) return;
    await store.removeEntry(e.id);
    const h = map.get(e.hackathonId);
    if (h?.userAdded) {
      await store.deleteHackathon(h.id).catch(() => {});
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-2 font-display text-4xl">Manage hackathons</h1>
            <p className="text-muted-foreground">
              {entries.length} tracked · signed in as {user ?? "—"}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Add manually
            </button>
            <Link
              to="/"
              className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-secondary"
            >
              Browse more
            </Link>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-16 text-center">
            <h2 className="mb-2 font-display text-2xl">Nothing tracked yet.</h2>
            <p className="mb-6 text-muted-foreground">
              Head to the browse page and hit "Track" on any hackathon, or add one manually.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                to="/"
                className="inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Browse hackathons
              </Link>
              <button
                onClick={openAdd}
                className="inline-flex rounded-md border border-border bg-background px-5 py-2.5 text-sm hover:bg-secondary"
              >
                Add manually
              </button>
            </div>
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
                        onClick={() => openEdit(e)}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-secondary"
                      >
                        <Pencil className="h-3 w-3" /> edit
                      </button>
                    </div>
                    <p className="mb-2 whitespace-pre-wrap rounded-md bg-background/70 p-3 text-sm">
                      {e.idea || (
                        <span className="text-muted-foreground italic">
                          No idea yet — click edit.
                        </span>
                      )}
                    </p>
                    <TeamMembers entryId={e.id} />
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
                      onClick={() => remove(e)}
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a hackathon manually</DialogTitle>
          </DialogHeader>
          <HackathonForm form={addForm} onChange={setAddForm} />
          {addErr && <p className="text-sm text-destructive">{addErr}</p>}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="rounded-md border border-border bg-background px-5 py-2.5 text-sm hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={submitAdd}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {saving ? "Saving..." : "Add hackathon"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editEntry !== null} onOpenChange={(open) => !open && setEditEntry(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit hackathon</DialogTitle>
          </DialogHeader>
          <HackathonForm form={editForm} onChange={setEditForm} />
          {editErr && <p className="text-sm text-destructive">{editErr}</p>}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setEditEntry(null)}
              className="rounded-md border border-border bg-background px-5 py-2.5 text-sm hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={submitEdit}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
