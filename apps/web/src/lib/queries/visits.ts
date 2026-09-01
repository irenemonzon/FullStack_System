import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateVisitInput, Service, UpdateVisitInput, Visit } from "@support-hub/shared";
import { apiClient } from "../apiClient";

export type VisitWithServices = Visit & { services: Service[] };

export function useCreateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVisitInput) => apiClient.post<Visit>("/api/visits", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visits"] }),
  });
}

export function useVisit(id: string | undefined) {
  return useQuery({
    queryKey: ["visits", id],
    queryFn: () => apiClient.get<VisitWithServices>(`/api/visits/${id}`),
    enabled: !!id,
  });
}

export function useFinishVisit(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateVisitInput) => apiClient.patch<Visit>(`/api/visits/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visits", id] }),
  });
}
