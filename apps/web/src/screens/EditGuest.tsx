import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { updateGuestSchema, type Guest } from "@support-hub/shared";
import { useGuest, useUpdateGuest } from "../lib/queries/guests";
import GuestFormFields, { guestToFormValues, readGuestForm, type GuestFormValues } from "../components/GuestFormFields";
import { ArrowLeftIcon, Spinner } from "../components/icons";
import { btn, size } from "../lib/ui";

export default function EditGuest() {
  const { guestId } = useParams<{ guestId: string }>();
  const navigate = useNavigate();
  const { data: guest, isLoading, isError } = useGuest(guestId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-neutral-400">
        <Spinner className="h-5 w-5" />
        <span className="text-sm">Loading guest…</span>
      </div>
    );
  }

  if (isError || !guest) {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-12 text-center">
        <p className="text-neutral-600">This guest couldn't be found.</p>
        <button type="button" onClick={() => navigate("/")} className={`mt-4 text-sm ${btn.ghost}`}>
          Back to check-in
        </button>
      </main>
    );
  }

  return <EditGuestForm guest={guest} />;
}

// Split out so the form state starts from the loaded guest.
function EditGuestForm({ guest }: { guest: Guest }) {
  const navigate = useNavigate();
  const updateGuest = useUpdateGuest(guest.id);
  const [values, setValues] = useState<GuestFormValues>(() => guestToFormValues(guest));
  const [error, setError] = useState<string | null>(null);

  // The profile opens this screen in place of itself (replace), and saving or
  // cancelling replaces it back, so the profile keeps a single history entry.
  function backToProfile(state?: object) {
    navigate(`/guests/${guest.id}`, { replace: true, state });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const form = readGuestForm(values);
    if ("error" in form) {
      setError(form.error);
      return;
    }
    // Empty optional fields go as null, which clears them.
    const parsed = updateGuestSchema.safeParse(form.data);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }

    try {
      const updated = await updateGuest.mutateAsync(parsed.data);
      backToProfile({ phoneSharedWith: updated.phoneSharedWith });
    } catch {
      setError("Couldn't save these changes. Try again.");
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={() => backToProfile()}
          className={`inline-flex items-center gap-1.5 text-sm ${btn.ghost}`}
        >
          <ArrowLeftIcon /> Back
        </button>

        <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Edit guest details</h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          <GuestFormFields values={values} onChange={(changes) => setValues((v) => ({ ...v, ...changes }))} />

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button type="button" onClick={() => backToProfile()} className={`${btn.secondary} ${size.lg} sm:flex-1`}>
              Cancel
            </button>
            <button type="submit" disabled={updateGuest.isPending} className={`${btn.primary} ${size.lg} sm:flex-1`}>
              {updateGuest.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
