import { supabase } from "@/lib/supabase";
import type { DbProperty, DbPropertyInsert } from "@/types/database";
import { COUNCIL_CODES } from "@/constants/places";

export type Property = DbProperty;
export type PropertyType = Property["property_type"];
export type PropertyKeyStatus = Property["key_status"];

/** Property with the resolved landlord key holder joined in. */
export type PropertyWithLandlord = Property & {
  landlord: {
    id: string;
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

const LANDLORD_SELECT =
  "*, landlord:landlord_holder_id(id, full_name, phone, email)" as const;

// Fields visible to agents — no audit/internal columns
const AGENT_SELECT =
  "id,property_code,address,unit_number,suburb,city,postcode,formatted_address,property_type,key_status,status,latitude,longitude" as const;

export type FetchPropertiesOptions = {
  search?: string;
  keyStatus?: PropertyKeyStatus;
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 20;

export async function fetchProperties({
  search,
  keyStatus,
  page = 0,
  pageSize = DEFAULT_PAGE_SIZE,
}: FetchPropertiesOptions = {}): Promise<Property[]> {
  let query = supabase
    .from("properties")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (keyStatus) {
    query = query.eq("key_status", keyStatus);
  }

  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `address.ilike.${term},suburb.ilike.${term},postcode.ilike.${term},formatted_address.ilike.${term},property_code.ilike.${term}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchPropertyByCode(code: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("property_code", code.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Admin — fetches all columns including joined landlord holder */
export async function fetchPropertyById(id: string): Promise<PropertyWithLandlord | null> {
  const { data, error } = await supabase
    .from("properties")
    .select(LANDLORD_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as PropertyWithLandlord | null;
}

/** Agent — fetches only non-sensitive columns + landlord holder */
export async function fetchPropertyByIdForAgent(id: string): Promise<PropertyWithLandlord | null> {
  const { data, error } = await supabase
    .from("properties")
    .select(`${AGENT_SELECT}, landlord:landlord_holder_id(id, full_name, phone, email)`)
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

/** Creates a new property row and returns the inserted record. */
export async function createProperty(input: DbPropertyInsert): Promise<DbProperty> {
  const { data, error } = await supabase
    .from("properties")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}


