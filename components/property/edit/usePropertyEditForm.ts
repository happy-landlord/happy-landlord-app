import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { KEY_TYPE_LABEL } from "@/constants";
import { useSyncOnce } from "@/hooks";
import {
  getKeySignature,
  showSuccessToast,
  normalizeAustralianPhone,
  formatLongDate,
} from "@/lib/utils";
import {
  useAllPropertyKeys,
  useCreateKeys,
  useDeleteKey,
  useProperty,
  usePropertyTenant,
  useUpdateKey,
  useUpdatePropertyDetails,
} from "@/lib/hooks";
import { updateKeyHolder } from "@/lib/services";
import type { EnrichedKey } from "@/lib/hooks";
import type { DbKeyInsert, KeyType, PropertyType } from "@/types";

import { useAddressDuplicateCheck } from "../useAddressDuplicateCheck";

// ── Types ─────────────────────────────────────────────────────────────────────

/** A key pending creation — not yet persisted. */
export type PendingCreate = DbKeyInsert & { _tempId: string };

/** Unified display entry used by PropertyKeysSection. */
export type DisplayKey =
  | (EnrichedKey & { isNew?: false })
  | {
      isNew: true;
      _tempId: string;
      id: string; // same as _tempId for keying
      key_type: KeyType;
      label: string;
      code: string | null;
      quantity: number;
      keySetName: null;
    };

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePropertyEditForm(propertyId: string) {
  // ── Server data ──────────────────────────────────────────────────────────
  const {
    data: property,
    isPending: propertyLoading,
    isError,
    refetch,
  } = useProperty(propertyId);

  const isLeased = property?.status === "leased";
  const { allKeys } = useAllPropertyKeys(propertyId);
  const { data: tenant } = usePropertyTenant(propertyId, isLeased);
  const queryClient = useQueryClient();

  // ── Form state ───────────────────────────────────────────────────────────
  const [propertyType, setPropertyType] = useState<PropertyType>("apartment");
  const [landlordName, setLandlordName] = useState("");
  const [landlordContact, setLandlordContact] = useState("");
  const [dateReceived, setDateReceived] = useState<Date>(new Date());
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [developerName, setDeveloperName] = useState("");
  const [cabinetCode, setCabinetCode] = useState("");

  // Sync once when server data arrives
  useSyncOnce(property, (p) => {
    setPropertyType(p.property_type);
    setLandlordName(p.landlord?.full_name ?? "");
    setLandlordContact(p.landlord?.phone ?? "");
    setDeveloperName(p.developer_name ?? "");
    setCabinetCode(p.cabinet_code ?? "");
    // Parse date received from landlord notes ("Keys received: <date>")
    const notes = p.landlord?.notes ?? null;
    const match = notes?.match(/Keys received: (.+)/);
    if (match) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime())) setDateReceived(parsed);
    }
  });

  useSyncOnce(tenant, (t) => {
    setTenantName(t.full_name ?? "");
    setTenantPhone(t.phone ?? "");
  });

  // ── Key draft state ──────────────────────────────────────────────────────
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [pendingCreates, setPendingCreates] = useState<PendingCreate[]>([]);
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({});

  // ── Derived display keys ─────────────────────────────────────────────────
  const existingDisplay = allKeys
    .filter((k) => !deletedIds.includes(k.id))
    .map((k) => ({ ...k, quantity: qtyOverrides[k.id] ?? k.quantity ?? 1 }));

  const displayKeys: DisplayKey[] = [
    ...existingDisplay,
    ...pendingCreates.map((c) => ({
      isNew: true as const,
      _tempId: c._tempId,
      id: c._tempId,
      key_type: c.key_type as KeyType,
      label: c.label ?? KEY_TYPE_LABEL[c.key_type as KeyType],
      code: c.code ?? null,
      quantity: c.quantity ?? 1,
      keySetName: null,
    })),
  ];

  const totalKeys = displayKeys.reduce((s, k) => s + k.quantity, 0);

  // ── Key handlers ─────────────────────────────────────────────────────────
  function addKey(type: KeyType, qty: number, code: string | null) {
    const label = KEY_TYPE_LABEL[type] ?? type;
    const sig = getKeySignature({ key_type: type, label, code });

    const existingMatch = existingDisplay.find(
      (k) => getKeySignature(k) === sig,
    );
    if (existingMatch) {
      setQtyOverrides((prev) => ({
        ...prev,
        [existingMatch.id]:
          (prev[existingMatch.id] ?? existingMatch.quantity) + qty,
      }));
      return;
    }

    const createMatch = pendingCreates.find((c) => getKeySignature(c) === sig);
    if (createMatch) {
      setPendingCreates((prev) =>
        prev.map((c) =>
          c._tempId === createMatch._tempId
            ? { ...c, quantity: (c.quantity ?? 1) + qty }
            : c,
        ),
      );
      return;
    }

    setPendingCreates((prev) => [
      ...prev,
      {
        _tempId: `tmp-${Date.now()}`,
        property_id: propertyId,
        key_type: type,
        label,
        quantity: qty,
        code,
        key_set_id: null,
      },
    ]);
  }

  function changeQty(key: DisplayKey, delta: number) {
    const next = Math.max(1, key.quantity + delta);
    if (next === key.quantity) return;

    if (key.isNew) {
      setPendingCreates((prev) =>
        prev.map((c) =>
          c._tempId === key._tempId ? { ...c, quantity: next } : c,
        ),
      );
    } else {
      setQtyOverrides((prev) => ({ ...prev, [key.id]: next }));
    }
  }

  function deleteKey(key: DisplayKey) {
    if (key.isNew) {
      setPendingCreates((prev) =>
        prev.filter((c) => c._tempId !== key._tempId),
      );
    } else {
      setDeletedIds((prev) => [...prev, key.id]);
      setQtyOverrides((prev) => {
        const { [key.id]: _removed, ...rest } = prev;
        return rest;
      });
    }
  }

  // ── Mutations ────────────────────────────────────────────────────────────
  const updateDetailsMut = useUpdatePropertyDetails(propertyId);
  const tenantUpdateMut = useMutation({
    mutationFn: ({ name, phone }: { name: string; phone: string }) => {
      if (!tenant?.id) return Promise.resolve();
      return updateKeyHolder(tenant.id, {
        full_name: name || null,
        phone: phone || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["propertyTenant", propertyId],
      });
    },
  });
  const createMut = useCreateKeys(propertyId);
  const deleteMut = useDeleteKey(propertyId);
  const updateMut = useUpdateKey(propertyId);

  // ── Save ─────────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const isPending =
    updateDetailsMut.isPending || tenantUpdateMut.isPending || isSaving;

  // ── Address state (shared with add flow) ───────────────────────────────────
  const { selectedPlace, addressError, addressChecking, onAddressSelect } =
    useAddressDuplicateCheck({ excludePropertyId: propertyId });

  async function save(onSuccess: () => void) {
    if (isPending || !property) return;
    if (addressChecking) return;
    if (addressError) return;
    setIsSaving(true);
    try {
      const addressPatch = selectedPlace
        ? {
            address:
              [selectedPlace.streetNumber, selectedPlace.street]
                .filter(Boolean)
                .join(" ") || selectedPlace.description,
            unit_number: selectedPlace.unitNumber?.trim() || null,
            suburb: selectedPlace.suburb ?? "",
            city: selectedPlace.suburb ?? selectedPlace.state ?? "",
            postcode: selectedPlace.postcode ?? null,
            formatted_address: selectedPlace.description,
            google_place_id: selectedPlace.placeId,
            latitude: selectedPlace.lat ?? null,
            longitude: selectedPlace.lng ?? null,
          }
        : {};

      await updateDetailsMut.mutateAsync({
        patch: {
          property_type: propertyType,
          developer_name: developerName.trim() || null,
          cabinet_code: cabinetCode.trim() || null,
          ...addressPatch,
        },
        landlord: {
          holderId: property.landlord?.id ?? null,
          name: landlordName,
          phone: normalizeAustralianPhone(landlordContact),
          notes: `Keys received: ${formatLongDate(dateReceived)}`,
        },
      });

      if (isLeased && tenant?.id) {
        await tenantUpdateMut.mutateAsync({
          name: tenantName,
          phone: normalizeAustralianPhone(tenantPhone),
        });
      }

      for (const id of deletedIds) {
        await deleteMut.mutateAsync(id);
      }
      if (pendingCreates.length > 0) {
        const inserts = pendingCreates.map(({ _tempId: _t, ...rest }) => rest);
        await createMut.mutateAsync(inserts);
      }
      for (const [id, qty] of Object.entries(qtyOverrides)) {
        await updateMut.mutateAsync({ keyId: id, patch: { quantity: qty } });
      }

      showSuccessToast("Property updated");
      onSuccess();
    } catch {
      // mutation errors surface via the global mutation handler (toast)
    } finally {
      setIsSaving(false);
    }
  }

  return {
    propertyLoading,
    isError,
    refetch,
    property,
    isLeased,
    tenant,
    propertyType,
    setPropertyType,
    landlordName,
    setLandlordName,
    landlordContact,
    setLandlordContact,
    dateReceived,
    setDateReceived,
    tenantName,
    setTenantName,
    tenantPhone,
    setTenantPhone,
    developerName,
    setDeveloperName,
    cabinetCode,
    setCabinetCode,
    displayKeys,
    totalKeys,
    addKey,
    changeQty,
    deleteKey,
    isPending,
    save,
    selectedPlace,
    addressError,
    addressChecking,
    onAddressSelect,
  };
}
