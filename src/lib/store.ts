import type { Entry, Hackathon } from "./types";

const dispatchUpdate = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("hh:update"));
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export const store = {
  getUser: async () => {
    const { phone } = await request<{ phone: string | null }>("/api/auth/me");
    return phone;
  },

  setUser: async (phone: string) => {
    await request<{ phone: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
    dispatchUpdate();
  },

  logout: async () => {
    await request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    dispatchUpdate();
  },

  getAll: () => request<Hackathon[]>("/api/hackathons"),

  addCustom: async (h: Hackathon) => {
    await request<Hackathon>("/api/hackathons", {
      method: "POST",
      body: JSON.stringify(h),
    });
    dispatchUpdate();
  },

  syncHackathons: async () => {
    await request("/api/scrape", { method: "POST" });
    dispatchUpdate();
  },

  getEntries: async () => request<Entry[]>("/api/entries"),

  addEntry: async (e: Entry) => {
    await request<Entry>("/api/entries", {
      method: "POST",
      body: JSON.stringify(e),
    });
    dispatchUpdate();
  },

  updateEntry: async (id: string, patch: Partial<Entry>) => {
    await request<{ ok: boolean }>(`/api/entries/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    dispatchUpdate();
  },

  removeEntry: async (id: string) => {
    await request<{ ok: boolean }>(`/api/entries/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    dispatchUpdate();
  },
};
