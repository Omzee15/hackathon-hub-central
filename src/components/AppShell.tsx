import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { store } from "@/lib/store";

export function AppShell({ children }: { children: ReactNode }) {
  const [phone, setPhone] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const sync = () => setPhone(store.getUser());
    sync();
    window.addEventListener("hh:update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("hh:update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-display text-lg">
              h
            </div>
            <span className="font-display text-xl tracking-tight">hackhub</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/">Browse</NavLink>
            <NavLink to="/add">Submit hackathon</NavLink>
            {phone && <NavLink to="/my">My hackathons</NavLink>}
          </nav>
          <div className="flex items-center gap-2">
            {phone ? (
              <div className="flex items-center gap-2">
                <div className="hidden rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground sm:block">
                  {phone}
                </div>
                <button
                  onClick={() => {
                    store.logout();
                    router.navigate({ to: "/" });
                  }}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-24 border-t border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-8 text-xs text-muted-foreground">
          hackhub — one place for every hackathon you're chasing.
        </div>
      </footer>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      activeProps={{ className: "rounded-md px-3 py-2 text-sm bg-secondary text-foreground font-medium" }}
      activeOptions={{ exact: true }}
    >
      {children}
    </Link>
  );
}
