import { useQuery } from "@tanstack/react-query";
import type { Category, InventoryItem, SupportCategory } from "@support-hub/shared";
import { apiClient } from "../apiClient";

export type CatalogueStation = "kitchen" | "material_aid";

export function useInventory(station: CatalogueStation) {
  return useQuery({
    queryKey: ["inventory", station],
    queryFn: () => apiClient.get<InventoryItem[]>(`/api/inventory?station=${station}`),
  });
}

export function useCategories(station: CatalogueStation) {
  return useQuery({
    queryKey: ["categories", station],
    queryFn: () => apiClient.get<Category[]>(`/api/categories?station=${station}`),
  });
}

export function useSupportCategories() {
  return useQuery({
    queryKey: ["support-categories"],
    queryFn: () => apiClient.get<SupportCategory[]>("/api/support-categories"),
  });
}
