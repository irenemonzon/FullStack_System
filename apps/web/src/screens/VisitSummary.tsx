import { useNavigate, useParams } from "react-router-dom";
import { useVisit, useFinishVisit } from "../lib/queries/visits";
import { useGuest } from "../lib/queries/guests";
import AppHeader from "../components/AppHeader";
import VisitServicesBreakdown from "../components/VisitServicesBreakdown";
import { ArrowLeftIcon, CheckCircleIcon, Spinner } from "../components/icons";
import { btn, size } from "../lib/ui";

export default function VisitSummary() {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();

  const { data: visit, isLoading } = useVisit(visitId);
  const { data: guest } = useGuest(visit?.guestId);
  const finishVisit = useFinishVisit(visitId!);

  async function handleConfirm() {
    await finishVisit.mutateAsync({ status: "finished" });
    navigate("/", { replace: true });
  }

  if (isLoading || !visit) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-slate-400">
        <Spinner className="h-5 w-5" />
        <span className="text-sm">Loading visit…</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <AppHeader />

      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Visit summary for {guest?.displayName ?? "guest"}</h1>
        <p className="mt-1 text-slate-600">Confirm everything given before finishing this visit.</p>

        <VisitServicesBreakdown visit={visit} />

        {finishVisit.isError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {(finishVisit.error as Error).message}
          </p>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(`/visits/${visitId}/services`)}
            className={`inline-flex items-center gap-1.5 text-sm ${btn.ghost}`}
          >
            <ArrowLeftIcon /> Back to edit visit
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={finishVisit.isPending}
            className={`${btn.primary} ${size.md} inline-flex items-center gap-2`}
          >
            <CheckCircleIcon className="h-4 w-4" />
            {finishVisit.isPending ? "Finishing…" : "Confirm & finish"}
          </button>
        </div>
      </footer>
    </main>
  );
}
