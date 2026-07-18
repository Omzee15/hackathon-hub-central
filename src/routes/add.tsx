import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { store } from "@/lib/store";
import type { Mode } from "@/lib/types";

export const Route = createFileRoute("/add")({
  head: () => ({ meta: [{ title: "Submit a hackathon — hackhub" }] }),
  component: Add,
});

function Add() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    date: "",
    registrationDeadline: "",
    prize: "",
    venue: "",
    mode: "online" as Mode,
    link: "",
    description: "",
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.name ||
      !form.date ||
      !form.registrationDeadline ||
      !form.prize ||
      !form.venue ||
      !form.link
    ) {
      setErr("Please fill in all required fields.");
      return;
    }
    if (new Date(`${form.registrationDeadline}T00:00:00`) > new Date(`${form.date}T00:00:00`)) {
      setErr("Last registration date cannot be after the hackathon date.");
      return;
    }
    try {
      new URL(form.link);
    } catch {
      setErr("Announcement link must be a valid URL.");
      return;
    }
    try {
      setSaving(true);
      await store.addCustom({
        id: crypto.randomUUID(),
        platform: "Community",
        userAdded: true,
        ...form,
      });
      router.navigate({ to: "/" });
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not submit hackathon.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-2 font-display text-4xl">Submit a hackathon</h1>
        <p className="mb-8 text-muted-foreground">
          Missing from our catalog? Add it and help the community find it.
        </p>
        <form onSubmit={submit} className="space-y-5 rounded-xl border border-border bg-card p-6">
          <Field label="Hackathon name" required>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Hackathon date" required>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Last registration date" required>
              <input
                type="date"
                value={form.registrationDeadline}
                onChange={(e) => set("registrationDeadline", e.target.value)}
                className="input"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Prize" required>
              <input
                value={form.prize}
                onChange={(e) => set("prize", e.target.value)}
                placeholder="e.g. $10,000"
                className="input"
              />
            </Field>
            <Field label="Venue" required>
              <input
                value={form.venue}
                onChange={(e) => set("venue", e.target.value)}
                placeholder="City / Remote"
                className="input"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Mode" required>
              <select
                value={form.mode}
                onChange={(e) => set("mode", e.target.value as Mode)}
                className="input"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </Field>
          </div>
          <Field label="Announcement link" required>
            <input
              value={form.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="https://..."
              className="input"
            />
          </Field>
          <Field label="Short description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="input"
            />
          </Field>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {saving ? "Submitting..." : "Submit hackathon"}
            </button>
            <button
              type="button"
              onClick={() => router.navigate({ to: "/" })}
              className="rounded-md border border-border bg-background px-5 py-2.5 text-sm hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
        <style>{`.input{width:100%;border:1px solid var(--border);background:var(--background);border-radius:0.5rem;padding:0.55rem 0.75rem;font-size:0.875rem;outline:none}.input:focus{border-color:var(--ring)}`}</style>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label} {required && <span className="text-clay">*</span>}
      </span>
      {children}
    </label>
  );
}
