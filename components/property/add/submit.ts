import { createKeyHolder } from "@/services/properties.service";
import { createKeys } from "@/services/keys.service";
import type { DbKeyInsert, DbProperty, DbPropertyInsert } from "@/types/database";
import { KEY_TYPE_LABEL, KEY_TYPE_SHORT } from "@/components/key/keyLabels";
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
 *   3. Insert each key as a row in `keys`
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
  });

  // 3. Keys
  if (keys.length > 0) {
    await createKeys(buildKeyInserts(created, keys));
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
  property: DbProperty,
  keys: KeyEntry[],
): DbKeyInsert[] {
  return keys.map((entry) => ({
    property_id: property.id,
    key_code: `${property.property_code}-${KEY_TYPE_SHORT[entry.type] ?? "OT"}`,
    key_type: entry.type,
    label: KEY_TYPE_LABEL[entry.type] ?? entry.type,
    total_quantity: entry.count,
    available_quantity: entry.count,
    status: "available",
    current_holder_id: null,
    notes: null,
  }));
}

