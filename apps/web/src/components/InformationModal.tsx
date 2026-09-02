import { useState } from "react";
import { useSupportCategories } from "../lib/queries/inventory";
import { useCreateService } from "../lib/queries/services";
import { Spinner } from "./icons";
import { btn, input, label, size } from "../lib/ui";

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
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Information & signposting</h2>
          <button type="button" onClick={onClose} className={`text-sm ${btn.ghost}`}>
            Close
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">Select every support that was signposted.</p>

        {isLoading && (
          <div className="mt-4 flex items-center gap-2 text-slate-400">
            <Spinner className="h-5 w-5" />
            <span className="text-sm">Loading supports…</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {supports?.map((support) => (
            <label
              key={support.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition ${
                selected.includes(support.id) ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(support.id)}
                onChange={() => toggle(support.id)}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm font-medium text-slate-900">{support.name}</span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <label htmlFor="information-note" className={label}>
            Note (optional)
          </label>
          <textarea
            id="information-note"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={input}
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
          className={`${btn.primary} ${size.lg} mt-4 w-full`}
        >
          {createService.isPending ? "Adding…" : "Add to visit"}
        </button>
      </div>
    </div>
  );
}
