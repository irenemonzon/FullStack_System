import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useSession } from "../lib/useSession";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();

  if (loading) return <p>Loading…</p>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
