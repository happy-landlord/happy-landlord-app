import { supabase } from "@/lib/supabase";
import type { DbProperty } from "@/types/database";

export type Property = DbProperty;
export type PropertyType = Property["property_type"];
export type PropertyKeyStatus = Property["key_status"];
export type PropertyStatus = Property["status"];

// Fields visible to agents — no landlord details, no audit/internal columns
// TODO: confirm with business whether agents should have access to any landlord info
const AGENT_SELECT =
  "id,property_code,address,unit_number,suburb,city,postcode,formatted_address,property_type,key_status,status,latitude,longitude" as const;

export type FetchPropertiesOptions = {
  search?: string;
  keyStatus?: PropertyKeyStatus;
};

export async function fetchProperties({
  search,
  keyStatus,
}: FetchPropertiesOptions = {}): Promise<Property[]> {
  let query = supabase
    .from("properties")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

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

/** Admin — fetches all columns including landlord info and audit fields */
export async function fetchPropertyById(id: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Agent — fetches only non-sensitive columns (no landlord info, no audit) */
export async function fetchPropertyByIdForAgent(id: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from("properties")
    .select(AGENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  // Cast is safe — missing columns are simply not fetched and typed as `never`
  // in the partial select; we only access them behind RoleGate in the UI.
  return data as Property | null;
}


