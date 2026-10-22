import type { CreateGuestInput, Guest } from "@support-hub/shared";
import { BIRTH_DATE_ERROR, formatBirthDate, parseBirthDate } from "../lib/date";
import BirthDateInput from "./BirthDateInput";
import { btn, input, label, size } from "../lib/ui";

const GENDERS: Array<{ value: CreateGuestInput["gender"]; label: string }> = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

// Filled in by "No postcode" for guests who don't have one (e.g. no fixed
// address), since postcode is required.
const DEFAULT_POSTCODE = "3012";

// What the volunteer has typed, before validation: birth date is still
// DD/MM/YYYY text and empty fields are empty strings.
export type GuestFormValues = {
  displayName: string;
  gender: CreateGuestInput["gender"] | null;
  birthDateInput: string;
  postcode: string;
  phone: string;
  preferredLanguage: string;
  dietary: string;
  notes: string;
};

export const emptyGuestForm: GuestFormValues = {
  displayName: "",
  gender: null,
  birthDateInput: "",
  postcode: "",
  phone: "",
  preferredLanguage: "",
  dietary: "",
  notes: "",
};

export function guestToFormValues(guest: Guest): GuestFormValues {
  return {
    displayName: guest.displayName,
    gender: guest.gender,
    birthDateInput: guest.birthDate ? formatBirthDate(guest.birthDate) : "",
    postcode: guest.postcode ?? "",
    phone: guest.phone ?? "",
    preferredLanguage: guest.preferredLanguage ?? "",
    dietary: guest.dietary ?? "",
    notes: guest.notes ?? "",
  };
}

type GuestFormData = {
  displayName: string;
  gender: CreateGuestInput["gender"];
  birthDate: string | null;
  postcode: string | null;
  phone: string | null;
  preferredLanguage: string | null;
  dietary: string | null;
  notes: string | null;
};

// Checks what the shared Zod schemas can't (a gender was picked, a postcode
// was entered, the birth date is a real DD/MM/YYYY date) and returns the fields with empty ones as
// null; each screen then validates against its own schema.
export function readGuestForm(values: GuestFormValues): { data: GuestFormData } | { error: string } {
  if (!values.gender) return { error: "Please select a gender." };
  if (!values.postcode.trim()) return { error: `Please enter a postcode, or tap "No postcode" to use ${DEFAULT_POSTCODE}.` };

  const birthDate = values.birthDateInput ? parseBirthDate(values.birthDateInput) : null;
  if (birthDate === undefined) return { error: BIRTH_DATE_ERROR };

  return {
    data: {
      displayName: values.displayName,
      gender: values.gender,
      birthDate,
      postcode: values.postcode || null,
      phone: values.phone || null,
      preferredLanguage: values.preferredLanguage || null,
      dietary: values.dietary || null,
      notes: values.notes || null,
    },
  };
}

// The guest details fields shared by Register guest and Edit guest.
export default function GuestFormFields({
  values,
  onChange,
}: {
  values: GuestFormValues;
  onChange: (changes: Partial<GuestFormValues>) => void;
}) {
  return (
    <>
      <div>
        <label htmlFor="displayName" className={label}>
          Name <span className="text-red-600">*</span>
        </label>
        <input
          id="displayName"
          value={values.displayName}
          onChange={(e) => onChange({ displayName: e.target.value })}
          placeholder="What should we call them?"
          required
          className={input}
        />
      </div>

      <fieldset>
        <legend className={label}>
          Gender <span className="text-red-600">*</span>
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GENDERS.map((g) => (
            <label key={g.value} className="cursor-pointer">
              <input
                type="radio"
                name="gender"
                value={g.value}
                checked={values.gender === g.value}
                onChange={() => onChange({ gender: g.value })}
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
          <BirthDateInput
            id="birthDate"
            value={values.birthDateInput}
            onChange={(birthDateInput) => onChange({ birthDateInput })}
          />
        </div>

        <div>
          <label htmlFor="postcode" className={label}>
            Postcode <span className="text-red-600">*</span>
          </label>
          <div className="flex items-start gap-2">
            <input
              id="postcode"
              value={values.postcode}
              onChange={(e) => onChange({ postcode: e.target.value })}
              placeholder="e.g. 3021"
              required
              className={input}
            />
            <button
              type="button"
              onClick={() => onChange({ postcode: DEFAULT_POSTCODE })}
              className={`${btn.secondary} ${size.lg} mt-1 shrink-0 whitespace-nowrap`}
            >
              No postcode
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="phone" className={label}>
            Phone
          </label>
          <input
            id="phone"
            value={values.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
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
            value={values.preferredLanguage}
            onChange={(e) => onChange({ preferredLanguage: e.target.value })}
            placeholder="e.g. English"
            className={input}
          />
        </div>

        <div>
          <label htmlFor="dietary" className={label}>
            Dietary
          </label>
          <input
            id="dietary"
            value={values.dietary}
            onChange={(e) => onChange({ dietary: e.target.value })}
            className={input}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="notes" className={label}>
            Notes
          </label>
          <textarea
            id="notes"
            value={values.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={3}
            className={input}
          />
        </div>
      </div>
    </>
  );
}
