import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateGuestInput, Guest, GuestSearchQuery, UpdateGuestInput } from "@support-hub/shared";
import { apiClient } from "../apiClient";
import type { VisitWithServices } from "./visits";

// A possible existing record returned (409) when registering a guest.
export type DuplicateGuest = Guest & { matchedOn: Array<"phone" | "name" | "birthDate" | "postcode"> };

export type GuestMatch = Guest & { lastVisitAt: string | null; lastVisitId: string | null; score: number };

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
    mutationFn: ({ input, allowDuplicate = false }: { input: CreateGuestInput; allowDuplicate?: boolean }) =>
      apiClient.post<Guest>(`/api/guests${allowDuplicate ? "?allowDuplicate=true" : ""}`, input),
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

export type GuestHistoryTotals = {
  visits: number;
  firstVisitAt: string | null;
  kitchen: number;
  materialAid: number;
  information: number;
};

type GuestHistoryPage = { totals: GuestHistoryTotals; visits: VisitWithServices[]; hasMore: boolean };

const HISTORY_PAGE_SIZE = 5;

// Paged visit history for the guest profile: each page carries the same
// lifetime totals, so callers can read them off whichever page is first.
export function useGuestHistory(id: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["guests", id, "history"],
    queryFn: ({ pageParam }) =>
      apiClient.get<GuestHistoryPage>(`/api/guests/${id}/history?limit=${HISTORY_PAGE_SIZE}&offset=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length * HISTORY_PAGE_SIZE : undefined),
    enabled: !!id,
  });
}
