import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useCurrentUser } from "../lib/queries/users";
import { Spinner } from "./icons";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: me, isPending, isError } = useCurrentUser();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (isError || me?.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}
