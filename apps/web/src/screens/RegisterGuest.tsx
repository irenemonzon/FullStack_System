import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createGuestSchema, type CreateGuestInput } from "@support-hub/shared";
import { useCreateGuest } from "../lib/queries/guests";
import { parseDDMMYYToISO } from "../lib/date";
import { ArrowLeftIcon } from "../components/icons";
import { btn, input, label, size } from "../lib/ui";

const GENDERS: Array<{ value: CreateGuestInput["gender"]; label: string }> = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function RegisterGuest() {
  const navigate = useNavigate();
  const createGuest = useCreateGuest();

  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<CreateGuestInput["gender"] | null>(null);
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
      setError("Birth date should be DD/MM/YY or DD/MM/YYYY");
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
        <button
          type="button"
          onClick={() => navigate("/")}
          className={`inline-flex items-center gap-1.5 text-sm ${btn.ghost}`}
        >
          <ArrowLeftIcon /> Back
        </button>

        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Register guest</h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          <div>
            <label htmlFor="displayName" className={label}>
              Name
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should we call them?"
              required
              className={input}
            />
          </div>

          <fieldset>
            <legend className={label}>Gender (required)</legend>
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
                  <span className="block rounded-xl border-2 border-slate-200 px-3 py-3 text-center text-sm font-medium text-slate-700 transition peer-checked:border-indigo-500 peer-checked:bg-indigo-50 peer-checked:text-indigo-700 hover:border-slate-300">
                    {g.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="birthDate" className={label}>
                Birth date
              </label>
              <input
                id="birthDate"
                value={birthDateInput}
                onChange={(e) => setBirthDateInput(e.target.value)}
                placeholder="e.g. DD/MM/YYYY"
                className={input}
              />
            </div>

            <div>
              <label htmlFor="postcode" className={label}>
                Postcode
              </label>
              <input
                id="postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="e.g. 3021"
                className={input}
              />
            </div>

            <div>
              <label htmlFor="phone" className={label}>
                Phone
              </label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0412 345 678"
                className={input}
              />
            </div>

            <div>
              <label htmlFor="preferredLanguage" className={label}>
                Language
              </label>
              <input
                id="preferredLanguage"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                placeholder="e.g. English"
                className={input}
              />
            </div>

            <div>
              <label htmlFor="dietary" className={label}>
                Dietary
              </label>
              <input id="dietary" value={dietary} onChange={(e) => setDietary(e.target.value)} className={input} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notes" className={label}>
                Notes
              </label>
              <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={input} />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button type="submit" disabled={createGuest.isPending} className={`${btn.primary} ${size.lg} w-full`}>
            {createGuest.isPending ? "Saving…" : "Save & start visit"}
          </button>
        </form>
      </div>
    </main>
  );
}
