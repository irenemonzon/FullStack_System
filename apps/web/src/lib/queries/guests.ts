import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateGuestInput, Guest, GuestSearchQuery, UpdateGuestInput } from "@support-hub/shared";
import { apiClient } from "../apiClient";

export type GuestMatch = Guest & { lastVisitAt: string | null; score: number };

function toQueryString(query: GuestSearchQuery): string {
  const params = new URLSearchParams();
  if (query.firstName) params.set("firstName", query.firstName);
  if (query.birthDate) params.set("birthDate", query.birthDate);
  if (query.postcode) params.set("postcode", query.postcode);
  if (query.phone) params.set("phone", query.phone);
  return params.toString();
}

export function useGuestSearch(query: GuestSearchQuery, enabled: boolean) {
  return useQuery({
    queryKey: ["guests", "search", query],
    queryFn: () => apiClient.get<GuestMatch[]>(`/api/guests?${toQueryString(query)}`),
    enabled,
  });
}

export function useCreateGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGuestInput) => apiClient.post<Guest>("/api/guests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
  });
}

export function useGuest(id: string | undefined) {
  return useQuery({
    queryKey: ["guests", id],
    queryFn: () => apiClient.get<Guest>(`/api/guests/${id}`),
    enabled: !!id,
  });
}

export function useUpdateGuest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGuestInput) => apiClient.patch<Guest>(`/api/guests/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guests", id] }),
  });
}

export function useGuestVisits(id: string | undefined) {
  return useQuery({
    queryKey: ["guests", id, "visits"],
    queryFn: () => apiClient.get(`/api/guests/${id}/visits`),
    enabled: !!id,
  });
}
