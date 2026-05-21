import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import type { RegistrationRequest } from "@/services/requests.service";
import {
  approveRequest,
  fetchRegistrationRequests,
  fetchPendingRequests,
  fetchMyLatestRequest,
  rejectRequest,
  resubmitRequest,
} from "@/services/requests.service";

/** Returns all registration requests for the admin view. */
export function useRegistrationRequests() {
  return useQuery<RegistrationRequest[], Error>({
    queryKey: QUERY_KEYS.requests.all,
    queryFn: fetchRegistrationRequests,
  });
}

/** Returns only pending requests — used for badge count. */
export function usePendingRequests() {
  return useQuery<RegistrationRequest[], Error>({
    queryKey: QUERY_KEYS.requests.pending,
    queryFn: fetchPendingRequests,
  });
}

/** Returns the current user's most recent registration request. */
export function useMyLatestRequest() {
  return useQuery<RegistrationRequest | null, Error>({
    queryKey: QUERY_KEYS.requests.mine,
    queryFn: fetchMyLatestRequest,
  });
}

type ApproveVars = { requestId: string; role?: "agent" | "admin"; adminNote?: string | null };
type RejectVars  = { requestId: string; adminNote?: string | null };
type ResubmitVars = { message?: string | null; fullName?: string | null; phone?: string | null };

/** Approve / reject mutations (admin). */
export function useReviewRequest() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests.all });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests.pending });
  };

  const approve = useMutation<void, Error, ApproveVars>({
    mutationFn: ({ requestId, role, adminNote }) =>
      approveRequest(requestId, role ?? "agent", adminNote),
    onSuccess: invalidate,
  });

  const reject = useMutation<void, Error, RejectVars>({
    mutationFn: ({ requestId, adminNote }) => rejectRequest(requestId, adminNote),
    onSuccess: invalidate,
  });

  return { approve, reject };
}

/** Resubmit after rejection (agent). */
export function useResubmitRequest() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, ResubmitVars>({
    mutationFn: ({ message, fullName, phone }) =>
      resubmitRequest(message, fullName, phone),
    onSuccess: () => {
      // Profile status flipped to pending — refetch profile so layout redirects
      queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests.mine });
    },
  });
}

