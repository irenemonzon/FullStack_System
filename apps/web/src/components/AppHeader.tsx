import type { ReactNode } from "react";
import { useSession } from "../lib/useSession";
import NavTabs from "./NavTabs";
import SignOutButton from "./SignOutButton";

export default function AppHeader({ showNav = false, right }: { showNav?: boolean; right?: ReactNode }) {
  const { session } = useSession();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-6 border-b-2 border-brand-500 bg-white/90 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="300 Blankets" className="h-10 w-auto" />
          <span className="border-l-2 border-brand-500 pl-3 font-semibold text-neutral-900">Support Hub</span>
        </div>
        {showNav && <NavTabs />}
      </div>
      <div className="flex items-center gap-4">
        {right}
        <span className="hidden text-sm text-neutral-600 sm:inline">{session?.user.email}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
