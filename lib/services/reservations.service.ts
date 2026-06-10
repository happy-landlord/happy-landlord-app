import { supabase } from "@/lib/supabase";

// ── Shared types ──────────────────────────────────────────────────────────────

/**
 * A reservation row enriched with the holder's name and profile link.
 * The `reserved_by` join is always included so callers can compare
 * `reserved_by.profile_id` against the current auth user id.
 */
export type Reservation = {
  id: string;
  key_set_id: string;
  property_id: string;
  reserved_by_holder_id: string;
  starts_at: string;
  ends_at: string;
  status: "active" | "cancelled" | "completed" | "expired";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  reserved_by: {
    id: string;
    full_name: string | null;
    profile_id: string | null;
  } | null;
};

/**
 * A reservation belonging to the current agent, enriched with
 * keyset + property details for display on the home screen.
 */
export type MyReservation = {
  id: string;
  key_set_id: string;
  starts_at: string;
  ends_at: string;
  status: "active";
  key_set: {
    id: string;
    name: string;
    code: string;
    keys: { label: string }[];
    property: {
      unit_number: string | null;
      address: string;
      formatted_address: string | null;
      suburb: string;
      city: string;
      postcode: string | null;
    } | null;
  } | null;
};

// ── Fetch helpers ─────────────────────────────────────────────────────────────

/**
 * Returns all active reservations for a keyset where ends_at > now().
 * Ordered ascending by starts_at so the earliest upcoming reservation is first.
 */
export async function fetchReservationsForKeySet(
  keySetId: string,
): Promise<Reservation[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("reservations")
    .select("*, reserved_by:reserved_by_holder_id(id, full_name, profile_id)")
    .eq("key_set_id", keySetId)
    .eq("status", "active")
    .gt("ends_at", now)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as Reservation[];
}

// ── Mutation param types ──────────────────────────────────────────────────────

export type ReserveKeySetParams = {
  keySetId: string;
  startsAt: string;
  endsAt: string;
  notes?: string | null;
};

// ── RPCs ──────────────────────────────────────────────────────────────────────

/**
 * Reserves a keyset for the calling agent.
 * Calls `public.reserve_key_set(p_key_set_id, p_starts_at, p_ends_at, p_notes)`.
 * Returns the created reservation id.
 */
export async function reserveKeySet({
  keySetId,
  startsAt,
  endsAt,
  notes,
}: ReserveKeySetParams): Promise<string> {
  const { data, error } = await supabase.rpc("reserve_key_set", {
    p_key_set_id: keySetId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_notes: notes ?? null,
  });

  if (error) throw error;
  return data as string;
}

/**
 * Cancels an existing reservation owned by the calling agent.
 * Calls `public.cancel_reservation(p_reservation_id)`.
 */
export async function cancelReservation(reservationId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_reservation", {
    p_reservation_id: reservationId,
  });

  if (error) throw error;
}

/**
 * Fetches all active, non-expired reservations belonging to the given agent
 * (matched by their auth `profile_id`), enriched with keyset + property info.
 * Used to display the agent's upcoming / in-progress reservations on the
 * home screen alongside checked-out keysets.
 */
export async function fetchMyReservations(
  profileId: string,
): Promise<MyReservation[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      id, key_set_id, starts_at, ends_at, status,
      holder:reserved_by_holder_id!inner(profile_id),
      key_set:key_set_id(
        id, name, code,
        keys(label),
        property:property_id(unit_number, address, formatted_address, suburb, city, postcode)
      )
    `,
    )
    .eq("holder.profile_id", profileId)
    .eq("status", "active")
    .gt("ends_at", now)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as MyReservation[];
}
