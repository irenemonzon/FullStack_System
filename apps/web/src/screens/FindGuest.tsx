import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { GuestSearchQuery } from "@support-hub/shared";
import { useGuestSearch } from "../lib/queries/guests";
import { parseDDMMYYToISO, formatRelativeTime } from "../lib/date";
import LastVisitDetails from "../components/LastVisitDetails";
import { ArrowLeftIcon, ChevronDownIcon, InboxIcon, SearchIcon, Spinner } from "../components/icons";
import { btn, input, label, size } from "../lib/ui";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function FindGuest() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [birthDateInput, setBirthDateInput] = useState("");
  const [postcode, setPostcode] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState<GuestSearchQuery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);

  const { data: matches, isFetching } = useGuestSearch(query ?? {}, query !== null);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const birthDate = birthDateInput ? parseDDMMYYToISO(birthDateInput) : undefined;
    if (birthDateInput && !birthDate) {
      setError("Birth date should be DD/MM/YY or DD/MM/YYYY");
      return;
    }

    const next: GuestSearchQuery = {
      firstName: firstName || undefined,
      birthDate,
      postcode: postcode || undefined,
      phone: phone || undefined,
    };
    if (!next.firstName && !next.birthDate && !next.postcode && !next.phone) {
      setError("Enter at least one field to search");
      return;
    }
    setQuery(next);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={() => navigate("/")}
          className={`inline-flex items-center gap-1.5 text-sm ${btn.ghost}`}
        >
          <ArrowLeftIcon /> Back
        </button>

        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Find a returning guest</h1>
        <p className="mt-1 text-slate-600">Search by anything the guest is happy to share. Any one field is enough.</p>

        <form onSubmit={handleSearch} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={label}>
              First name
            </label>
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Maria"
              className={input}
            />
          </div>

          <div>
            <label htmlFor="birthDate" className={label}>
              Birth date
            </label>
            <input
              id="birthDate"
              value={birthDateInput}
              onChange={(e) => setBirthDateInput(e.target.value)}
              placeholder="e.g. DD/MM/YYYY"
              className={input}
            />
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
              placeholder="optional"
              className={input}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 sm:col-span-2">
              {error}
            </p>
          )}

          <button type="submit" className={`${btn.primary} ${size.lg} inline-flex items-center justify-center gap-2 sm:col-span-2`}>
            <SearchIcon className="h-4 w-4" /> Search
          </button>
        </form>

        {query && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Possible matches</h2>
            {isFetching && (
              <div className="mt-3 flex items-center gap-2 text-slate-400">
                <Spinner className="h-5 w-5" />
                <span className="text-sm">Searching…</span>
              </div>
            )}
            {!isFetching && matches?.length === 0 && (
              <div className="mt-4 flex flex-col items-center gap-2 py-4 text-center text-slate-400">
                <InboxIcon className="h-7 w-7" />
                <p className="text-sm text-slate-500">No matches found.</p>
              </div>
            )}
            <ul className="mt-3 flex flex-col gap-3">
              {matches?.map((guest) => {
                const isExpanded = expandedGuestId === guest.id;
                return (
                  <li key={guest.id} className="rounded-xl border border-slate-200 bg-white transition hover:border-slate-300">
                    <div className="flex items-center justify-between gap-4 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                          {initials(guest.displayName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{guest.displayName}</p>
                          <p className="truncate text-sm text-slate-500">
                            {[guest.birthDate, guest.postcode].filter(Boolean).join(" · ")}
                            {" · "}
                            {formatRelativeTime(guest.lastVisitAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {guest.lastVisitId && (
                          <button
                            type="button"
                            onClick={() => setExpandedGuestId(isExpanded ? null : guest.id)}
                            aria-expanded={isExpanded}
                            className={`inline-flex items-center gap-1 text-sm ${btn.ghost}`}
                          >
                            Last visit
                            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate("/", { state: { guest } })}
                          className={`${btn.secondary} ${size.sm}`}
                        >
                          Select
                        </button>
                      </div>
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
          </section>
        )}

        <button type="button" onClick={() => navigate("/guests/new")} className={`${btn.secondary} ${size.lg} mt-8 w-full`}>
          None of these — start a new guest
        </button>
      </div>
    </main>
  );
}
