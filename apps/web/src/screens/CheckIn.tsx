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
    <main className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
        <span className="font-semibold text-slate-900">300 Blankets · Support Hub</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{session?.user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        {guest ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">Guest selected</h1>
            <p className="mt-2 text-slate-600">
              {guest.displayName} is ready to start a visit. Recording services (Sprint 4/5) lands next in the
              build.
            </p>
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="mt-6 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to check-in
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-semibold text-slate-900">Welcome a guest</h1>
            <p className="mt-2 text-slate-600">How would you like to start this visit?</p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => navigate("/guests/new")}
                className="rounded-xl border-2 border-slate-200 bg-white p-10 text-lg font-medium text-slate-900 transition hover:border-purple-400 hover:bg-purple-50"
              >
                New guest
              </button>
              <button
                type="button"
                onClick={() => navigate("/guests/find")}
                className="rounded-xl border-2 border-slate-200 bg-white p-10 text-lg font-medium text-slate-900 transition hover:border-purple-400 hover:bg-purple-50"
              >
                Returning guest
              </button>
            </div>

      
          </>
        )}
      </div>
    </main>
  );
}
