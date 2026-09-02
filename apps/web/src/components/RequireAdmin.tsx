import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useCurrentUser } from "../lib/queries/users";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: me, isPending, isError } = useCurrentUser();

  if (isPending) return <p className="flex min-h-screen items-center justify-center text-slate-500">Loading…</p>;
  if (isError || me?.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}
