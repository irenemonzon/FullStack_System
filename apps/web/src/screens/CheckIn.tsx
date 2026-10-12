import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { UserPlusIcon, UsersIcon } from "../components/icons";

export default function CheckIn() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-neutral-50">
      <AppHeader showNav />

      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-neutral-900">Welcome a guest</h1>
        <p className="mt-2 text-neutral-600">How would you like to start this visit?</p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate("/guests/new")}
            className="flex flex-col items-center gap-3 rounded-2xl border-2 border-neutral-200 bg-white p-10 text-lg font-medium text-neutral-900 transition hover:border-brand-400 hover:bg-brand-50"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <UserPlusIcon />
            </span>
            New guest
          </button>
          <button
            type="button"
            onClick={() => navigate("/guests/find")}
            className="flex flex-col items-center gap-3 rounded-2xl border-2 border-neutral-200 bg-white p-10 text-lg font-medium text-neutral-900 transition hover:border-brand-400 hover:bg-brand-50"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <UsersIcon />
            </span>
            Returning guest
          </button>
        </div>
      </div>
    </main>
  );
}
