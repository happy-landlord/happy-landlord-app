import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/lib/query";
import {
  fetchKeySetById,
  fetchUnassignedKeysForProperty,
  type KeyInSet,
  type UnassignedKey,
} from "@/lib/services";
import { getKeySignature } from "@/lib/utils";
import { useCreateKeys, useDeleteKey, useUpdateKey } from "./useKeySets";

// ── Internal helpers ──────────────────────────────────────────────────────────

type KeyLike = { key_type: string; label?: string | null; code?: string | null };

function matchBySig<T extends KeyLike>(list: T[], target: KeyLike): T | undefined {
  const sig = getKeySignature(target);
  return list.find((x) => getKeySignature(x) === sig);
}

function moveLocally(
  source: KeyInSet | UnassignedKey,
  from: (KeyInSet | UnassignedKey)[],
  to: (KeyInSet | UnassignedKey)[],
  toKeySetId: string | null,
) {
  const sig = getKeySignature(source);
  const dest = to.find((x) => getKeySignature(x) === sig);
  const srcQty = source.quantity ?? 1;
  let newFrom = [...from];
  let newTo = [...to];

  if (srcQty > 1) {
    newFrom = newFrom.map((k) =>
      k.id === source.id ? { ...k, quantity: srcQty - 1 } : k,
    );
    if (dest) {
      newTo = newTo.map((k) =>
        k.id === dest.id ? { ...k, quantity: (dest.quantity ?? 1) + 1 } : k,
      );
    } else {
      newTo = [
        ...newTo,
        { ...source, key_set_id: toKeySetId, quantity: 1 } as KeyInSet & UnassignedKey,
      ];
    }
  } else {
    newFrom = newFrom.filter((k) => k.id !== source.id);
    if (dest) {
      newTo = newTo.map((k) =>
        k.id === dest.id ? { ...k, quantity: (dest.quantity ?? 1) + 1 } : k,
      );
    } else {
      newTo = [
        ...newTo,
        { ...source, key_set_id: toKeySetId } as KeyInSet & UnassignedKey,
      ];
    }
  }

  return { newFrom, newTo };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseKeySetAssignmentOptions {
  keySetId: string;
  propertyId: string;
  /** Keys currently assigned to this keyset (from server). */
  serverAssigned: KeyInSet[];
  /** Keys in the unassigned pool for this property (from server). */
  serverUnassigned: UnassignedKey[];
  /**
   * Set to `true` once both `serverAssigned` and `serverUnassigned` reflect
   * real loaded data (not loading-state defaults). The hook only initialises
   * local state after this flips to `true`.
   */
  ready: boolean;
}

/**
 * Manages local (optimistic) assign / unassign state for the keyset edit
 * screen. All mutations are deferred and applied in a single batch via
 * `applyDiff()`, which you should call inside your save handler.
 *
 * Uses TanStack Query's `fetchQuery` to guarantee each mutation step in
 * `applyDiff` runs against the latest server state, preventing stale-read
 * conflicts when applying multiple sequential moves.
 */
export function useKeySetAssignment({
  keySetId,
  propertyId,
  serverAssigned,
  serverUnassigned,
  ready,
}: UseKeySetAssignmentOptions) {
  const queryClient = useQueryClient();
  const createKeysMut = useCreateKeys(propertyId);
  const updateKeyMut = useUpdateKey(propertyId);
  const deleteKeyMut = useDeleteKey(propertyId);

  const [assigned, setAssigned] = useState<KeyInSet[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedKey[]>([]);
  /** Snapshot of the server-assigned list taken at init time; used by applyDiff. */
  const originalAssignedRef = useRef<KeyInSet[]>([]);
  const syncedRef = useRef(false);

  // Initialise local state exactly once when server data is ready.
  useEffect(() => {
    if (syncedRef.current || !ready) return;
    originalAssignedRef.current = serverAssigned;
    setAssigned(serverAssigned);
    setUnassigned(serverUnassigned);
    syncedRef.current = true;
  }, [ready, serverAssigned, serverUnassigned]);

  // ── Local-only interactions ───────────────────────────────────────────────

  function assign(k: UnassignedKey) {
    const src = unassigned.find((x) => x.id === k.id);
    if (!src) return;
    const { newFrom, newTo } = moveLocally(src, unassigned, assigned, keySetId);
    setUnassigned(newFrom as UnassignedKey[]);
    setAssigned(newTo as KeyInSet[]);
  }

  function unassign(k: KeyInSet) {
    const src = assigned.find((x) => x.id === k.id);
    if (!src) return;
    const { newFrom, newTo } = moveLocally(src, assigned, unassigned, null);
    setAssigned(newFrom as KeyInSet[]);
    setUnassigned(newTo as UnassignedKey[]);
  }

  // ── Helpers for applyDiff ─────────────────────────────────────────────────

  function freshUnassigned() {
    return queryClient.fetchQuery({
      queryKey: QUERY_KEYS.keySets.unassigned(propertyId),
      queryFn: () => fetchUnassignedKeysForProperty(propertyId),
      staleTime: 0,
    });
  }

  async function freshAssigned(): Promise<KeyInSet[]> {
    const ks = await queryClient.fetchQuery({
      queryKey: QUERY_KEYS.keySets.detail(keySetId),
      queryFn: () => fetchKeySetById(keySetId),
      staleTime: 0,
    });
    return (ks?.keys ?? []) as KeyInSet[];
  }

  async function moveOne(
    source: KeyInSet | UnassignedKey,
    destList: (KeyInSet | UnassignedKey)[],
    destKeySetId: string | null,
  ) {
    const dest = matchBySig(destList, source);
    const srcQty = source.quantity ?? 1;

    if (srcQty > 1) {
      await updateKeyMut.mutateAsync({
        keyId: source.id,
        patch: { quantity: srcQty - 1 },
      });
      if (dest) {
        await updateKeyMut.mutateAsync({
          keyId: dest.id,
          patch: { quantity: (dest.quantity ?? 1) + 1 },
        });
      } else {
        await createKeysMut.mutateAsync([
          {
            property_id: propertyId,
            key_set_id: destKeySetId,
            key_type: source.key_type,
            label: source.label,
            code: source.code ?? null,
            quantity: 1,
            notes: null,
          },
        ]);
      }
      return;
    }

    if (dest) {
      await updateKeyMut.mutateAsync({
        keyId: dest.id,
        patch: { quantity: (dest.quantity ?? 1) + 1 },
      });
      await deleteKeyMut.mutateAsync(source.id);
    } else {
      await updateKeyMut.mutateAsync({
        keyId: source.id,
        patch: { key_set_id: destKeySetId },
      });
    }
  }

  // ── Diff-based batch apply (call from save handler) ───────────────────────

  /**
   * Computes the net delta between the original server state and the current
   * local state (grouped by key signature), then applies the minimum set of
   * mutations needed. Each step re-fetches fresh server data so sequential
   * moves don't conflict.
   */
  async function applyDiff() {
    const origBySig: Record<string, number> = {};
    for (const k of originalAssignedRef.current) {
      const sig = getKeySignature(k);
      origBySig[sig] = (origBySig[sig] ?? 0) + (k.quantity ?? 1);
    }

    const localBySig: Record<string, number> = {};
    for (const k of assigned) {
      const sig = getKeySignature(k);
      localBySig[sig] = (localBySig[sig] ?? 0) + (k.quantity ?? 1);
    }

    const allSigs = new Set([
      ...Object.keys(origBySig),
      ...Object.keys(localBySig),
    ]);

    for (const sig of allSigs) {
      const delta = (localBySig[sig] ?? 0) - (origBySig[sig] ?? 0);

      if (delta > 0) {
        for (let i = 0; i < delta; i++) {
          const pool = await freshUnassigned();
          const src = pool.find((x) => getKeySignature(x) === sig);
          if (!src) break;
          const current = await freshAssigned();
          await moveOne(src, current, keySetId);
        }
      } else if (delta < 0) {
        for (let i = 0; i < -delta; i++) {
          const current = await freshAssigned();
          const src = current.find((x) => getKeySignature(x) === sig);
          if (!src) break;
          const pool = await freshUnassigned();
          await moveOne(src, pool, null);
        }
      }
    }
  }

  const isPending =
    createKeysMut.isPending ||
    updateKeyMut.isPending ||
    deleteKeyMut.isPending;

  return {
    assigned,
    unassigned,
    assign,
    unassign,
    applyDiff,
    isPending,
  };
}

