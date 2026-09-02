import { useState } from "react";
import type { InventoryItem } from "@support-hub/shared";
import type { CatalogueStation } from "../lib/queries/inventory";
import { useInventory } from "../lib/queries/inventory";
import { useCreateService } from "../lib/queries/services";
import { AlertTriangleIcon, Spinner } from "./icons";
import { btn, pill, size } from "../lib/ui";

const STATION_LABEL: Record<CatalogueStation, string> = {
  kitchen: "Kitchen",
  material_aid: "Material aid",
};

function itemLabel(item: InventoryItem): string {
  const details = [item.size, item.genderFit].filter(Boolean).join(", ");
  return details ? `${item.name} (${details})` : item.name;
}

export default function AddItemModal({
  station,
  visitId,
  onClose,
}: {
  station: CatalogueStation;
  visitId: string;
  onClose: () => void;
}) {
  const { data: items, isLoading } = useInventory(station);
  const createService = useCreateService(visitId);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const selectedItem = items?.find((item) => item.id === selectedItemId) ?? null;
  const exceedsStock = selectedItem?.quantityOnHand != null && selectedItem.quantityOnHand < quantity;
  const isLowStock =
    selectedItem?.quantityOnHand != null &&
    selectedItem?.lowStockThreshold != null &&
    selectedItem.quantityOnHand <= selectedItem.lowStockThreshold;

  function selectItem(item: InventoryItem) {
    setSelectedItemId(item.id);
    setQuantity(1);
    createService.reset();
  }

  async function handleAdd() {
    if (!selectedItem) return;
    await createService.mutateAsync({ station, inventoryItemId: selectedItem.id, quantity });
    setSelectedItemId(null);
    setQuantity(1);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add {STATION_LABEL[station]} item</h2>
          <button type="button" onClick={onClose} className={`text-sm ${btn.ghost}`}>
            Close
          </button>
        </div>

        {isLoading && (
          <div className="mt-4 flex items-center gap-2 text-slate-400">
            <Spinner className="h-5 w-5" />
            <span className="text-sm">Loading items…</span>
          </div>
        )}

        <ul className="mt-4 flex flex-col gap-2">
          {items?.map((item) => {
            const lowStock =
              item.quantityOnHand != null && item.lowStockThreshold != null && item.quantityOnHand <= item.lowStockThreshold;
            const selected = item.id === selectedItemId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => selectItem(item)}
                  className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${
                    selected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="font-medium text-slate-900">{itemLabel(item)}</span>
                  {item.quantityOnHand != null && (
                    <span className={`${pill} ${lowStock ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                      {lowStock && <AlertTriangleIcon />}
                      In stock: {item.quantityOnHand}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {selectedItem && (
          <div className="mt-6 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-900">{itemLabel(selectedItem)}</p>
              {selectedItem.quantityOnHand != null && (
                <span className={`${pill} ${isLowStock ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                  {isLowStock && <AlertTriangleIcon />}
                  In stock: {selectedItem.quantityOnHand}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-10 w-10 rounded-xl border border-slate-300 text-lg font-semibold text-slate-700 transition hover:bg-slate-50"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center text-lg font-semibold text-slate-900">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="h-10 w-10 rounded-xl border border-slate-300 text-lg font-semibold text-slate-700 transition hover:bg-slate-50"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            {(exceedsStock || createService.isError) && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {exceedsStock
                  ? `Only ${selectedItem.quantityOnHand} left in stock`
                  : (createService.error as Error)?.message}
              </p>
            )}

            <button
              type="button"
              onClick={handleAdd}
              disabled={exceedsStock || createService.isPending}
              className={`${btn.primary} ${size.lg} mt-4 w-full`}
            >
              {createService.isPending ? "Adding…" : "Add to visit"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
