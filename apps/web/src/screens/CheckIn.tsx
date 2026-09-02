import { useNavigate, useLocation } from "react-router-dom";
import type { Guest } from "@support-hub/shared";
import { useCreateVisit } from "../lib/queries/visits";
import AppHeader from "../components/AppHeader";
import { UserPlusIcon, UsersIcon } from "../components/icons";
import { btn, card, size } from "../lib/ui";

type LocationState = { guest?: Guest } | null;

export default function CheckIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const guest = state?.guest;
  const createVisit = useCreateVisit();

  async function handleStartVisit() {
    if (!guest) return;
    const visit = await createVisit.mutateAsync({ guestId: guest.id });
    navigate(`/visits/${visit.id}/services`);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader showNav />

      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        {guest ? (
          <div className={`${card} p-8 text-center`}>
            <h1 className="text-2xl font-semibold text-slate-900">Guest selected</h1>
            <p className="mt-2 text-slate-600">{guest.displayName} is ready to start a visit.</p>
            {createVisit.isError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {(createVisit.error as Error).message}
              </p>
            )}
            <button
              type="button"
              onClick={handleStartVisit}
              disabled={createVisit.isPending}
              className={`${btn.primary} ${size.lg} mt-6 w-full`}
            >
              {createVisit.isPending ? "Starting…" : "Start visit"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className={`mt-3 text-sm ${btn.ghost}`}
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
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-10 text-lg font-medium text-slate-900 transition hover:border-indigo-400 hover:bg-indigo-50"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <UserPlusIcon />
                </span>
                New guest
              </button>
              <button
                type="button"
                onClick={() => navigate("/guests/find")}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-10 text-lg font-medium text-slate-900 transition hover:border-indigo-400 hover:bg-indigo-50"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <UsersIcon />
                </span>
                Returning guest
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
