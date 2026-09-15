import { supabase } from "@/lib/supabase";
import { normalizeAustralianPhone } from "@/lib/utils/phone";
import type { DbKeyHolder } from "@/types";

export type GuestKeyHolder = DbKeyHolder & { holder_type: "guest" };

export type CreateGuestKeyHolderParams = {
  fullName: string;
  phone: string;
  companyName?: string | null;
  notes?: string | null;
};

export type CheckoutKeySetToGuestParams = {
  keySetId: string;
  guestHolderId: string;
  dueBackAt: string;
  notes?: string | null;
};

export async function fetchGuestKeyHolders(): Promise<GuestKeyHolder[]> {
  const { data, error } = await supabase
    .from("key_holders")
    .select("*")
    .eq("holder_type", "guest")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as GuestKeyHolder[];
}

export async function createGuestKeyHolder({
  fullName,
  phone,
  companyName,
  notes,
}: CreateGuestKeyHolderParams): Promise<string> {
  const normalizedPhone = normalizeAustralianPhone(phone);
  const { data, error } = await supabase.rpc("create_guest_key_holder", {
    p_full_name: fullName.trim(),
    p_phone: normalizedPhone,
    p_company_name: companyName?.trim() || null,
    p_notes: notes?.trim() || null,
  });

  if (error) throw error;
  return data as string;
}

export async function checkoutKeySetToGuest({
  keySetId,
  guestHolderId,
  dueBackAt,
  notes,
}: CheckoutKeySetToGuestParams): Promise<string> {
  const { data, error } = await supabase.rpc("checkout_key_set_to_guest", {
    p_key_set_id: keySetId,
    p_guest_holder_id: guestHolderId,
    p_due_back_at: dueBackAt,
    p_notes: notes?.trim() || null,
  });

  if (error) throw error;
  return data as string;
}
