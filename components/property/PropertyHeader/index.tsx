import { useState } from "react";
import { useRouter } from "expo-router";

import { useRole } from "@/hooks";
import type { TenantHolder } from "@/lib/services";
import { CollectFromLandlordSheet } from "@/components/property/CollectFromLandlordSheet";
import { CollectFromTenantSheet } from "@/components/property/CollectFromTenantSheet";
import { HandoverLandlordSheet } from "@/components/property/HandoverLandlordSheet";
import { HandoverTenantSheet } from "@/components/property/HandoverTenantSheet";

import { PropertyHeaderCard } from "./PropertyHeaderCard";

// ── PropertyHeader ────────────────────────────────────────────────────────────
// Orchestrator: self-manages the three action sheets (Edit, Handover, Collect).
// Admin-only — when the current user is not an admin the ⋮ button is hidden
// and the sheets are never mounted.

export type PropertyHeaderProps = {
  propertyId: string;
  tenantOverride?: TenantHolder;
};

export function PropertyHeader({
  propertyId,
  tenantOverride,
}: PropertyHeaderProps) {
  const router = useRouter();
  const { isAdmin } = useRole();

  const [tenantSheetOpen, setTenantSheetOpen] = useState(false);
  const [collectSheetOpen, setCollectSheetOpen] = useState(false);
  const [landlordSheetOpen, setLandlordSheetOpen] = useState(false);
  const [collectLandlordSheetOpen, setCollectLandlordSheetOpen] =
    useState(false);

  return (
    <>
      <PropertyHeaderCard
        propertyId={propertyId}
        tenantOverride={tenantOverride}
        actions={
          isAdmin
            ? {
                onEdit: () => router.push(`/properties/edit/${propertyId}`),
                onHandoverTenant: () => setTenantSheetOpen(true),
                onHandoverLandlord: () => setLandlordSheetOpen(true),
                onCollect: () => setCollectSheetOpen(true),
                onCollectFromLandlord: () => setCollectLandlordSheetOpen(true),
              }
            : undefined
        }
      />

      {isAdmin && (
        <>
          <HandoverTenantSheet
            visible={tenantSheetOpen}
            onClose={() => setTenantSheetOpen(false)}
            propertyId={propertyId}
          />
          <CollectFromTenantSheet
            visible={collectSheetOpen}
            onClose={() => setCollectSheetOpen(false)}
            propertyId={propertyId}
          />
          <HandoverLandlordSheet
            visible={landlordSheetOpen}
            onClose={() => setLandlordSheetOpen(false)}
            propertyId={propertyId}
          />
          <CollectFromLandlordSheet
            visible={collectLandlordSheetOpen}
            onClose={() => setCollectLandlordSheetOpen(false)}
            propertyId={propertyId}
          />
        </>
      )}
    </>
  );
}
