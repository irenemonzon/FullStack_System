import type { DuplicateGuest } from "../lib/queries/guests";
import { formatBirthDate } from "../lib/date";
import { AlertTriangleIcon } from "./icons";
import { btn, size } from "../lib/ui";

const MATCH_LABELS: Record<DuplicateGuest["matchedOn"][number], string> = {
  phone: "phone",
  name: "name",
  birthDate: "birth date",
  postcode: "postcode",
};

// Shown on Register guest when the API reports possible existing records,
// so the volunteer can reuse the existing profile instead of creating a
// second one — or confirm it's genuinely someone else.
export default function DuplicateGuestWarning({
  duplicates,
  onOpen,
  onRegisterAnyway,
  registering,
}: {
  duplicates: DuplicateGuest[];
  onOpen: (guestId: string) => void;
  onRegisterAnyway: () => void;
  registering: boolean;
}) {
  return (
    <section role="alert" className="rounded-2xl border-2 border-brand-500 bg-brand-50 p-5">
      <h2 className="flex items-center gap-2 font-semibold text-neutral-900">
        <AlertTriangleIcon className="h-5 w-5 text-brand-700" />
        This guest may already be registered
      </h2>
      <p className="mt-1 text-sm text-neutral-700">
        {duplicates.length === 1 ? "A guest" : `${duplicates.length} guests`} with the same details already{" "}
        {duplicates.length === 1 ? "exists" : "exist"}. If it's the same person, use the existing profile instead of
        creating a new one.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {duplicates.map((guest) => (
          <li
            key={guest.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-neutral-900">{guest.displayName}</p>
              <p className="text-sm text-neutral-500">
                {[guest.birthDate && formatBirthDate(guest.birthDate), guest.postcode, guest.phone]
                  .filter(Boolean)
                  .join(" · ") || "No other details"}
              </p>
              <p className="mt-1 text-xs font-medium text-brand-800">
                Matches: {guest.matchedOn.map((m) => MATCH_LABELS[m]).join(", ")}
              </p>
            </div>
            <button type="button" onClick={() => onOpen(guest.id)} className={`${btn.primary} ${size.sm}`}>
              Open existing profile
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onRegisterAnyway}
        disabled={registering}
        className={`${btn.secondary} ${size.md} mt-4 w-full`}
      >
        {registering ? "Saving…" : "Not the same person — register anyway"}
      </button>
    </section>
  );
}
