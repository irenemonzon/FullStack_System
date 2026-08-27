import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { GuestSearchQuery } from "@support-hub/shared";
import { useGuestSearch } from "../lib/queries/guests";
import { parseDDMMYYToISO, formatRelativeTime } from "../lib/date";

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
    <main>
      <button type="button" onClick={() => navigate("/")}>
        Back
      </button>
      <h1>Find a returning guest</h1>
      <p>Search by anything the guest is happy to share. Any one field is enough.</p>

      <form onSubmit={handleSearch}>
        <label htmlFor="firstName">First name</label>
        <input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Maria" />

        <label htmlFor="birthDate">Birth date</label>
        <input
          id="birthDate"
          value={birthDateInput}
          onChange={(e) => setBirthDateInput(e.target.value)}
          placeholder="e.g. DD/MM/YY"
        />

        <label htmlFor="postcode">Postcode</label>
        <input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="e.g. 3021" />

        <label htmlFor="phone">Phone</label>
        <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="optional" />

        {error && <p role="alert">{error}</p>}

        <button type="submit">Search</button>
      </form>

      {query && (
        <section>
          <h2>Possible matches</h2>
          {isFetching && <p>Searching…</p>}
          {!isFetching && matches?.length === 0 && <p>No matches found.</p>}
          <ul>
            {matches?.map((guest) => (
              <li key={guest.id}>
                <span>{guest.displayName}</span>
                <span>
                  {[guest.birthDate, guest.postcode].filter(Boolean).join(" · ")}
                  {" · "}
                  {formatRelativeTime(guest.lastVisitAt)}
                </span>
                <button type="button" onClick={() => navigate("/", { state: { guest } })}>
                  Select
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button type="button" onClick={() => navigate("/guests/new")}>
        None of these — start a new guest
      </button>
    </main>
  );
}
