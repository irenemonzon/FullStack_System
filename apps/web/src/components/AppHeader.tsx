import type { ReactNode } from "react";
import { useSession } from "../lib/useSession";
import NavTabs from "./NavTabs";
import SignOutButton from "./SignOutButton";

export default function AppHeader({ showNav = false, right }: { showNav?: boolean; right?: ReactNode }) {
  const { session } = useSession();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-6 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            3B
          </span>
          <span className="font-semibold text-slate-900">Support Hub</span>
        </div>
        {showNav && <NavTabs />}
      </div>
      <div className="flex items-center gap-4">
        {right}
        <span className="hidden text-sm text-slate-600 sm:inline">{session?.user.email}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
