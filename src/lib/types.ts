export type Mode = "online" | "offline" | "hybrid";
export type Platform =
  "HackCulture" | "Devfolio" | "Unstop" | "LinkedIn" | "HackerRank" | "Community";

export interface Hackathon {
  id: string;
  name: string;
  platform: Platform;
  date: string; // ISO
  registrationDeadline?: string | null; // ISO
  prize: string;
  venue: string;
  mode: Mode;
  link: string;
  description?: string;
  userAdded?: boolean;
}

export interface Entry {
  id: string;
  hackathonId: string;
  idea: string;
  status: "registered" | "submitted" | "won" | "dropped";
  createdAt: string;
}

export interface TeamMember {
  id: string; // phone for linked members, guest row id for unlinked
  name: string;
  phone?: string; // present only when linked to a registered user
  linked: boolean;
}
