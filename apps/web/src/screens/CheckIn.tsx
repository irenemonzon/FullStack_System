import { useNavigate, useLocation } from "react-router-dom";
import type { Guest } from "@support-hub/shared";
import { useSession } from "../lib/useSession";
import SignOutButton from "../components/SignOutButton";

type LocationState = { guest?: Guest } | null;

// Screen 1 — Check-in / Home. Records who's served start here (New guest
// / Returning guest); Sprint 4/5 add the actual visit-logging screens
// that follow, so a selected/registered guest just shows a confirmation
// for now.
export default function CheckIn() {
  const { session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const guest = state?.guest;

  return (
    <main>
      <header>
        <span>300 Blankets · Support Hub</span>
        <span>{session?.user.email}</span>
        <SignOutButton />
      </header>

      {guest ? (
        <>
          <h1>Guest selected</h1>
          <p>
            {guest.displayName} is ready to start a visit. Recording services (Sprint 4/5) lands next in the
            build.
          </p>
          <button type="button" onClick={() => navigate("/", { replace: true })}>
            Back to check-in
          </button>
        </>
      ) : (
        <>
          <h1>Welcome a guest</h1>
          <p>How would you like to start this visit?</p>
          <button type="button" onClick={() => navigate("/guests/new")}>
            New guest
          </button>
          <button type="button" onClick={() => navigate("/guests/find")}>
            Returning guest
          </button>
          <p>No ID is ever required — we only capture what the guest is happy to share when registering.</p>
        </>
      )}
    </main>
  );
}
