import type { Hackathon, Entry } from "./types";

const K = {
  user: "hh_user_phone",
  custom: "hh_custom_hackathons",
  entries: "hh_entries",
};

export const SEED: Hackathon[] = [
  {
    id: "seed-1",
    name: "ETHIndia 2026",
    platform: "Devfolio",
    date: "2026-12-05",
    registrationDeadline: "2026-11-20",
    prize: "$150,000",
    venue: "Bangalore, India",
    mode: "offline",
    link: "https://ethindia.co",
    description: "Asia's largest Ethereum hackathon — build the future of Web3.",
  },
  {
    id: "seed-2",
    name: "Smart India Hackathon",
    platform: "Unstop",
    date: "2026-09-15",
    registrationDeadline: "2026-08-31",
    prize: "₹1,00,000",
    venue: "Pan India",
    mode: "hybrid",
    link: "https://sih.gov.in",
    description: "Government of India's flagship innovation contest.",
  },
  {
    id: "seed-3",
    name: "HackCulture Global Sprint",
    platform: "HackCulture",
    date: "2026-08-22",
    registrationDeadline: "2026-08-15",
    prize: "$25,000",
    venue: "Remote",
    mode: "online",
    link: "https://hackculture.com",
    description: "48-hour global build sprint across timezones.",
  },
  {
    id: "seed-4",
    name: "LinkedIn Build-Together",
    platform: "LinkedIn",
    date: "2026-10-11",
    registrationDeadline: "2026-09-30",
    prize: "$10,000 + LinkedIn Premium",
    venue: "Remote",
    mode: "online",
    link: "https://linkedin.com",
    description: "Ship a career-tech tool with your network.",
  },
  {
    id: "seed-5",
    name: "HackerRank CodeSprint",
    platform: "HackerRank",
    date: "2026-07-30",
    registrationDeadline: "2026-07-25",
    prize: "$20,000",
    venue: "Remote",
    mode: "online",
    link: "https://hackerrank.com",
    description: "Algorithmic contest with tiered prizes.",
  },
  {
    id: "seed-6",
    name: "Devfolio AI Wave",
    platform: "Devfolio",
    date: "2026-08-02",
    registrationDeadline: "2026-07-28",
    prize: "$50,000",
    venue: "Mumbai, India",
    mode: "hybrid",
    link: "https://devfolio.co",
    description: "Applied AI hackathon focused on production-ready tools.",
  },
  {
    id: "seed-7",
    name: "Unstop OpenSource Fest",
    platform: "Unstop",
    date: "2026-11-01",
    registrationDeadline: "2026-10-20",
    prize: "₹5,00,000",
    venue: "Delhi, India",
    mode: "offline",
    link: "https://unstop.com",
    description: "Contribute to real OSS projects, live for 72 hours.",
  },
  {
    id: "seed-8",
    name: "HackCulture Climate Jam",
    platform: "HackCulture",
    date: "2026-09-28",
    registrationDeadline: "2026-09-15",
    prize: "$15,000",
    venue: "Berlin, Germany",
    mode: "hybrid",
    link: "https://hackculture.com",
    description: "Climate-tech builders unite for a weekend of prototyping.",
  },
];

const read = <T,>(k: string, fb: T): T => {
  if (typeof window === "undefined") return fb;
  try {
    const v = window.localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
};
const write = (k: string, v: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(k, JSON.stringify(v));
  window.dispatchEvent(new Event("hh:update"));
};

export const store = {
  getUser: () => read<string | null>(K.user, null),
  setUser: (phone: string) => write(K.user, phone),
  logout: () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(K.user);
    window.dispatchEvent(new Event("hh:update"));
  },

  getCustom: () => read<Hackathon[]>(K.custom, []),
  addCustom: (h: Hackathon) => write(K.custom, [h, ...store.getCustom()]),

  getAll: (): Hackathon[] => [...store.getCustom(), ...SEED],

  getEntries: () => read<Entry[]>(K.entries, []),
  addEntry: (e: Entry) => write(K.entries, [e, ...store.getEntries()]),
  updateEntry: (id: string, patch: Partial<Entry>) => {
    write(
      K.entries,
      store.getEntries().map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
  },
  removeEntry: (id: string) => {
    write(
      K.entries,
      store.getEntries().filter((e) => e.id !== id),
    );
  },
};
