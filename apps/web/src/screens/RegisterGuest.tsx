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
    <main>
      <button type="button" onClick={() => navigate("/")}>
        Back
      </button>
      <h1>Register guest</h1>

      <form onSubmit={handleSubmit}>
        <label htmlFor="displayName">Name</label>
        <input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="What should we call them?"
          required
        />

        <fieldset>
          <legend>Gender (required)</legend>
          {GENDERS.map((g) => (
            <label key={g.value}>
              <input
                type="radio"
                name="gender"
                value={g.value}
                checked={gender === g.value}
                onChange={() => setGender(g.value)}
              />
              {g.label}
            </label>
          ))}
        </fieldset>

        <button type="button" onClick={() => setShowMore((v) => !v)}>
          {showMore ? "Hide extra details" : "Add more (tap to include)"}
        </button>

        {showMore && (
          <>
            <label htmlFor="birthDate">Birth date</label>
            <input
              id="birthDate"
              value={birthDateInput}
              onChange={(e) => setBirthDateInput(e.target.value)}
              placeholder="e.g. DD/MM/YY"
            />

            <label htmlFor="postcode">Postcode</label>
            <input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="e.g. 3021" />

            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="helps us avoid duplicate records"
            />

            <label htmlFor="preferredLanguage">Language</label>
            <input id="preferredLanguage" value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} />

            <label htmlFor="dietary">Dietary</label>
            <input id="dietary" value={dietary} onChange={(e) => setDietary(e.target.value)} />

            <label htmlFor="notes">Notes</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </>
        )}

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={createGuest.isPending}>
          {createGuest.isPending ? "Saving…" : "Save & start visit"}
        </button>
      </form>
    </main>
  );
}
