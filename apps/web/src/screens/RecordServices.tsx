import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Service } from "@support-hub/shared";
import { useSession } from "../lib/useSession";
import { useVisit } from "../lib/queries/visits";
import { useGuest } from "../lib/queries/guests";
import { useInventory, useSupportCategories, type CatalogueStation } from "../lib/queries/inventory";
import { useDeleteService } from "../lib/queries/services";
import SignOutButton from "../components/SignOutButton";
import AddItemModal from "../components/AddItemModal";
import InformationModal from "../components/InformationModal";

type ItemTotal = { itemId: string; quantity: number; serviceIds: string[] };

function groupByItem(services: Service[], station: CatalogueStation): ItemTotal[] {
  const byItem = new Map<string, ItemTotal>();
  for (const service of services) {
    if (service.station !== station || !service.inventoryItemId || service.quantity == null) continue;
    const existing = byItem.get(service.inventoryItemId);
    if (existing) {
      existing.quantity += service.quantity;
      existing.serviceIds.push(service.id);
    } else {
      byItem.set(service.inventoryItemId, {
        itemId: service.inventoryItemId,
        quantity: service.quantity,
        serviceIds: [service.id],
      });
    }
  }
  return [...byItem.values()];
}

export default function RecordServices() {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const { session } = useSession();

  const { data: visit, isLoading: visitLoading } = useVisit(visitId);
  const { data: guest } = useGuest(visit?.guestId);
  const { data: kitchenItems } = useInventory("kitchen");
  const { data: materialAidItems } = useInventory("material_aid");
  const { data: supportCategories } = useSupportCategories();
  const deleteService = useDeleteService(visitId!);

  const [modal, setModal] = useState<CatalogueStation | "information" | null>(null);

  const kitchenTotals = useMemo(
    () => (visit ? groupByItem(visit.services, "kitchen") : []),
    [visit],
  );
  const materialAidTotals = useMemo(
    () => (visit ? groupByItem(visit.services, "material_aid") : []),
    [visit],
  );
  const informationServices = useMemo(
    () => visit?.services.filter((s) => s.station === "information") ?? [],
    [visit],
  );

  function itemName(station: CatalogueStation, itemId: string): string {
    const items = station === "kitchen" ? kitchenItems : materialAidItems;
    return items?.find((i) => i.id === itemId)?.name ?? "Item";
  }

  function supportName(id: string): string {
    return supportCategories?.find((s) => s.id === id)?.name ?? "Support";
  }

  const kitchenCount = kitchenTotals.reduce((sum, t) => sum + t.quantity, 0);
  const materialAidCount = materialAidTotals.reduce((sum, t) => sum + t.quantity, 0);
  const informationCount = informationServices.length;

  if (visitLoading || !visit) {
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
        <h1 className="text-2xl font-semibold text-slate-900">Recording visit for {guest?.displayName ?? "guest"}</h1>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Kitchen</h2>
            <button
              type="button"
              onClick={() => setModal("kitchen")}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Add item
            </button>
          </div>
          <StationItemList
            totals={kitchenTotals}
            resolveName={(id) => itemName("kitchen", id)}
            onRemoveOne={(serviceId) => deleteService.mutate(serviceId)}
          />
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Material aid</h2>
            <button
              type="button"
              onClick={() => setModal("material_aid")}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Add item
            </button>
          </div>
          <StationItemList
            totals={materialAidTotals}
            resolveName={(id) => itemName("material_aid", id)}
            onRemoveOne={(serviceId) => deleteService.mutate(serviceId)}
          />
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Information</h2>
            <button
              type="button"
              onClick={() => setModal("information")}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Add information
            </button>
          </div>
          {informationServices.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nothing signposted yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {informationServices.map((service) => (
                <li key={service.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {(service.supportCategoryIds ?? []).map(supportName).join(", ") || "Signposted"}
                    </p>
                    {service.details?.notes && <p className="text-sm text-slate-500">{service.details.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteService.mutate(service.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4">
          <div className="flex gap-6 text-sm text-slate-600">
            <span>Kitchen: {kitchenCount}</span>
            <span>Material aid: {materialAidCount}</span>
            <span>Information: {informationCount}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/visits/${visitId}/summary`)}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-base font-medium text-white transition hover:bg-blue-700"
          >
            Finish visit
          </button>
        </div>
      </footer>

      {modal === "kitchen" && <AddItemModal station="kitchen" visitId={visitId!} onClose={() => setModal(null)} />}
      {modal === "material_aid" && (
        <AddItemModal station="material_aid" visitId={visitId!} onClose={() => setModal(null)} />
      )}
      {modal === "information" && <InformationModal visitId={visitId!} onClose={() => setModal(null)} />}
    </main>
  );
}

function StationItemList({
  totals,
  resolveName,
  onRemoveOne,
}: {
  totals: ItemTotal[];
  resolveName: (itemId: string) => string;
  onRemoveOne: (serviceId: string) => void;
}) {
  if (totals.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">Nothing logged yet.</p>;
  }
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {totals.map((total) => (
        <li key={total.itemId} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2">
          <span className="text-sm font-medium text-slate-900">{resolveName(total.itemId)}</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">× {total.quantity}</span>
            <button
              type="button"
              onClick={() => onRemoveOne(total.serviceIds[total.serviceIds.length - 1])}
              aria-label={`Remove one ${resolveName(total.itemId)}`}
              className="h-8 w-8 rounded-lg border border-slate-300 text-base font-semibold text-slate-700 hover:bg-slate-50"
            >
              −
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
