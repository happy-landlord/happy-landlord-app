import { supabase } from "@/lib/supabase";
import type { ActivityMovement } from "@/types/database";

const ACTIVITY_SELECT = `
  *,
  key_set:key_sets(
    set_code,
    property:properties(address, unit_number, suburb, formatted_address)
  ),
  from_holder:from_holder_id(full_name, holder_type, profile_id),
  to_holder:to_holder_id(full_name, holder_type, profile_id)
`;

/** Fetch movements recorded by a specific user (agent view). */
export async function fetchMyActivity(userId: string): Promise<ActivityMovement[]> {
  const { data, error } = await supabase
    .from("key_movements")
    .select(ACTIVITY_SELECT)
    .eq("updated_by", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data as ActivityMovement[];
}

/** Fetch all movements across all users (admin view). */
export async function fetchAllActivity(): Promise<ActivityMovement[]> {
  const { data, error } = await supabase
    .from("key_movements")
    .select(ACTIVITY_SELECT)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return data as ActivityMovement[];
}

