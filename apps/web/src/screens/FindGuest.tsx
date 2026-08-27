import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { GuestSearchQuery } from "@support-hub/shared";
import { useGuestSearch } from "../lib/queries/guests";
import { parseDDMMYYToISO, formatRelativeTime } from "../lib/date";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200";
const labelClass = "block text-sm font-medium text-slate-700";

// Screen 2 — Find a returning guest. Any one field is enough; results
// are ranked server-side (phone is the strongest signal when given).
export default function FindGuest() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [birthDateInput, setBirthDateInput] = useState("");
  const [postcode, setPostcode] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState<GuestSearchQuery | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: matches, isFetching } = useGuestSearch(query ?? {}, query !== null);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const birthDate = birthDateInput ? parseDDMMYYToISO(birthDateInput) : undefined;
    if (birthDateInput && !birthDate) {
      setError("Birth date should be DD/MM/YY");
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
        <button type="button" onClick={() => navigate("/")} className="text-sm text-purple-700 hover:underline">
          ← Back
        </button>

        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Find a returning guest</h1>
        <p className="mt-1 text-slate-600">Search by anything the guest is happy to share. Any one field is enough.</p>

        <form onSubmit={handleSearch} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={labelClass}>
              First name
            </label>
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Maria"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="birthDate" className={labelClass}>
              Birth date
            </label>
            <input
              id="birthDate"
              value={birthDateInput}
              onChange={(e) => setBirthDateInput(e.target.value)}
              placeholder="e.g. DD/MM/YY"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="postcode" className={labelClass}>
              Postcode
            </label>
            <input
              id="postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="e.g. 3021"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="optional"
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 sm:col-span-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="rounded-lg bg-purple-600 px-4 py-3 text-base font-medium text-white transition hover:bg-purple-700 sm:col-span-2"
          >
            Search
          </button>
        </form>

        {query && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Possible matches</h2>
            {isFetching && <p className="mt-2 text-slate-600">Searching…</p>}
            {!isFetching && matches?.length === 0 && <p className="mt-2 text-slate-600">No matches found.</p>}
            <ul className="mt-3 flex flex-col gap-3">
              {matches?.map((guest) => (
                <li
                  key={guest.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div>
                    <p className="font-medium text-slate-900">{guest.displayName}</p>
                    <p className="text-sm text-slate-500">
                      {[guest.birthDate, guest.postcode].filter(Boolean).join(" · ")}
                      {" · "}
                      {formatRelativeTime(guest.lastVisitAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/", { state: { guest } })}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Select
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button
          type="button"
          onClick={() => navigate("/guests/new")}
          className="mt-8 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
        >
          None of these — start a new guest
        </button>
      </div>
    </main>
  );
}
