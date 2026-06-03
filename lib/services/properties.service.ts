import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/utils/imageCompression";
import type {
  DbKeyHolder,
  DbKeyHolderInsert,
  DbProperty,
  DbPropertyInsert,
  DbPropertyUpdate,
  PropertyType,
  PropertyStatus,
  StoredImage,
} from "@/types";
import { COUNCIL_CODES } from "@/constants";

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
      console.warn(
        `[properties.service] createSignedUrl failed for "${stripped}":`,
        error?.message ?? "no URL returned",
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
      console.warn(
        `[properties.service] createSignedUrls failed for ${paths.length} path(s):`,
        error?.message ?? "no data returned",
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
export const PROPERTY_TYPE_LETTERS: Record<PropertyType, string> = {
  house: "H",
  townhouse: "T",
  apartment: "A",
  unit: "U",
  duplex: "D",
  villa: "V",
  other: "O",
};

/**
 * Converts a raw Google Places council/LGA string to a fixed 3-letter code.
 *
 * Resolution order:
 *   1. Strip common council-type words and prefixes to get the "core" name.
 *   2. Look that core name up in COUNCIL_CODES (stable, human-assigned codes).
 *   3. Fall back to the first 3 chars of the core name for unknown councils.
 *
 * Handles the many forms Google Places returns for NSW LGAs, e.g.:
 *   "The Council of the City of Sydney" → core "sydney"          → SYD
 *   "City of Sydney"                    → core "sydney"          → SYD
 *   "Blacktown City Council"            → core "blacktown"       → BLK
 *   "Sutherland Shire"                  → core "sutherland"      → SUT
 *   "Canterbury-Bankstown"              → core "canterbury-bankstown" → CBK
 *   "The Blue Mountains City Council"   → core "blue mountains"  → BLM
 *   "The Hills Shire"                   → core "hills"           → HLS
 */
function councilTo3(council: string): string {
  const core = council
    // 1. Strip "[City|Shire|Municipal|…] Council" at the end
    .replace(/\s*(city|shire|municipal|community|regional)?\s*council\s*$/i, "")
    // 2. Strip standalone "Shire", "City", "Municipal" at the end (no "Council")
    .replace(/\s+(shire|city|municipal|regional)\s*$/i, "")
    // 3. Strip leading "The " — handles "The Council of…", "The Blue Mountains…", etc.
    .replace(/^the\s+/i, "")
    // 4. Strip "Council of the " — handles "Council of the City of Sydney"
    .replace(/^council\s+of\s+the\s+/i, "")
    // 5. Strip "City of …" / "Shire of …" / "Council of …" prefix
    .replace(/^(city|shire|municipality|council)\s+of\s+/i, "")
    .trim()
    .toLowerCase();

  // Fixed lookup table wins over dynamic fallback
  if (COUNCIL_CODES[core]) return COUNCIL_CODES[core];

  // Fallback: first 3 chars (spaces removed) for councils not in the table
  return core.replace(/\s+/g, "").substring(0, 3).toUpperCase();
}

/** Converts a suburb name to a 3-letter uppercase code. */
function suburbTo3(suburb: string): string {
  return suburb.replace(/\s+/g, "").substring(0, 3).toUpperCase();
}

/**
 * Builds a property code from council + suburb + type + sequence.
 * Format: `{COUNCIL3}-{SUBURB3}-{TYPE}{SEQ3}`
 * e.g.  `SYD-CBD-A001`  (Sydney CBD, Apartment, 1st in that suburb)
 *        `RAN-KIN-H003`  (Randwick, Kingsford, House, 3rd)
 */
export function makePropertyCode(
  council: string,
  suburb: string,
  propertyType: PropertyType,
  seq: number,
): string {
  const councilCode = councilTo3(council || suburb);
  const subCode = suburbTo3(suburb);
  const typeCode = PROPERTY_TYPE_LETTERS[propertyType] ?? "O";
  const seqPad = String(seq).padStart(3, "0");
  return `${councilCode}-${subCode}-${typeCode}${seqPad}`;
}

/**
 * Queries the DB for how many properties already share the same
 * council+suburb prefix and returns the next available sequence number.
 */
export async function fetchNextPropertyCodeSeq(
  council: string,
  suburb: string,
): Promise<number> {
  const councilCode = councilTo3(council || suburb);
  const subCode = suburbTo3(suburb);
  const prefix = `${councilCode}-${subCode}-`;

  const { count, error } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .like("property_code", `${prefix}%`);

  if (error) return 1;
  return (count ?? 0) + 1;
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
