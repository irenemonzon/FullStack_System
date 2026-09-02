import { useState } from "react";
import { useSupportCategories } from "../lib/queries/inventory";
import { useCreateService } from "../lib/queries/services";

export default function InformationModal({ visitId, onClose }: { visitId: string; onClose: () => void }) {
  const { data: supports, isLoading } = useSupportCategories();
  const createService = useCreateService(visitId);

  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleAdd() {
    if (selected.length === 0) return;
    await createService.mutateAsync({
      station: "information",
      supportCategoryIds: selected,
      ...(notes ? { notes } : {}),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Information & signposting</h2>
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
            Close
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">Select every support that was signposted.</p>

        {isLoading && <p className="mt-4 text-slate-600">Loading supports…</p>}

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {supports?.map((support) => (
            <label
              key={support.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                selected.includes(support.id) ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(support.id)}
                onChange={() => toggle(support.id)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-slate-900">{support.name}</span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <label htmlFor="information-note" className="block text-sm font-medium text-slate-700">
            Note (optional)
          </label>
          <textarea
            id="information-note"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {createService.isError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {(createService.error as Error).message}
          </p>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={selected.length === 0 || createService.isPending}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createService.isPending ? "Adding…" : "Add to visit"}
        </button>
      </div>
    </div>
  );
}
