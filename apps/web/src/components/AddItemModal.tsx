import { useState } from "react";
import type { InventoryItem } from "@support-hub/shared";
import type { CatalogueStation } from "../lib/queries/inventory";
import { useInventory } from "../lib/queries/inventory";
import { useCreateService } from "../lib/queries/services";

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
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add {STATION_LABEL[station]} item</h2>
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
            Close
          </button>
        </div>

        {isLoading && <p className="mt-4 text-slate-600">Loading items…</p>}

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
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                    selected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-medium text-slate-900">{itemLabel(item)}</span>
                  {item.quantityOnHand != null && (
                    <span className={`text-sm ${lowStock ? "font-semibold text-amber-600" : "text-slate-500"}`}>
                      In stock: {item.quantityOnHand}
                      {lowStock ? " · low stock" : ""}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {selectedItem && (
          <div className="mt-6 rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-900">{itemLabel(selectedItem)}</p>
            {selectedItem.quantityOnHand != null && (
              <p className={`mt-1 text-sm ${isLowStock ? "font-semibold text-amber-600" : "text-slate-500"}`}>
                In stock: {selectedItem.quantityOnHand}
                {isLowStock ? " · low stock" : ""}
              </p>
            )}

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-10 w-10 rounded-lg border border-slate-300 text-lg font-semibold text-slate-700 hover:bg-slate-50"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center text-lg font-semibold text-slate-900">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="h-10 w-10 rounded-lg border border-slate-300 text-lg font-semibold text-slate-700 hover:bg-slate-50"
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
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createService.isPending ? "Adding…" : "Add to visit"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
