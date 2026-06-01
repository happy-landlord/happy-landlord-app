import {
  createKeyHolder,
  uploadPropertyImages,
  updatePropertyImages,
} from "@/services/properties.service";
import { createKeys } from "@/services/keys.service";
import { createKeySet } from "@/services/keySets.service";
import type { DbKeyInsert, DbProperty, DbPropertyInsert } from "@/types/database";
import { KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { formatDate, type KeyEntry, type PropertyStep } from "./types";

export type CreatePropertyArgs = {
  property: PropertyStep;
  keys: KeyEntry[];
  /** Inserts a property row and returns the saved record. */
  createProperty: (input: DbPropertyInsert) => Promise<DbProperty>;
};

/**
 * Orchestrates the full "create property" submission:
 *   1. (Optional) create a landlord key_holder
 *   2. Create the property row
 *   3. Upload property photos → patch images column
 *   4. Create a master keyset for the property
 *   5. Insert each key type as a row in `keys` linked to the keyset
 */
export async function submitNewProperty({
  property,
  keys,
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

  // 3. Upload photos and save paths (skipped when none were selected)
  if (property.photoUris.length > 0) {
    const images = await uploadPropertyImages(created.id, property.photoUris);
    await updatePropertyImages(created.id, images);
  }

  // 4. Master keyset
  if (keys.length > 0) {
    const keySet = await createKeySet({
      property_id: created.id,
      code: propertyCode.toUpperCase(),
      name: "Master Keyset",
      status: "available",
    });

    // 5. Keys linked to the keyset
    await createKeys(buildKeyInserts(created.id, keySet.id, keys));
  }

  return created;
}

// ── Internals ────────────────────────────────────────────────────────────────

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
  keySetId: string,
  keys: KeyEntry[],
): DbKeyInsert[] {
  return keys.map((entry) => ({
    property_id: propertyId,
    key_set_id: keySetId,
    key_type: entry.type,
    label: KEY_TYPE_LABEL[entry.type] ?? entry.type,
    quantity: entry.count,
    notes: null,
  }));
}
