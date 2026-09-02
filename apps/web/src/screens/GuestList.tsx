import { useGuestSearch } from "../lib/queries/guests";
import { formatRelativeTime } from "../lib/date";
import { useSession } from "../lib/useSession";
import SignOutButton from "../components/SignOutButton";
import NavTabs from "../components/NavTabs";

export default function GuestList() {
  const { session } = useSession();
  const { data: guests, isFetching } = useGuestSearch({}, true);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between gap-6 border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-slate-900">300 Blankets · Support Hub</span>
          <NavTabs />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{session?.user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">All guests</h1>
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
                {[guest.phone, guest.postcode, formatRelativeTime(guest.lastVisitAt)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
