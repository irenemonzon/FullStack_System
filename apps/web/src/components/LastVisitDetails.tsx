import { useVisit } from "../lib/queries/visits";
import VisitServicesBreakdown from "./VisitServicesBreakdown";
import { Spinner } from "./icons";

// Read-only "what did they get last time" breakdown, shown inline when a
// guest search result is expanded.
export default function LastVisitDetails({ visitId }: { visitId: string }) {
  const { data: visit, isLoading } = useVisit(visitId);

  if (isLoading || !visit) {
    return (
      <div className="flex items-center gap-2 py-4 text-slate-400">
        <Spinner className="h-4 w-4" />
        <span className="text-sm">Loading last visit…</span>
      </div>
    );
  }

  return (
    <div className="[&>section:first-child]:mt-3 [&>section]:shadow-none [&>section]:p-4">
      <VisitServicesBreakdown visit={visit} />
    </div>
  );
}
