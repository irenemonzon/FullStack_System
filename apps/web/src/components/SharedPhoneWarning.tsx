import type { Guest } from "@support-hub/shared";
import { AlertTriangleIcon, XIcon } from "./icons";
import { btn, size } from "../lib/ui";

// Shown on the guest profile after an edit gave them a phone number other
// guests also have. The edit is already saved; this only lets the volunteer
// check whether it's the same person (or a shared/family phone).
export default function SharedPhoneWarning({
  guests,
  onOpen,
  onClose,
}: {
  guests: Guest[];
  onOpen: (guestId: string) => void;
  onClose: () => void;
}) {
  return (
    <section role="alert" className="mt-6 rounded-2xl border-2 border-brand-500 bg-brand-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-neutral-900">
            <AlertTriangleIcon className="h-5 w-5 text-brand-700" />
            This phone number is also used by
          </h2>
          <p className="mt-1 text-sm text-neutral-700">
            The changes are saved. If it's the same person, they may already have another profile.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-m-2 rounded-lg p-2 text-neutral-500 transition hover:bg-brand-100 hover:text-neutral-900"
        >
          <XIcon />
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {guests.map((guest) => (
          <li
            key={guest.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4"
          >
            <p className="min-w-0 font-medium text-neutral-900">{guest.displayName}</p>
            <button type="button" onClick={() => onOpen(guest.id)} className={`${btn.secondary} ${size.sm}`}>
              Open profile
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
