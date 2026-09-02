import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Service } from "@support-hub/shared";
import { useVisit } from "../lib/queries/visits";
import { useGuest } from "../lib/queries/guests";
import { useInventory, useSupportCategories, type CatalogueStation } from "../lib/queries/inventory";
import { useDeleteService } from "../lib/queries/services";
import AppHeader from "../components/AppHeader";
import AddItemModal from "../components/AddItemModal";
import InformationModal from "../components/InformationModal";
import { BoxIcon, InfoIcon, Spinner, UtensilsIcon } from "../components/icons";
import { btn, card, pill, size } from "../lib/ui";

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
        <h1 className="text-2xl font-semibold text-slate-900">Recording visit for {guest?.displayName ?? "guest"}</h1>

        <section className={`${card} mt-6 p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <UtensilsIcon className="h-5 w-5 text-indigo-600" /> Kitchen
            </h2>
            <button type="button" onClick={() => setModal("kitchen")} className={`${btn.secondary} ${size.sm}`}>
              Add item
            </button>
          </div>
          <StationItemList
            totals={kitchenTotals}
            resolveName={(id) => itemName("kitchen", id)}
            onRemoveOne={(serviceId) => deleteService.mutate(serviceId)}
          />
        </section>

        <section className={`${card} mt-4 p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <BoxIcon className="h-5 w-5 text-indigo-600" /> Material aid
            </h2>
            <button type="button" onClick={() => setModal("material_aid")} className={`${btn.secondary} ${size.sm}`}>
              Add item
            </button>
          </div>
          <StationItemList
            totals={materialAidTotals}
            resolveName={(id) => itemName("material_aid", id)}
            onRemoveOne={(serviceId) => deleteService.mutate(serviceId)}
          />
        </section>

        <section className={`${card} mt-4 p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <InfoIcon className="h-5 w-5 text-indigo-600" /> Information
            </h2>
            <button type="button" onClick={() => setModal("information")} className={`${btn.secondary} ${size.sm}`}>
              Add information
            </button>
          </div>
          {informationServices.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nothing signposted yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {informationServices.map((service) => (
                <li key={service.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {(service.supportCategoryIds ?? []).map(supportName).join(", ") || "Signposted"}
                    </p>
                    {service.details?.notes && <p className="text-sm text-slate-500">{service.details.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteService.mutate(service.id)}
                    className="text-sm font-medium text-red-600 transition hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4">
          <div className="flex gap-2">
            <span className={`${pill} bg-slate-100 text-slate-700`}>Kitchen: {kitchenCount}</span>
            <span className={`${pill} bg-slate-100 text-slate-700`}>Material aid: {materialAidCount}</span>
            <span className={`${pill} bg-slate-100 text-slate-700`}>Information: {informationCount}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/visits/${visitId}/summary`)}
            className={`${btn.primary} ${size.md}`}
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
        <li key={total.itemId} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2">
          <span className="text-sm font-medium text-slate-900">{resolveName(total.itemId)}</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">× {total.quantity}</span>
            <button
              type="button"
              onClick={() => onRemoveOne(total.serviceIds[total.serviceIds.length - 1])}
              aria-label={`Remove one ${resolveName(total.itemId)}`}
              className="h-8 w-8 rounded-lg border border-slate-300 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              −
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
