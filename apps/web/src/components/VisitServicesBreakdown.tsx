import { useMemo, type ReactNode } from "react";
import type { VisitWithServices } from "../lib/queries/visits";
import { useInventory, useSupportCategories, type CatalogueStation } from "../lib/queries/inventory";
import { card } from "../lib/ui";

export function SummarySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${card} mt-6 p-5`}>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// Kitchen / material aid / information breakdown for a visit, shared by the
// visit summary screen and the guest search "last visit" dropdown.
export default function VisitServicesBreakdown({ visit }: { visit: VisitWithServices }) {
  const { data: kitchenItems } = useInventory("kitchen");
  const { data: materialAidItems } = useInventory("material_aid");
  const { data: supportCategories } = useSupportCategories();

  function itemName(station: CatalogueStation, itemId: string): string {
    const items = station === "kitchen" ? kitchenItems : materialAidItems;
    return items?.find((i) => i.id === itemId)?.name ?? "Item";
  }

  function supportName(id: string): string {
    return supportCategories?.find((s) => s.id === id)?.name ?? "Support";
  }

  const kitchenServices = useMemo(() => visit.services.filter((s) => s.station === "kitchen"), [visit]);
  const materialAidServices = useMemo(() => visit.services.filter((s) => s.station === "material_aid"), [visit]);
  const informationServices = useMemo(() => visit.services.filter((s) => s.station === "information"), [visit]);

  return (
    <>
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
    </>
  );
}
