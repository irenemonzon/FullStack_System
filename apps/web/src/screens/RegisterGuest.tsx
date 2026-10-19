import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createGuestSchema, type CreateGuestInput } from "@support-hub/shared";
import { useCreateGuest, type DuplicateGuest } from "../lib/queries/guests";
import { ApiError } from "../lib/apiClient";
import DuplicateGuestWarning from "../components/DuplicateGuestWarning";
import GuestFormFields, { emptyGuestForm, readGuestForm, type GuestFormValues } from "../components/GuestFormFields";
import { ArrowLeftIcon } from "../components/icons";
import { btn, size } from "../lib/ui";

// The fields the API's duplicate check compares on.
const DUPLICATE_CHECK_FIELDS: Array<keyof GuestFormValues> = ["displayName", "birthDateInput", "postcode", "phone"];

export default function RegisterGuest() {
  const navigate = useNavigate();
  const createGuest = useCreateGuest();

  const [values, setValues] = useState<GuestFormValues>(emptyGuestForm);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateGuest[] | null>(null);

  function handleChange(changes: Partial<GuestFormValues>) {
    setValues((current) => ({ ...current, ...changes }));
    // Editing a field the duplicate check compares on drops the warning and
    // brings back "Save guest", so the corrected details get checked again
    // instead of only being savable via "register anyway".
    if (DUPLICATE_CHECK_FIELDS.some((field) => field in changes)) setDuplicates(null);
  }

  // Validates the form as it currently stands; sets the error and returns
  // null if something needs fixing.
  function buildPayload(): CreateGuestInput | null {
    const form = readGuestForm(values);
    if ("error" in form) {
      setError(form.error);
      return null;
    }

    // New guests simply leave out the optional fields that weren't filled in.
    const payload = Object.fromEntries(Object.entries(form.data).filter(([, value]) => value !== null));
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
          <GuestFormFields values={values} onChange={handleChange} />

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
