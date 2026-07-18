import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { store } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — hackhub" }] }),
  component: Login,
});

function Login() {
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phone.replace(/\s+/g, "");
    if (!/^\+?\d{7,15}$/.test(cleaned)) {
      setErr("Enter a valid phone number (7–15 digits, optional + prefix).");
      return;
    }
    store.setUser(cleaned);
    router.navigate({ to: "/my" });
  };

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
        <h1 className="mb-2 font-display text-4xl">Welcome back.</h1>
        <p className="mb-8 text-muted-foreground">
          Sign in with your phone number to track hackathons and submissions.
        </p>
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Phone number</span>
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErr("");
              }}
              placeholder="+91 98765 43210"
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
              autoFocus
            />
          </label>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button
            type="submit"
            className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Continue
          </button>
          <p className="text-center text-xs text-muted-foreground">
            No OTP for now — your phone number is stored locally in this browser.
          </p>
        </form>
      </div>
    </AppShell>
  );
}
