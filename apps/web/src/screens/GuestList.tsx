import { useNavigate } from "react-router-dom";
import { useGuestSearch } from "../lib/queries/guests";
import { formatRelativeTime } from "../lib/date";

// Not one of the Figma-defined volunteer screens — a small dev/admin
// convenience to browse everything registered so far, since Stage 1's
// UI otherwise only supports registering or searching for one guest at
// a time. Reuses GET /api/guests with no filters (see guests.ts).
export default function GuestList() {
  const navigate = useNavigate();
  const { data: guests, isFetching } = useGuestSearch({}, true);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <button type="button" onClick={() => navigate("/")} className="text-sm text-purple-700 hover:underline">
          ← Back
        </button>

        <h1 className="mt-4 text-2xl font-semibold text-slate-900">All guests</h1>
        <p className="mt-1 text-slate-600">Most recently registered first, up to 50.</p>

        {isFetching && <p className="mt-6 text-slate-600">Loading…</p>}
        {!isFetching && guests?.length === 0 && (
          <p className="mt-6 text-slate-600">No guests registered yet.</p>
        )}

        <ul className="mt-6 flex flex-col gap-3">
          {guests?.map((guest) => (
            <li key={guest.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-medium text-slate-900">{guest.displayName}</p>
              <p className="text-sm text-slate-500">
                {[guest.gender.replace("_", " "), guest.birthDate, guest.postcode, guest.phone]
                  .filter(Boolean)
                  .join(" · ")}
                {" · "}
                {formatRelativeTime(guest.lastVisitAt)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
