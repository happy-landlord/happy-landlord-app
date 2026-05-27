/**
 * useCheckout.ts
 * TanStack Query mutations for key checkout, return, and transfer flows.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  checkoutKeys,
  returnKeys,
  transferKeysToMe,
  type CheckoutParams,
  type ReturnParams,
  type TransferParams,
} from "@/services/transactions.service";

// ─────────────────────────────────────────────────────────────────────────────
// Checkout mutation
// ─────────────────────────────────────────────────────────────────────────────

export function useCheckoutKeys(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CheckoutParams) => checkoutKeys(params),
    onSuccess: (_transactionId, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.byProperty(propertyId) });
      for (const keyId of variables.keyIds) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.detail(keyId) });
      }
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Return mutation
// ─────────────────────────────────────────────────────────────────────────────

export function useReturnKeys(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ReturnParams) => returnKeys(params),
    onSuccess: (_transactionId, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.byProperty(propertyId) });
      for (const keyId of variables.keyIds) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.detail(keyId) });
      }
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Transfer mutation
// ─────────────────────────────────────────────────────────────────────────────

export function useTransferKeys(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: TransferParams) => transferKeysToMe(params),
    onSuccess: (_transactionId, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.byProperty(propertyId) });
      for (const keyId of variables.keyIds) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.detail(keyId) });
      }
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
