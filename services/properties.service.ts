import { supabase } from "@/lib/supabase";
import type { DbProperty } from "@/types/database";

// Re-export the DB row type as the canonical Property type.
// Convenience aliases for enum columns keep consumer code readable.
export type Property = DbProperty;
export type PropertyType = Property["property_type"];
export type PropertyKeyStatus = Property["key_status"];
export type PropertyStatus = Property["status"];

export async function fetchProperties(search?: string): Promise<Property[]> {
  let query = supabase
    .from("properties")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

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

export async function fetchPropertyById(id: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
