import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useCurrentUser } from "../lib/queries/users";

// Wraps RequireAuth for admin-only screens. RequireAuth already guarantees
// a session exists by the time this renders; this just adds the role check
// (server-side enforcement is the real gate — see requireRole("admin") on
// the /api/users routes — this only avoids showing the UI to non-admins).
export default function RequireAdmin({ children }: { children: ReactNode }) {
  // isPending (not isLoading) — useCurrentUser's query is briefly disabled
  // on first render because it depends on its own useSession() call, which
  // (unlike RequireAuth's, a separate instance with separate state) hasn't
  // resolved yet here. isLoading is false while a query is disabled, which
  // would read `me` as undefined and redirect before the request even
  // fires; isPending stays true until real data or an error arrives.
  const { data: me, isPending, isError } = useCurrentUser();

  if (isPending) return <p className="flex min-h-screen items-center justify-center text-slate-500">Loading…</p>;
  if (isError || me?.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}
