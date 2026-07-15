import { memo } from "react";

import { ErrorState, LoadingState } from "@/components/ui";
import { useRole } from "@/hooks";
import { useKeySets, useUnassignedKeys } from "@/lib/hooks";

import { AdminKeysView } from "./AdminKeysView";
import { AgentKeysView } from "./AgentKeysView";

// ── KeySetsSection ───────────────────────────────────────────────────────────
// Role-aware container for the property detail screen. Owns the keyset +
// unassigned-keys TanStack queries so child views can stay presentational
// and other consumers (edit sheets, etc.) share the same cache.

export type KeySetsSectionProps = {
  propertyId: string;
};

export const KeySetsSection = memo(function KeySetsSection({
  propertyId,
}: KeySetsSectionProps) {
  const { isAdmin } = useRole();

  const {
    data: keySets,
    isPending: keySetsPending,
    isError: keySetsError,
    refetch: refetchKeySets,
  } = useKeySets(propertyId);

  const {
    data: unassignedKeys,
    isPending: unassignedPending,
    refetch: refetchUnassigned,
  } = useUnassignedKeys(propertyId);

  if (keySetsError) {
    return (
      <ErrorState
        title="Couldn't load keys"
        message="Check your connection and try again."
        onRetry={() => {
          refetchKeySets();
          refetchUnassigned();
        }}
      />
    );
  }

  if (keySetsPending || (isAdmin && unassignedPending)) {
    return <LoadingState message="Loading keys..." />;
  }

  return isAdmin ? (
    <AdminKeysView
      propertyId={propertyId}
      keySets={keySets ?? []}
      unassignedKeys={unassignedKeys ?? []}
    />
  ) : (
    <AgentKeysView keySets={keySets ?? []} />
  );
});

