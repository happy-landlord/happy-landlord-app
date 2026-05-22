/**
 * useCheckout.ts
 * TanStack Query mutations for keyset checkout and return flows.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  checkoutKeyset,
  returnKeyset,
  type CheckoutParams,
  type ReturnParams,
  type KeySetWithHolder,
} from "@/services/keys.service";

// ─────────────────────────────────────────────────────────────────────────────
// Checkout mutation
// ─────────────────────────────────────────────────────────────────────────────

export function useCheckoutKeyset(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CheckoutParams) => checkoutKeyset(params),
    onSuccess: (holderId, variables) => {
      // Get the current user from the cached session so the optimistic patch
      // can set current_holder.profile_id correctly before the refetch returns.
      const session = queryClient.getQueryData<Session | null>(QUERY_KEYS.auth.session);
      const userId = session?.user.id ?? "";

      const checkedOutPatch = {
        status: "borrowed" as const,
        current_holder_id: holderId,
        current_holder: {
          profile_id: userId,
          full_name: null, // corrected by the background refetch
          holder_type: "agent" as const,
        },
      };

      // Optimistic cache write — flip to "borrowed" immediately so the UI
      // shows the Return button before the background refetch arrives.
      queryClient.setQueriesData<KeySetWithHolder[]>(
        { queryKey: QUERY_KEYS.keys.byProperty(propertyId) },
        (old) =>
          old?.map((ks) =>
            ks.id === variables.keySetId ? { ...ks, ...checkedOutPatch } : ks,
          ) ?? old,
      );
      queryClient.setQueryData<KeySetWithHolder | null>(
        QUERY_KEYS.keys.detail(variables.keySetId),
        (old) => (old ? { ...old, ...checkedOutPatch } : old),
      );

      // Invalidate so fresh server data loads on the next mount/focus.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.byProperty(propertyId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.detail(variables.keySetId) });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Return mutation
// ─────────────────────────────────────────────────────────────────────────────

export function useReturnKeyset(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ReturnParams) => returnKeyset(params),
    onSuccess: (_data, variables) => {
      const returnedPatch = {
        status: "available" as const,
        current_holder_id: null,
        current_holder: null,
      };

      // Optimistic cache write — flip to "available" immediately.
      queryClient.setQueriesData<KeySetWithHolder[]>(
        { queryKey: QUERY_KEYS.keys.byProperty(propertyId) },
        (old) =>
          old?.map((ks) =>
            ks.id === variables.keySetId ? { ...ks, ...returnedPatch } : ks,
          ) ?? old,
      );
      queryClient.setQueryData<KeySetWithHolder | null>(
        QUERY_KEYS.keys.detail(variables.keySetId),
        (old) => (old ? { ...old, ...returnedPatch } : old),
      );

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.byProperty(propertyId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.detail(variables.keySetId) });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Transfer mutation
// ─────────────────────────────────────────────────────────────────────────────

export function useTransferKeyset(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: TransferParams) => transferKeyset(params),
    onSuccess: (newHolderId, variables) => {
      const session = queryClient.getQueryData<Session | null>(QUERY_KEYS.auth.session);
      const userId = session?.user.id ?? "";

      const transferredPatch = {
        // status stays borrowed — only the holder changes
        current_holder_id: newHolderId,
        current_holder: {
          profile_id: userId,
          full_name: null, // corrected by background refetch
          holder_type: "agent" as const,
        },
      };

      queryClient.setQueriesData<KeySetWithHolder[]>(
        { queryKey: QUERY_KEYS.keys.byProperty(propertyId) },
        (old) =>
          old?.map((ks) =>
            ks.id === variables.keySetId ? { ...ks, ...transferredPatch } : ks,
          ) ?? old,
      );
      queryClient.setQueryData<KeySetWithHolder | null>(
        QUERY_KEYS.keys.detail(variables.keySetId),
        (old) => (old ? { ...old, ...transferredPatch } : old),
      );

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.byProperty(propertyId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.detail(variables.keySetId) });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

