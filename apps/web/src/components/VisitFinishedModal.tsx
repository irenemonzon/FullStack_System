import { useEffect, useRef } from "react";
import { CheckCircleIcon } from "./icons";
import { btn, size } from "../lib/ui";

// Shown once a visit has been confirmed as finished, so the volunteer gets
// an explicit "it's saved" before the screen moves on.
export default function VisitFinishedModal({
  guestName,
  onDone,
  onViewProfile,
}: {
  guestName: string | undefined;
  onDone: () => void;
  onViewProfile?: () => void;
}) {
  const doneRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    doneRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDone();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-neutral-900/40 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="visit-finished-title"
        className="w-full max-w-sm rounded-t-2xl bg-white p-8 text-center shadow-xl sm:rounded-2xl"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <CheckCircleIcon className="h-8 w-8" />
        </span>
        <h2 id="visit-finished-title" className="mt-4 text-xl font-semibold text-neutral-900">
          Visit finished
        </h2>
        <p className="mt-2 text-neutral-600">
          {guestName ? `${guestName}'s` : "The guest's"} visit was finalised successfully and everything given has been
          saved.
        </p>

        <button ref={doneRef} type="button" onClick={onDone} className={`${btn.primary} ${size.lg} mt-6 w-full`}>
          Back to check-in
        </button>
        {onViewProfile && (
          <button type="button" onClick={onViewProfile} className={`mt-3 text-sm ${btn.ghost}`}>
            View guest profile
          </button>
        )}
      </div>
    </div>
  );
}
