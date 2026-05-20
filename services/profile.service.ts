import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileEdits = Pick<
  Database["public"]["Tables"]["profiles"]["Update"],
  "full_name" | "phone"
>;

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(
  userId: string,
  edits: ProfileEdits
): Promise<Profile> {

  const { data, error } = await supabase
    .from("profiles")
    .update(edits as never) // Supabase types are weirdly strict about this
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}
