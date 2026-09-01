import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateServiceInput, Service } from "@support-hub/shared";
import { apiClient } from "../apiClient";

// Both mutations invalidate the visit (its `services` list changed) and
// the inventory (kitchen/material_aid quantity_on_hand may have changed).
function useInvalidateAfterServiceChange(visitId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["visits", visitId] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };
}

export function useCreateService(visitId: string) {
  const invalidate = useInvalidateAfterServiceChange(visitId);
  return useMutation({
    mutationFn: (input: CreateServiceInput) => apiClient.post<Service>(`/api/visits/${visitId}/services`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteService(visitId: string) {
  const invalidate = useInvalidateAfterServiceChange(visitId);
  return useMutation({
    mutationFn: (serviceId: string) => apiClient.delete(`/api/services/${serviceId}`),
    onSuccess: invalidate,
  });
}
