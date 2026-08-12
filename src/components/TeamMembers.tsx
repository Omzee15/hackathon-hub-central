import { useEffect, useState } from "react";
import { store } from "@/lib/store";
import type { TeamMember } from "@/lib/types";
import { Users, X, Loader2 } from "lucide-react";

export function TeamMembers({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setMembers(await store.getTeamMembers(entryId));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const add = async () => {
    const value = input.trim();
    if (!value) return;
    setErr("");
    setAdding(true);
    try {
      const isPhone = /^\+?\d{7,15}$/.test(value.replace(/\s+/g, ""));
      if (isPhone) {
        const result = await store.addTeamMemberByPhone(entryId, value);
        if (!result.linked) {
          await store.addTeamGuest(entryId, value);
        }
      } else {
        await store.addTeamGuest(entryId, value);
      }
      setInput("");
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not add team member.");
    } finally {
      setAdding(false);
    }
  };

  const remove = async (memberId: string) => {
    await store.removeTeamMember(entryId, memberId);
    await load();
  };

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-secondary"
      >
        <Users className="h-3 w-3" /> {open ? "Hide team" : "Add team member"}
      </button>

      {open && (
        <div className="mt-2 rounded-md border border-border bg-background/70 p-3">
          <div className="mb-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Phone number or name"
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-ring"
            />
            <button
              onClick={add}
              disabled={adding || !input.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
            </button>
          </div>
          {err && <p className="mb-2 text-xs text-destructive">{err}</p>}

          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No team members yet.</p>
          ) : (
            <ul className="space-y-1">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded bg-secondary/60 px-2 py-1 text-xs"
                >
                  <span>
                    {m.name}
                    {m.linked && (
                      <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        app user
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => remove(m.id)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
