import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createGuestSchema, type CreateGuestInput } from "@support-hub/shared";
import { useCreateGuest, type DuplicateGuest } from "../lib/queries/guests";
import { ApiError } from "../lib/apiClient";
import DuplicateGuestWarning from "../components/DuplicateGuestWarning";
import { BIRTH_DATE_ERROR, parseBirthDate } from "../lib/date";
import BirthDateInput from "../components/BirthDateInput";
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
  const [duplicates, setDuplicates] = useState<DuplicateGuest[] | null>(null);

  // Editing a field the duplicate check compares on drops the warning and
  // brings back "Save guest", so the corrected details get checked again
  // instead of only being savable via "register anyway".
  useEffect(() => {
    setDuplicates(null);
  }, [displayName, birthDateInput, postcode, phone]);

  // Validates the form as it currently stands; sets the error and returns
  // null if something needs fixing.
  function buildPayload(): CreateGuestInput | null {
    if (!gender) {
      setError("Please select a gender.");
      return null;
    }

    const birthDate = birthDateInput ? parseBirthDate(birthDateInput) : undefined;
    if (birthDateInput && !birthDate) {
      setError(BIRTH_DATE_ERROR);
      return null;
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
      return null;
    }
    return parsed.data;
  }

  async function save(allowDuplicate: boolean) {
    setError(null);
    setDuplicates(null);
    const input = buildPayload();
    if (!input) return;

    try {
      const guest = await createGuest.mutateAsync({ input, allowDuplicate });
      navigate(`/guests/${guest.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && Array.isArray(err.body.duplicates)) {
        setDuplicates(err.body.duplicates as DuplicateGuest[]);
        return;
      }
      setError("Couldn't save this guest. Try again.");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    save(false);
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={() => navigate("/")}
          className={`inline-flex items-center gap-1.5 text-sm ${btn.ghost}`}
        >
          <ArrowLeftIcon /> Back
        </button>

        <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Register guest</h1>

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
                  <span className="block rounded-xl border-2 border-neutral-200 px-3 py-3 text-center text-sm font-medium text-neutral-700 transition peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700 hover:border-neutral-300">
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
              <BirthDateInput id="birthDate" value={birthDateInput} onChange={setBirthDateInput} />
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

          {duplicates && (
            <DuplicateGuestWarning
              duplicates={duplicates}
              onOpen={(id) => navigate(`/guests/${id}`, { replace: true })}
              onRegisterAnyway={() => save(true)}
              registering={createGuest.isPending}
            />
          )}

          <button
            type="submit"
            disabled={createGuest.isPending || !!duplicates}
            className={`${btn.primary} ${size.lg} w-full ${duplicates ? "hidden" : ""}`}
          >
            {createGuest.isPending ? "Saving…" : "Save guest"}
          </button>
        </form>
      </div>
    </main>
  );
}
