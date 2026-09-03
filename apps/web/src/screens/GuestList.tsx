import { useState } from "react";
import { useGuestSearch } from "../lib/queries/guests";
import { formatRelativeTime } from "../lib/date";
import AppHeader from "../components/AppHeader";
import LastVisitDetails from "../components/LastVisitDetails";
import { ChevronDownIcon, InboxIcon, Spinner } from "../components/icons";
import { btn } from "../lib/ui";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function GuestList() {
  const { data: guests, isFetching } = useGuestSearch({}, true);
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader showNav />

      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">All guests</h1>
        <p className="mt-1 text-slate-600">Most recently registered first, up to 50.</p>

        {isFetching && (
          <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
            <Spinner className="h-5 w-5" />
            <span className="text-sm">Loading…</span>
          </div>
        )}
        {!isFetching && guests?.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-2 text-center text-slate-400">
            <InboxIcon />
            <p className="text-sm text-slate-500">No guests registered yet.</p>
          </div>
        )}

        <ul className="mt-6 flex flex-col gap-3">
          {guests?.map((guest) => {
            const isExpanded = expandedGuestId === guest.id;
            return (
              <li
                key={guest.id}
                className="rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center gap-4 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                    {initials(guest.displayName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{guest.displayName}</p>
                    <p className="truncate text-sm text-slate-500">
                      {[guest.phone, guest.postcode, formatRelativeTime(guest.lastVisitAt)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {guest.lastVisitId && (
                    <button
                      type="button"
                      onClick={() => setExpandedGuestId(isExpanded ? null : guest.id)}
                      aria-expanded={isExpanded}
                      className={`inline-flex shrink-0 items-center gap-1 text-sm ${btn.ghost}`}
                    >
                      Last visit
                      <ChevronDownIcon className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
                {isExpanded && guest.lastVisitId && (
                  <div className="border-t border-slate-100 px-4 pb-2">
                    <LastVisitDetails visitId={guest.lastVisitId} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
