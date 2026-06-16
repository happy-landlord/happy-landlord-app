import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/lib/query";
import type { RegistrationRequest } from "@/lib/services";
import {
  approveRequest,
  fetchRegistrationRequests,
  fetchMyLatestRequest,
  rejectRequest,
} from "@/lib/services";

/** Returns all registration requests for the admin view. */
export function useRegistrationRequests() {
  return useQuery<RegistrationRequest[], Error>({
    queryKey: QUERY_KEYS.requests.all,
    queryFn: fetchRegistrationRequests,
  });
}

/**
 * Pending requests — derived from `useRegistrationRequests` via `select` so
 * both hooks share one cached fetch.
 *
 * The list is returned oldest-first (the order admins want when reviewing
 * the backlog) while the parent query stays newest-first.
 */
export function usePendingRequests() {
  return useQuery<RegistrationRequest[], Error, RegistrationRequest[]>({
    queryKey: QUERY_KEYS.requests.all,
    queryFn: fetchRegistrationRequests,
    select: (rows) =>
      rows
        .filter((r) => r.status === "pending")
        .slice()
        .reverse(),
  });
}

/** Returns the current user's most recent registration request. */
export function useMyLatestRequest() {
  return useQuery<RegistrationRequest | null, Error>({
    queryKey: QUERY_KEYS.requests.mine,
    queryFn: fetchMyLatestRequest,
  });
}

type ApproveVars = {
  requestId: string;
  role?: "agent" | "admin";
  adminNote?: string | null;
};
type RejectVars = { requestId: string; adminNote?: string | null };

/** Approve / reject mutations (admin). */
export function useReviewRequest() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests.all });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents.all });
  };

  const approve = useMutation<void, Error, ApproveVars>({
    mutationFn: ({ requestId, role, adminNote }) =>
      approveRequest(requestId, role ?? "agent", adminNote),
    onSuccess: invalidate,
  });

  const reject = useMutation<void, Error, RejectVars>({
    mutationFn: ({ requestId, adminNote }) =>
      rejectRequest(requestId, adminNote),
    onSuccess: invalidate,
  });

  return { approve, reject };
}


