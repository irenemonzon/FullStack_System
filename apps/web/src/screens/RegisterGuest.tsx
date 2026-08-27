import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createGuestSchema, type CreateGuestInput } from "@support-hub/shared";
import { useCreateGuest } from "../lib/queries/guests";
import { parseDDMMYYToISO } from "../lib/date";

const GENDERS: Array<{ value: CreateGuestInput["gender"]; label: string }> = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200";
const labelClass = "block text-sm font-medium text-slate-700";

// Screen 3 — Register a new guest. Only name + gender are required —
// everything else lives behind "Add more" (see plan_project.md: the
// Figma wireframe marks birth date/postcode as required, but the DB
// schema/scope doc wins, so they stay optional here).
export default function RegisterGuest() {
  const navigate = useNavigate();
  const createGuest = useCreateGuest();

  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<CreateGuestInput["gender"] | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState("");
  const [postcode, setPostcode] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [dietary, setDietary] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!gender) {
      setError("Please select a gender.");
      return;
    }

    const birthDate = birthDateInput ? parseDDMMYYToISO(birthDateInput) : undefined;
    if (birthDateInput && !birthDate) {
      setError("Birth date should be DD/MM/YY");
      return;
    }

    const payload: CreateGuestInput = {
      displayName,
      gender,
      ...(birthDate ? { birthDate } : {}),
      ...(postcode ? { postcode } : {}),
      ...(phone ? { phone } : {}),
      ...(preferredLanguage ? { preferredLanguage } : {}),
      ...(dietary ? { dietary } : {}),
      ...(notes ? { notes } : {}),
    };

    const parsed = createGuestSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }

    try {
      const guest = await createGuest.mutateAsync(parsed.data);
      navigate("/", { state: { guest } });
    } catch {
      setError("Couldn't save this guest. Try again.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <button type="button" onClick={() => navigate("/")} className="text-sm text-purple-700 hover:underline">
          ← Back
        </button>

        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Register guest</h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          <div>
            <label htmlFor="displayName" className={labelClass}>
              Name
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should we call them?"
              required
              className={inputClass}
            />
          </div>

          <fieldset>
            <legend className={labelClass}>Gender (required)</legend>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {GENDERS.map((g) => (
                <label key={g.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={g.value}
                    checked={gender === g.value}
                    onChange={() => setGender(g.value)}
                    className="peer sr-only"
                  />
                  <span className="block rounded-lg border border-slate-300 px-3 py-3 text-center text-sm font-medium text-slate-700 transition peer-checked:border-purple-500 peer-checked:bg-purple-50 peer-checked:text-purple-700 hover:bg-slate-50">
                    {g.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="self-start text-sm text-purple-700 hover:underline"
          >
            {showMore ? "Hide extra details" : "Add more (tap to include)"}
          </button>

          {showMore && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="birthDate" className={labelClass}>
                  Birth date
                </label>
                <input
                  id="birthDate"
                  value={birthDateInput}
                  onChange={(e) => setBirthDateInput(e.target.value)}
                  placeholder="e.g. DD/MM/YY"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="postcode" className={labelClass}>
                  Postcode
                </label>
                <input
                  id="postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="e.g. 3021"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone
                </label>
                <input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="helps us avoid duplicate records"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="preferredLanguage" className={labelClass}>
                  Language
                </label>
                <input
                  id="preferredLanguage"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="dietary" className={labelClass}>
                  Dietary
                </label>
                <input id="dietary" value={dietary} onChange={(e) => setDietary(e.target.value)} className={inputClass} />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className={labelClass}>
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={createGuest.isPending}
            className="w-full rounded-lg bg-purple-600 px-4 py-3 text-base font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createGuest.isPending ? "Saving…" : "Save & start visit"}
          </button>
        </form>
      </div>
    </main>
  );
}
