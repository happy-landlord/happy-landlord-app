/**
 * useCheckout.ts
 * @deprecated Use useCheckoutKeySet / useReturnKeySet / useTransferKeySet
 * from hooks/useKeySets instead.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";

type CheckoutParams = { keyIds: string[]; dueBackAt?: string | null; notes?: string | null };
type ReturnParams = { keyIds: string[]; notes?: string | null };
type TransferParams = { keyIds: string[]; notes?: string | null };

async function _notImplemented(): Promise<string> {
  throw new Error("Individual-key checkout has been replaced with key-set checkout.");
}

export function useCheckoutKeys(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (_params: CheckoutParams) => _notImplemented(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.byProperty(propertyId) });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useReturnKeys(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (_params: ReturnParams) => _notImplemented(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.byProperty(propertyId) });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useTransferKeys(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (_params: TransferParams) => _notImplemented(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keys.byProperty(propertyId) });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
