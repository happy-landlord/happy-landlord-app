import { supabase } from "@/lib/supabase";
import type { DbKeySet, KeyInventory, KeyInventoryItem, KeyItemType } from "@/types/database";

export type KeySet = DbKeySet;
export type KeySetType = KeySet["set_type"];
export type KeySetStatus = KeySet["status"];
export type { KeyInventory, KeyInventoryItem, KeyItemType };

export type FetchKeySetsOptions = {
  /** Filter to a specific set_type — agents pass "company" */
  setType?: KeySetType;
};

export async function fetchKeySetsForProperty(
  propertyId: string,
  { setType }: FetchKeySetsOptions = {}
): Promise<KeySet[]> {
  let query = supabase
    .from("key_sets")
    .select("*")
    .eq("property_id", propertyId)
    .order("set_code", { ascending: true });

  if (setType) {
    query = query.eq("set_type", setType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
