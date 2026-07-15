import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/utils/imageCompression";
import { logger } from "@/lib/utils/logger";
import type {
  DbKeyHolder,
  DbKeyHolderInsert,
  DbProperty,
  DbPropertyInsert,
  DbPropertyUpdate,
  PropertyStatus,
  StoredImage,
} from "@/types";


/** Signed-URL expiry — 1 hour matches the Supabase default. */
const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Strips the leading bucket prefix from a stored path so it is safe to pass
 * to `supabase.storage.from("properties")`.
 * e.g. "properties/uuid/photo-1.jpg" → "uuid/photo-1.jpg"
 */
function stripBucketPrefix(path: string): string {
  return path.replace(/^properties\//, "");
}

/**
 * Returns a short-lived signed URL for a single property image.
 * Works with private Supabase Storage buckets.
 * Returns `null` if the path is empty or the request fails.
 */
export async function fetchSignedPropertyImageUrl(
  path: string,
  expiresIn = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  if (!path) return null;
  const stripped = stripBucketPrefix(path);
  const { data, error } = await supabase.storage
    .from("properties")
    .createSignedUrl(stripped, expiresIn);
  if (error || !data?.signedUrl) {
    if (__DEV__) {
      logger.warn(
        `[properties.service] createSignedUrl failed for "${stripped}"`,
        { message: error?.message ?? "no URL returned" },
      );
    }
    return null;
  }
  return data.signedUrl;
}

/**
 * Returns signed URLs for multiple property image paths in one call.
 * Preserves the input order; failed paths resolve to `null`.
 */
export async function fetchSignedPropertyImageUrls(
  paths: string[],
  expiresIn = SIGNED_URL_TTL_SECONDS,
): Promise<(string | null)[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage
    .from("properties")
    .createSignedUrls(paths.map(stripBucketPrefix), expiresIn);
  if (error || !data) {
    if (__DEV__) {
      logger.warn(
        `[properties.service] createSignedUrls failed for ${paths.length} path(s)`,
        { message: error?.message ?? "no data returned" },
      );
    }
    return paths.map(() => null);
  }
  // createSignedUrls returns results in the same order as the input array
  return data.map((item) => item.signedUrl ?? null);
}

/**
 * Returns the visible images for a property sorted by `sort_order`.
 */
export function getVisibleImages(images: StoredImage[]): StoredImage[] {
  return [...images]
    .filter((img) => !img.is_hidden)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** Property with the resolved landlord key holder joined in. */
export type PropertyWithLandlord = DbProperty & {
  landlord: {
    id: string;
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

/** Tenant holder info fetched from key_sets for a leased property. */
export type TenantHolder = {
  id: string;
  full_name: string | null;
  phone: string | null;
} | null;

/** Fetches the tenant key_holder linked to any handover_tenant keyset for the property. */
export async function fetchTenantHolderForProperty(
  propertyId: string,
): Promise<TenantHolder> {
  const { data, error } = await supabase
    .from("key_sets")
    .select("current_holder:current_holder_id(id, full_name, phone)")
    .eq("property_id", propertyId)
    .eq("status", "handover_tenant")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as { current_holder: TenantHolder };
  return row.current_holder ?? null;
}

const LANDLORD_SELECT =
  "*, landlord:landlord_holder_id(id, full_name, phone, email)" as const;

// Fields visible to agents — no audit/internal columns
const AGENT_SELECT =
  "id,property_code,address,unit_number,suburb,city,postcode,formatted_address,property_type,status,latitude,longitude" as const;

export type FetchPropertiesOptions = {
  search?: string;
  status?: PropertyStatus;
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 20;

export async function fetchProperties({
  search,
  status = "active",
  page = 0,
  pageSize = DEFAULT_PAGE_SIZE,
}: FetchPropertiesOptions = {}): Promise<DbProperty[]> {
  let query = supabase
    .from("properties")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);


  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `address.ilike.${term},suburb.ilike.${term},postcode.ilike.${term},formatted_address.ilike.${term},property_code.ilike.${term}`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchPropertyByCode(
  code: string,
): Promise<DbProperty | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("property_code", code.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Checks if a property already exists at a given Google Place ID + unit number.
 *
 * Two properties at the SAME building (same placeId) are distinct when they
 * have different unit numbers (e.g. "Unit 1" vs "Unit 2"). A duplicate is
 * only flagged when BOTH the place ID and the unit number match exactly
 * (treating null / blank as the same — i.e. "no unit").
 *
 * Returns `null` when no match is found or `placeId` is blank.
 */
export async function fetchPropertyByPlaceId(
  placeId: string,
  unitNumber?: string | null,
): Promise<DbProperty | null> {
  if (!placeId) return null;

  const normalizedUnit = unitNumber?.trim() || null;

  let query = supabase
    .from("properties")
    .select("id, property_code, address, unit_number, suburb")
    .eq("google_place_id", placeId);

  if (normalizedUnit) {
    query = query.eq("unit_number", normalizedUnit);
  } else {
    query = query.is("unit_number", null);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  return data as DbProperty | null;
}

/** Admin — fetches all columns including joined landlord holder */
export async function fetchPropertyById(
  id: string,
): Promise<PropertyWithLandlord | null> {
  const { data, error } = await supabase
    .from("properties")
    .select(LANDLORD_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as PropertyWithLandlord | null;
}

/** Agent — fetches only non-sensitive columns + landlord holder */
export async function fetchPropertyByIdForAgent(
  id: string,
): Promise<PropertyWithLandlord | null> {
  const { data, error } = await supabase
    .from("properties")
    .select(
      `${AGENT_SELECT}, landlord:landlord_holder_id(id, full_name, phone, email)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as PropertyWithLandlord | null;
}

// ── Property code generation ───────────────────────────────────────────────

/** Single-letter type codes for each property type. */
export const PROPERTY_TYPE_LETTERS: Record<string, string> = {
  house: "H",
  townhouse: "T",
  apartment: "A",
  unit: "U",
  duplex: "D",
  villa: "V",
  other: "O",
};

/** Converts a suburb name to a 3-letter uppercase code. */
function suburbTo3(suburb: string): string {
  return suburb.replace(/\s+/g, "").substring(0, 3).toUpperCase();
}

/**
 * Derives a short developer code from a raw developer name.
 *   - Takes up to 3 leading alphanumeric chars (spaces stripped, uppercased).
 *   - Falls back to `fallback` when the name is blank.
 *
 * Examples:  "Lendlease" → "LEN" | "Crown Group" → "CRO" | "" + "A" → "A"
 */
export function developerNameToCode(name: string, fallback: string): string {
  const cleaned = name.trim().replace(/\s+/g, "").toUpperCase();
  return cleaned.substring(0, 3) || fallback;
}

/**
 * Builds a property code from suburb + developer name + property type + sequence.
 *
 * Format: `{SUBURB3}-{DEV_CODE}{SEQ2}`
 *
 * The developer code is derived from `developerName` (up to 3 chars).
 * When blank, it falls back to the property-type letter (e.g. "A" for apartment).
 *
 * Examples:
 *   suburb "Parramatta", developer "Lendlease", type "apartment", seq 1 → `PAR-LEN01`
 *   suburb "CBD",        no developer,          type "apartment", seq 3 → `CBD-A03`
 *   suburb "CBD",        no developer,          type "house",     seq 2 → `CBD-H02`
 */
export function makePropertyCode(
  suburb: string,
  developerName: string,
  propertyType: string,
  seq: number,
): string {
  const subCode = suburbTo3(suburb);
  const typeFallback = PROPERTY_TYPE_LETTERS[propertyType] ?? "O";
  const devCode = developerNameToCode(developerName, typeFallback);
  const seqPad = String(seq).padStart(2, "0");
  return `${subCode}-${devCode}${seqPad}`;
}

/**
 * Queries the DB for how many properties already share the same suburb prefix
 * and returns the next available sequence number.
 *
 * The sequence is scoped to the suburb only (not the developer) so that
 * changing the developer name after address selection never requires a re-fetch.
 */
export async function fetchNextPropertyCodeSeq(suburb: string): Promise<number> {
  const subCode = suburbTo3(suburb);
  const prefix = `${subCode}-`;

  const { count, error } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .like("property_code", `${prefix}%`);

  if (error) return 1;
  return (count ?? 0) + 1;
}

/**
 * Returns distinct non-null developer names that contain `query` (case-insensitive).
 * Used to drive autocomplete suggestions in the add/edit property forms.
 * Returns at most 10 results ordered alphabetically.
 */
export async function fetchDistinctDeveloperNames(
  query: string,
): Promise<string[]> {
  const trimmed = query.trim();
  const { data, error } = await supabase
    .from("properties")
    .select("developer_name")
    .not("developer_name", "is", null)
    .ilike("developer_name", `%${trimmed}%`)
    .order("developer_name", { ascending: true })
    .limit(20);

  if (error || !data) return [];

  // Deduplicate client-side (Supabase doesn't support DISTINCT in PostgREST select)
  const seen = new Set<string>();
  const results: string[] = [];
  for (const row of data) {
    const name = row.developer_name as string;
    if (!seen.has(name)) {
      seen.add(name);
      results.push(name);
      if (results.length === 10) break;
    }
  }
  return results;
}

/** Creates a new key_holder row and returns the inserted record. */
export async function createKeyHolder(
  input: DbKeyHolderInsert,
): Promise<DbKeyHolder> {
  const { data, error } = await supabase
    .from("key_holders")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Creates a new property row and returns the inserted record. */
export async function createProperty(
  input: DbPropertyInsert,
): Promise<DbProperty> {
  const { data, error } = await supabase
    .from("properties")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a property row by id.
 * Used as a rollback step when downstream creation (keyset/key) fails after
 * the property row has already been inserted.
 *
 * Errors are swallowed so that the original error is not masked.
 */
export async function deleteProperty(propertyId: string): Promise<void> {
  await supabase.from("properties").delete().eq("id", propertyId);
}

/**
 * Deletes a key_holder row by id.
 * Used as a rollback step when property creation fails after a landlord
 * key_holder was already inserted.
 *
 * Errors are swallowed so that the original error is not masked.
 */
export async function deleteKeyHolder(holderId: string): Promise<void> {
  await supabase.from("key_holders").delete().eq("id", holderId);
}

/** Updates editable fields on a property and returns the updated record. */
export async function updateProperty(
  propertyId: string,
  patch: DbPropertyUpdate,
): Promise<DbProperty> {
  const { data, error } = await supabase
    .from("properties")
    .update(patch)
    .eq("id", propertyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Updates name/phone on an existing key_holder row. */
export async function updateKeyHolder(
  holderId: string,
  patch: { full_name: string | null; phone: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("key_holders")
    .update(patch)
    .eq("id", holderId);

  if (error) throw error;
}

/**
 * Uploads new local photos during a property edit.
 * Uses timestamp-based filenames to avoid collisions with existing files.
 * `baseSortOrder`: the sort_order to start numbering from (1 = first image overall).
 *
 * Each photo is compressed to ≤ 1 200 px wide JPEG before upload.
 */
export async function uploadPropertyImagesForEdit(
  propertyId: string,
  localUris: string[],
  baseSortOrder: number,
): Promise<StoredImage[]> {
  const results: StoredImage[] = [];
  const batchTs = Date.now();

  for (let i = 0; i < localUris.length; i++) {
    // Compress to JPEG before uploading
    const compressedUri = await compressImage(localUris[i]);
    const fileName = `photo-${batchTs}-${i + 1}.jpg`;
    const storagePath = `${propertyId}/${fileName}`;

    const response = await fetch(compressedUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from("properties")
      .upload(storagePath, arrayBuffer, { contentType: "image/jpeg", upsert: false });

    if (error)
      throw new Error(`Failed to upload photo ${i + 1}: ${error.message}`);

    results.push({
      path: `properties/${storagePath}`,
      sort_order: baseSortOrder + i,
      is_hidden: false,
    });
  }

  return results;
}

/**
 * Uploads local photo URIs to Supabase Storage under `properties/{propertyId}/`
 * and returns a `StoredImage[]` array ready to be saved in the DB.
 *
 * Each photo is compressed to ≤ 1 200 px wide JPEG before upload
 * (~150–300 KB vs 3–5 MB originals — roughly 15× storage savings).
 */
export async function uploadPropertyImages(
  propertyId: string,
  localUris: string[],
): Promise<StoredImage[]> {
  const results: StoredImage[] = [];

  for (let i = 0; i < localUris.length; i++) {
    // Compress to JPEG before uploading
    const compressedUri = await compressImage(localUris[i]);
    const fileName = `photo-${i + 1}.jpg`;
    const storagePath = `${propertyId}/${fileName}`;

    const response = await fetch(compressedUri);
    // React Native: use arrayBuffer() (not blob()) — RN's Blob is a metadata
    // stub and uploads as 0 bytes when passed to supabase-js.
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from("properties")
      .upload(storagePath, arrayBuffer, { contentType: "image/jpeg", upsert: true });

    if (error) {
      throw new Error(`Failed to upload photo ${i + 1}: ${error.message}`);
    }

    // Stored path includes the bucket prefix to match existing convention.
    results.push({
      path: `properties/${storagePath}`,
      sort_order: i + 1,
      is_hidden: false,
    });
  }

  return results;
}

/**
 * Patches the `images` column on a property row.
 * Call this after `uploadPropertyImages` to persist the storage paths.
 */
export async function updatePropertyImages(
  propertyId: string,
  images: StoredImage[],
): Promise<void> {
  const { error } = await supabase
    .from("properties")
    .update({ images })
    .eq("id", propertyId);

  if (error) throw error;
}
