import {
  createKeyHolder,
} from "@/services/properties.service";
import { createKeys } from "@/services/keys.service";
import {
  createKeySet,
  uploadKeySetImages,
  updateKeySetImages,
} from "@/services/keySets.service";
import type { DbKeyInsert, DbProperty, DbPropertyInsert } from "@/types/database";
import { KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { formatDate, type KeyEntry, type KeySetDraft, type PropertyStep } from "./types";

export type CreatePropertyArgs = {
  property: PropertyStep;
  keys: KeyEntry[];
  keySets: KeySetDraft[];
  /** Inserts a property row and returns the saved record. */
  createProperty: (input: DbPropertyInsert) => Promise<DbProperty>;
};

/**
 * Orchestrates the full "create property" submission:
 *   1. (Optional) create a landlord key_holder
 *   2. Create the property row
 *   3. For each keyset draft: create keyset row, upload photos, insert global keys
 */
export async function submitNewProperty({
  property,
  keys,
  keySets,
  createProperty,
}: CreatePropertyArgs): Promise<DbProperty> {
  const { selectedPlace: place, propertyCode } = property;
  if (!place || !propertyCode) {
    throw new Error("Address and property code are required.");
  }

  // 1. Landlord key holder (optional)
  const landlordHolderId = await maybeCreateLandlordHolder(property);

  // 2. Property row
  const created = await createProperty({
    property_code: propertyCode,
    address: buildStreetAddress(place),
    unit_number: null,
    suburb: place.suburb ?? "",
    city: place.suburb ?? place.state ?? "",
    postcode: place.postcode ?? null,
    formatted_address: place.description,
    google_place_id: place.placeId,
    latitude: place.lat ?? null,
    longitude: place.lng ?? null,
    property_type: property.propertyType,
    landlord_holder_id: landlordHolderId,
    key_status: "available",
    status: "active",
    images: [],
  });

  const allocatedCounts: Record<string, number> = {};

  // 3. Create each keyset with its selected keys. A key can appear only once
  // per keyset, so each assigned key record has quantity 1.
  for (let i = 0; i < keySets.length; i++) {
    const draft = keySets[i];
    const code = buildKeySetCode(propertyCode, i, keySets.length);

    const keySet = await createKeySet({
      property_id: created.id,
      code,
      name: draft.name,
      status: "available",
    });

    if (draft.photoUris.length > 0) {
      const images = await uploadKeySetImages(created.id, keySet.id, draft.photoUris);
      await updateKeySetImages(keySet.id, images);
    }

    const draftKeys = keys.filter((k) => draft.keyIds.includes(k.id));
    if (draftKeys.length > 0) {
      await createKeys(buildKeyInserts(created.id, keySet.id, draftKeys, 1));
      for (const key of draftKeys) {
        allocatedCounts[key.id] = (allocatedCounts[key.id] ?? 0) + 1;
      }
    }
  }

  // 4. Persist leftover keys as unassigned keys (key_set_id = null), matching
  // the admin property-detail page's unassigned key section.
  const unassigned = keys
    .map((entry) => ({
      entry,
      quantity: Math.max(0, entry.count - (allocatedCounts[entry.id] ?? 0)),
    }))
    .filter(({ quantity }) => quantity > 0);

  if (unassigned.length > 0) {
    await createKeys(
      unassigned.map(({ entry, quantity }) =>
        buildKeyInsert(created.id, null, entry, quantity),
      ),
    );
  }

  return created;
}

// ── Internals ────────────────────────────────────────────────────────────────

function buildKeySetCode(propertyCode: string, index: number, total: number): string {
  if (total === 1) return propertyCode.toUpperCase();
  return `${propertyCode.toUpperCase()}-${index + 1}`;
}

function buildStreetAddress(place: PropertyStep["selectedPlace"]): string {
  if (!place) return "";
  return (
    [place.streetNumber, place.street].filter(Boolean).join(" ") ||
    place.description
  );
}

async function maybeCreateLandlordHolder(
  property: PropertyStep,
): Promise<string | null> {
  const { landlordName, landlordContact, dateReceived } = property;
  if (!landlordName && !landlordContact) return null;

  const holder = await createKeyHolder({
    holder_type: "landlord",
    full_name: landlordName || null,
    phone: landlordContact || null,
    notes: `Keys received: ${formatDate(dateReceived)}`,
  });
  return holder.id;
}

function buildKeyInserts(
  propertyId: string,
  keySetId: string | null,
  keys: KeyEntry[],
  quantity: number,
): DbKeyInsert[] {
  return keys.map((entry) => buildKeyInsert(propertyId, keySetId, entry, quantity));
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
    label: entry.type === "other" && entry.otherLabel
      ? entry.otherLabel
      : KEY_TYPE_LABEL[entry.type] ?? entry.type,
    quantity,
    code: entry.code ?? null,
    notes: null,
  };
}
