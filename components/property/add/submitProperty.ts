import {
  createKeyHolder,
  createKeys,
  createKeySet,
  uploadKeySetImages,
  updateKeySetImages,
  deleteProperty,
  deleteKeyHolder,
  updateProperty,
  clearDraftPropertyChildren,
  removePropertyDraftPhotos,
} from "@/lib/services";
import {
  buildKeySetCode,
  countAllocatedKeys,
  normalizeAustralianPhone,
  formatLongDate,
  getUnallocatedKeys,
  buildAddressColumns,
} from "@/lib/utils";
import type { DbKeyInsert, DbProperty, DbPropertyInsert } from "@/types";
import { KEY_TYPE_LABEL } from "@/constants";
import type {
  KeyEntry,
  KeySetDraft,
  PropertyStep,
} from "./useAddPropertyWizard";

export type CreatePropertyArgs = {
  property: PropertyStep;
  propertyCode: string;
  keys: KeyEntry[];
  keySets: KeySetDraft[];
  /** Inserts a property row and returns the saved record. */
  createProperty: (input: DbPropertyInsert) => Promise<DbProperty>;
  /** Existing draft property row to complete instead of inserting another row. */
  draftPropertyId?: string;
};

/**
 * Orchestrates the full "create property" submission:
 *   1. (Optional) create a landlord key_holder
 *   2. Create a new property row, or reuse the existing draft row
 *   3. For each keyset draft: create keyset row, upload photos, insert global keys
 */
export async function submitProperty({
  property,
  propertyCode,
  keys,
  keySets,
  createProperty,
  draftPropertyId,
}: CreatePropertyArgs): Promise<DbProperty> {
  const { selectedPlace: place } = property;
  if (!place || !propertyCode) {
    throw new Error("Address and property code are required.");
  }

  // 1. Landlord key holder (optional)
  const landlordHolderId = await maybeCreateLandlordHolder(property);

  // 2. Property row
  const propertyInput: DbPropertyInsert = {
    property_code: propertyCode,
    title: property.title.trim() || null,
    ...buildAddressColumns(place),
    property_type: property.propertyType,
    landlord_holder_id: landlordHolderId,
    status: draftPropertyId ? "draft" : "active",
    images: [],
    developer_name: property.developerName.trim() || null,
    cabinet_code: property.cabinetCode.trim() || null,
  };
  let created: DbProperty;
  try {
    created = draftPropertyId
      ? await updateProperty(draftPropertyId, propertyInput)
      : await createProperty(propertyInput);
  } catch (error) {
    if (landlordHolderId) await deleteKeyHolder(landlordHolderId);
    throw error;
  }

  // 3. Create each keyset with its selected keys. A key can appear only once
  // per keyset, so each assigned key record has quantity 1.
  // If anything below fails, a new property is removed. An existing draft is
  // retained and only the partially-created child rows are removed.
  try {
    for (let i = 0; i < keySets.length; i++) {
      const draft = keySets[i];
      const code = buildKeySetCode(propertyCode, i, keySets.length);
      if (!code) {
        // Defensive: we validated propertyCode above, so this should not happen.
        throw new Error("Failed to generate keyset code.");
      }

      const keySet = await createKeySet({
        property_id: created.id,
        code,
        name: draft.name,
        status: "available",
        qr_code: `${propertyCode}-${code}`,
        cabinet_slot: draft.cabinetSlot ?? null,
      });

      if (draft.photoUris.length > 0) {
        const images = await uploadKeySetImages(
          created.id,
          keySet.id,
          draft.photoUris,
        );
        await updateKeySetImages(keySet.id, images);
      }

      const draftKeys = keys.filter((k) => draft.keyIds.includes(k.id));
      if (draftKeys.length > 0) {
        await createKeys(buildKeyInserts(created.id, keySet.id, draftKeys, 1));
      }
    }

    // 4. Persist leftover keys as unassigned keys (key_set_id = null), matching
    // the admin property-detail page's unassigned key section.
    const unassigned = getUnallocatedKeys(keys, countAllocatedKeys(keySets));

    if (unassigned.length > 0) {
      await createKeys(
        unassigned.map(({ key, quantity }) =>
          buildKeyInsert(created.id, null, key, quantity),
        ),
      );
    }

    if (draftPropertyId) {
      await updateProperty(draftPropertyId, {
        status: "active",
        draft_data: null,
      });
      await removePropertyDraftPhotos(
        keySets.flatMap((keySet) =>
          keySet.photoPaths.filter((path): path is string => Boolean(path)),
        ),
      );
    }
  } catch (err) {
    // Restore the draft or remove the brand-new property, then clean up the
    // landlord holder created for this completion attempt.
    if (draftPropertyId) {
      await clearDraftPropertyChildren(created.id);
      await updateProperty(created.id, {
        status: "draft",
        landlord_holder_id: null,
      });
    } else {
      await deleteProperty(created.id);
    }
    if (landlordHolderId) {
      await deleteKeyHolder(landlordHolderId);
    }
    throw err;
  }

  return created;
}

// ── Internals ────────────────────────────────────────────────────────────────

async function maybeCreateLandlordHolder(
  property: PropertyStep,
): Promise<string | null> {
  const { landlordName, landlordContact, dateReceived } = property;
  if (!landlordName && !landlordContact) return null;

  const holder = await createKeyHolder({
    holder_type: "landlord",
    full_name: landlordName || null,
    phone: landlordContact ? normalizeAustralianPhone(landlordContact) : null,
    notes: `Keys received: ${formatLongDate(dateReceived)}`,
  });
  return holder.id;
}

function buildKeyInserts(
  propertyId: string,
  keySetId: string | null,
  keys: KeyEntry[],
  quantity: number,
): DbKeyInsert[] {
  return keys.map((entry) =>
    buildKeyInsert(propertyId, keySetId, entry, quantity),
  );
}

function buildKeyInsert(
  propertyId: string,
  keySetId: string | null,
  entry: KeyEntry,
  quantity: number,
): DbKeyInsert {
  return {
    property_id: propertyId,
    key_set_id: keySetId,
    key_type: entry.type,
    label:
      entry.type === "other" && entry.otherLabel
        ? entry.otherLabel
        : (KEY_TYPE_LABEL[entry.type] ?? entry.type),
    quantity,
    code: entry.code ?? null,
    notes: null,
  };
}
