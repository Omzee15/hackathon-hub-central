import type { Hackathon } from "@/lib/types";
import { CalendarDays, Clock, MapPin, Trophy, ExternalLink, Plus, Check } from "lucide-react";

const platformDot: Record<string, string> = {
  Devfolio: "bg-clay",
  Unstop: "bg-olive",
  HackCulture: "bg-sage",
  LinkedIn: "bg-primary",
  HackerRank: "bg-accent",
  Community: "bg-muted-foreground",
};

export function HackathonCard({
  h,
  tracked,
  onTrack,
}: {
  h: Hackathon;
  tracked?: boolean;
  onTrack?: () => void;
}) {
  const eventDate = formatDate(h.date);
  const registrationDeadline = h.registrationDeadline ? formatDate(h.registrationDeadline) : "Not listed";

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_1px_0_rgba(0,0,0,0.04),0_10px_30px_-15px_rgba(80,60,30,0.15)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${platformDot[h.platform] ?? "bg-muted-foreground"}`} />
          {h.platform}
          {h.userAdded && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide">
              community
            </span>
          )}
        </div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
          {h.mode}
        </span>
      </div>

      <h3 className="mb-1 font-display text-xl leading-tight">{h.name}</h3>
      {h.description && (
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{h.description}</p>
      )}

      <dl className="mb-4 space-y-1.5 text-sm">
        <Row icon={<CalendarDays className="h-3.5 w-3.5" />} label="Hackathon date">
          {eventDate}
        </Row>
        <Row icon={<Clock className="h-3.5 w-3.5" />} label="Last registration date">
          {registrationDeadline}
        </Row>
        <Row icon={<Trophy className="h-3.5 w-3.5" />} label="Prize">{h.prize}</Row>
        <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Venue">{h.venue}</Row>
      </dl>

      <div className="mt-auto flex items-center gap-2 pt-2">
        <a
          href={h.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-secondary"
        >
          Announcement <ExternalLink className="h-3.5 w-3.5" />
        </a>
        {onTrack && (
          <button
            onClick={onTrack}
            disabled={tracked}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {tracked ? (
              <>
                <Check className="h-3.5 w-3.5" /> Tracking
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Track
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <span className="mt-0.5 text-foreground/60">{icon}</span>
      <span>
        <span className="text-muted-foreground">{label}: </span>
        <span className="text-foreground">{children}</span>
      </span>
    </div>
  );
}

function formatDate(date: string) {
  const parsed = date.includes("T") ? new Date(date) : new Date(`${date}T00:00:00`);

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
