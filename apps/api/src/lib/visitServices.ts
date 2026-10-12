import { inArray } from "drizzle-orm";
import { schema, type Tx } from "./db.js";

const { services, serviceSupports } = schema;

// Loads the services logged on the given visits, keyed by visit id.
// Information rows get their linked supports attached as
// supportCategoryIds — service_supports isn't otherwise reachable from a
// plain services read, and the recap/history screens need the names.
export async function loadServicesByVisit(tx: Tx, visitIds: string[]) {
  const byVisit = new Map<string, Array<typeof services.$inferSelect & { supportCategoryIds: string[] }>>();
  if (visitIds.length === 0) return byVisit;

  const visitServices = await tx.select().from(services).where(inArray(services.visitId, visitIds));
  const informationServiceIds = visitServices.filter((s) => s.station === "information").map((s) => s.id);
  const supportLinks = informationServiceIds.length
    ? await tx.select().from(serviceSupports).where(inArray(serviceSupports.serviceId, informationServiceIds))
    : [];

  for (const service of visitServices) {
    const withSupports = {
      ...service,
      supportCategoryIds: supportLinks.filter((l) => l.serviceId === service.id).map((l) => l.supportCategoryId),
    };
    const list = byVisit.get(service.visitId) ?? [];
    list.push(withSupports);
    byVisit.set(service.visitId, list);
  }
  return byVisit;
}
