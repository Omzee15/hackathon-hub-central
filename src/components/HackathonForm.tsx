import type { Mode } from "@/lib/types";

export interface HackathonFormValues {
  name: string;
  date: string;
  registrationDeadline: string;
  prize: string;
  venue: string;
  mode: Mode;
  link: string;
  description: string;
  idea: string;
  status: "registered" | "submitted" | "won" | "dropped";
}

export const emptyHackathonForm: HackathonFormValues = {
  name: "",
  date: "",
  registrationDeadline: "",
  prize: "",
  venue: "",
  mode: "online",
  link: "",
  description: "",
  idea: "",
  status: "registered",
};

export function validateHackathonForm(form: HackathonFormValues): string {
  if (!form.name || !form.date || !form.prize || !form.venue || !form.link) {
    return "Please fill in all required fields.";
  }
  if (
    form.registrationDeadline &&
    new Date(`${form.registrationDeadline}T00:00:00`) > new Date(`${form.date}T00:00:00`)
  ) {
    return "Last registration date cannot be after the hackathon date.";
  }
  try {
    new URL(form.link);
  } catch {
    return "Announcement link must be a valid URL.";
  }
  return "";
}

export function HackathonForm({
  form,
  onChange,
  includeEntryFields = true,
}: {
  form: HackathonFormValues;
  onChange: (next: HackathonFormValues) => void;
  includeEntryFields?: boolean;
}) {
  const set = <K extends keyof HackathonFormValues>(k: K, v: HackathonFormValues[K]) =>
    onChange({ ...form, [k]: v });

  return (
    <div className="space-y-5">
      <Field label="Hackathon name" required>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} className="input" />
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
        <Field label="Last registration date">
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
      {includeEntryFields && (
        <>
          <Field label="Your idea / submission">
            <textarea
              value={form.idea}
              onChange={(e) => set("idea", e.target.value)}
              rows={3}
              placeholder="What are you building?"
              className="input"
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as HackathonFormValues["status"])}
              className="input"
            >
              <option value="registered">Registered</option>
              <option value="submitted">Submitted</option>
              <option value="won">Won</option>
              <option value="dropped">Dropped</option>
            </select>
          </Field>
        </>
      )}
      <style>{`.input{width:100%;border:1px solid var(--border);background:var(--background);border-radius:0.5rem;padding:0.55rem 0.75rem;font-size:0.875rem;outline:none}.input:focus{border-color:var(--ring)}`}</style>
    </div>
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

