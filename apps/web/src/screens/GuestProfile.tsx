import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { Guest } from "@support-hub/shared";
import { useGuest, useGuestHistory } from "../lib/queries/guests";
import { useCreateVisit, type VisitWithServices } from "../lib/queries/visits";
import { useInventory, useSupportCategories, type CatalogueStation } from "../lib/queries/inventory";
import AppHeader from "../components/AppHeader";
import VisitServicesBreakdown from "../components/VisitServicesBreakdown";
import SharedPhoneWarning from "../components/SharedPhoneWarning";
import { formatBirthDate } from "../lib/date";
import { ArrowLeftIcon, ChevronDownIcon, InboxIcon, Spinner } from "../components/icons";
import { btn, card, pill, size } from "../lib/ui";

const GENDER_LABELS: Record<Guest["gender"], string> = {
  woman: "Woman",
  man: "Man",
  non_binary: "Non-binary",
  prefer_not_to_say: "Gender not given",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export default function GuestProfile() {
  const { guestId } = useParams<{ guestId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // Set by Edit guest when the saved phone number is shared with others.
  const phoneSharedWith = (location.state as { phoneSharedWith?: Guest[] } | null)?.phoneSharedWith ?? [];
  const { data: guest, isLoading: guestLoading, isError: guestError } = useGuest(guestId);
  const history = useGuestHistory(guestId);
  const createVisit = useCreateVisit();
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

  const { data: kitchenItems } = useInventory("kitchen");
  const { data: materialAidItems } = useInventory("material_aid");
  const { data: supportCategories } = useSupportCategories();

  const pages = history.data?.pages ?? [];
  const totals = pages[0]?.totals;
  const visits = pages.flatMap((p) => p.visits);
  // A visit left open earlier today is resumed rather than duplicated;
  // older open visits were simply never finished and count as history.
  const currentVisit = visits[0] && visits[0].status === "open" && isToday(visits[0].visitedAt) ? visits[0] : null;

  async function handleStartVisit() {
    if (!guestId) return;
    const visit = await createVisit.mutateAsync({ guestId });
    navigate(`/visits/${visit.id}/services`);
  }

  function itemName(station: CatalogueStation, itemId: string): string {
    const items = station === "kitchen" ? kitchenItems : materialAidItems;
    return items?.find((i) => i.id === itemId)?.name ?? "Item";
  }

  function supportName(id: string): string {
    return supportCategories?.find((s) => s.id === id)?.name ?? "Support";
  }

  // One-line "what did they get" for a collapsed history row.
  function describeVisit(visit: VisitWithServices): string {
    const itemCounts = new Map<string, number>();
    const supports: string[] = [];
    for (const service of visit.services) {
      if (service.station === "information") {
        supports.push(...(service.supportCategoryIds ?? []).map(supportName));
      } else if (service.inventoryItemId) {
        const name = itemName(service.station, service.inventoryItemId);
        itemCounts.set(name, (itemCounts.get(name) ?? 0) + (service.quantity ?? 0));
      }
    }
    const parts = [...itemCounts].map(([name, qty]) => `${qty}× ${name}`);
    if (supports.length) parts.push(`${[...new Set(supports)].join(", ")} info`);
    return parts.join(", ") || "Nothing logged";
  }

  if (guestLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-neutral-400">
        <Spinner className="h-5 w-5" />
        <span className="text-sm">Loading guest…</span>
      </div>
    );
  }

  if (guestError || !guest) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <AppHeader showNav />
        <div className="mx-auto w-full max-w-2xl px-6 py-12 text-center">
          <p className="text-neutral-600">This guest couldn't be found.</p>
          <button type="button" onClick={() => navigate("/")} className={`mt-4 text-sm ${btn.ghost}`}>
            Back to check-in
          </button>
        </div>
      </main>
    );
  }

  const details = [
    GENDER_LABELS[guest.gender],
    guest.birthDate && formatBirthDate(guest.birthDate),
    guest.postcode,
    guest.phone,
    guest.preferredLanguage,
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-neutral-50">
      <AppHeader showNav />

      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-1.5 text-sm ${btn.ghost}`}
        >
          <ArrowLeftIcon /> Back
        </button>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-neutral-900">{guest.displayName}</h1>
            <p className="mt-1 text-sm text-neutral-600">{details.join(" · ")}</p>
            <button
              type="button"
              // Replaces the profile's history entry; Edit guest replaces it back.
              onClick={() => navigate(`/guests/${guest.id}/edit`, { replace: true })}
              className={`mt-2 text-sm ${btn.ghost}`}
            >
              Edit details
            </button>
          </div>
          {currentVisit ? (
            <button
              type="button"
              onClick={() => navigate(`/visits/${currentVisit.id}/services`)}
              className={`${btn.primary} ${size.lg} shrink-0`}
            >
              Continue current visit
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartVisit}
              disabled={createVisit.isPending || history.isLoading}
              className={`${btn.primary} ${size.lg} shrink-0`}
            >
              {createVisit.isPending ? "Starting…" : "Start visit"}
            </button>
          )}
        </div>
        {createVisit.isError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {(createVisit.error as Error).message}
          </p>
        )}

        {phoneSharedWith.length > 0 && (
          <SharedPhoneWarning
            guests={phoneSharedWith}
            onOpen={(id) => navigate(`/guests/${id}`)}
            // Clearing the history state keeps it closed on refresh or Back.
            onClose={() => navigate(location.pathname, { replace: true, state: null })}
          />
        )}

        {(guest.dietary || guest.notes) && (
          <section className="mt-6 rounded-2xl border-l-4 border-brand-500 bg-brand-50 p-4 text-sm text-neutral-800">
            {guest.dietary && (
              <p>
                <span className="font-semibold">Dietary:</span> {guest.dietary}
              </p>
            )}
            {guest.notes && (
              <p className={guest.dietary ? "mt-1" : ""}>
                <span className="font-semibold">Notes:</span> {guest.notes}
              </p>
            )}
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-900">Help received</h2>

          {history.isLoading && (
            <div className="mt-4 flex items-center gap-2 text-neutral-400">
              <Spinner className="h-5 w-5" />
              <span className="text-sm">Loading history…</span>
            </div>
          )}
          {history.isError && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              Couldn't load this guest's history. Try again.
            </p>
          )}

          {totals && totals.visits === 0 && (
            <div className={`${card} mt-4 flex flex-col items-center gap-2 p-8 text-center text-neutral-400`}>
              <InboxIcon className="h-7 w-7" />
              <p className="text-sm text-neutral-500">No visits yet — this will be their first.</p>
            </div>
          )}

          {totals && totals.visits > 0 && (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`${pill} bg-neutral-900 text-white`}>
                  {totals.visits} {totals.visits === 1 ? "visit" : "visits"}
                </span>
                <span className={`${pill} bg-brand-100 text-brand-800`}>Kitchen: {totals.kitchen}</span>
                <span className={`${pill} bg-brand-100 text-brand-800`}>Material aid: {totals.materialAid}</span>
                <span className={`${pill} bg-brand-100 text-brand-800`}>Information: {totals.information}</span>
                {totals.firstVisitAt && (
                  <span className="text-xs text-neutral-500">First visit {formatDate(totals.firstVisitAt)}</span>
                )}
              </div>

              <ul className="mt-4 flex flex-col gap-3">
                {visits.map((visit) => {
                  const isExpanded = expandedVisitId === visit.id;
                  const isCurrent = visit.id === currentVisit?.id;
                  return (
                    <li key={visit.id} className="rounded-xl border border-neutral-200 bg-white">
                      <button
                        type="button"
                        onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                        aria-expanded={isExpanded}
                        className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-neutral-50"
                      >
                        <span className="w-24 shrink-0 text-sm font-medium text-neutral-900">
                          {formatDate(visit.visitedAt)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-neutral-600">{describeVisit(visit)}</span>
                        {isCurrent && <span className={`${pill} bg-brand-500 text-neutral-950`}>In progress</span>}
                        <ChevronDownIcon
                          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>
                      {isExpanded && (
                        <div className="border-t border-neutral-100 px-4 pb-2 [&>section:first-child]:mt-3 [&>section]:p-4 [&>section]:shadow-none">
                          <VisitServicesBreakdown visit={visit} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {history.hasNextPage && (
                <button
                  type="button"
                  onClick={() => history.fetchNextPage()}
                  disabled={history.isFetchingNextPage}
                  className={`${btn.secondary} ${size.md} mt-4 w-full`}
                >
                  {history.isFetchingNextPage ? "Loading…" : "Show more"}
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
