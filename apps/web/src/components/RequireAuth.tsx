import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useSession } from "../lib/useSession";
import { Spinner } from "./icons";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
