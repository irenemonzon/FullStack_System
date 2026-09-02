import { useMemo, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "../lib/useSession";
import { useVisit, useFinishVisit } from "../lib/queries/visits";
import { useGuest } from "../lib/queries/guests";
import { useInventory, useSupportCategories, type CatalogueStation } from "../lib/queries/inventory";
import SignOutButton from "../components/SignOutButton";

export default function VisitSummary() {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const { session } = useSession();

  const { data: visit, isLoading } = useVisit(visitId);
  const { data: guest } = useGuest(visit?.guestId);
  const { data: kitchenItems } = useInventory("kitchen");
  const { data: materialAidItems } = useInventory("material_aid");
  const { data: supportCategories } = useSupportCategories();
  const finishVisit = useFinishVisit(visitId!);

  function itemName(station: CatalogueStation, itemId: string): string {
    const items = station === "kitchen" ? kitchenItems : materialAidItems;
    return items?.find((i) => i.id === itemId)?.name ?? "Item";
  }

  function supportName(id: string): string {
    return supportCategories?.find((s) => s.id === id)?.name ?? "Support";
  }

  const kitchenServices = useMemo(() => visit?.services.filter((s) => s.station === "kitchen") ?? [], [visit]);
  const materialAidServices = useMemo(
    () => visit?.services.filter((s) => s.station === "material_aid") ?? [],
    [visit],
  );
  const informationServices = useMemo(
    () => visit?.services.filter((s) => s.station === "information") ?? [],
    [visit],
  );

  async function handleConfirm() {
    await finishVisit.mutateAsync({ status: "finished" });
    navigate("/", { replace: true });
  }

  if (isLoading || !visit) {
    return <p className="flex min-h-screen items-center justify-center text-slate-500">Loading visit…</p>;
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
        <span className="font-semibold text-slate-900">300 Blankets · Support Hub</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{session?.user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Visit summary for {guest?.displayName ?? "guest"}</h1>
        <p className="mt-1 text-slate-600">Confirm everything given before finishing this visit.</p>

        <SummarySection title="Kitchen">
          {kitchenServices.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing logged.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {kitchenServices.map((s) => (
                <li key={s.id} className="flex justify-between text-sm text-slate-700">
                  <span>{s.inventoryItemId ? itemName("kitchen", s.inventoryItemId) : "Item"}</span>
                  <span>× {s.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </SummarySection>

        <SummarySection title="Material aid">
          {materialAidServices.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing logged.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {materialAidServices.map((s) => (
                <li key={s.id} className="flex justify-between text-sm text-slate-700">
                  <span>{s.inventoryItemId ? itemName("material_aid", s.inventoryItemId) : "Item"}</span>
                  <span>× {s.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </SummarySection>

        <SummarySection title="Information">
          {informationServices.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing signposted.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {informationServices.map((s) => (
                <li key={s.id} className="text-sm text-slate-700">
                  <p className="font-medium">{(s.supportCategoryIds ?? []).map(supportName).join(", ")}</p>
                  {s.details?.notes && <p className="text-slate-500">{s.details.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </SummarySection>

        {finishVisit.isError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {(finishVisit.error as Error).message}
          </p>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex w-full max-w-2xl justify-end">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={finishVisit.isPending}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-base font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {finishVisit.isPending ? "Finishing…" : "Confirm & finish"}
          </button>
        </div>
      </footer>
    </main>
  );
}

function SummarySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
