import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateUserInput, UpdateUserInput, User } from "@support-hub/shared";
import { apiClient } from "../apiClient";
import { useSession } from "../useSession";

// The signed-in user's own profile (incl. role) — used to decide whether
// to show the Admin link/screen at all. Any authenticated user may call
// GET /api/users/me; the admin-only endpoints below are separate.
export function useCurrentUser() {
  const { session } = useSession();
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: () => apiClient.get<User>("/api/users/me"),
    enabled: !!session,
  });
}

export function useUsers(enabled: boolean) {
  return useQuery({
    queryKey: ["users", "list"],
    queryFn: () => apiClient.get<User[]>("/api/users"),
    enabled,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => apiClient.post<User>("/api/users", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users", "list"] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserInput & { id: string }) => apiClient.patch<User>(`/api/users/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users", "list"] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<User>(`/api/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users", "list"] }),
  });
}
