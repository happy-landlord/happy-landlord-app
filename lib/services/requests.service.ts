import { supabase } from "@/lib/supabase";
import { notifyAdminsOfRequest } from "./notifications.service";
import type { DbRegistrationRequest } from "@/types";

export type RegistrationRequest = DbRegistrationRequest & {
  /** Reviewer profile joined via reviewed_by FK — null if not yet reviewed. */
  reviewer: { full_name: string | null } | null;
};

/** Fetch all registration requests with reviewer name (admin only). */
export async function fetchRegistrationRequests(): Promise<
  RegistrationRequest[]
> {
  const { data, error } = await supabase
    .from("registration_requests")
    .select("*, reviewer:profiles!reviewed_by(full_name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as RegistrationRequest[];
}

/** Fetch the current user's most recent registration request. */
export async function fetchMyLatestRequest(): Promise<RegistrationRequest | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("registration_requests")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as RegistrationRequest | null;
}

/** Approve via DB function (also updates profile role + status). */
export async function approveRequest(
  requestId: string,
  role: "agent" | "admin" = "agent",
  adminNote?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("approve_registration_request", {
    p_request_id: requestId,
    p_role: role,
    p_admin_note: adminNote ?? null,
  } as never);

  if (error) throw error;
}

/** Reject via DB function (also updates profile status). */
export async function rejectRequest(
  requestId: string,
  adminNote?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("reject_registration_request", {
    p_request_id: requestId,
    p_admin_note: adminNote ?? null,
  } as never);

  if (error) throw error;
}

/**
 * Submit a registration request for any non-approved account (rejected or
 * inactive). Uses submit_registration_request which updates the profile to
 * 'pending' and inserts a new pending request for admin review.
 */
export async function requestReactivation(
  message?: string | null,
  agentName?: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc("submit_registration_request", {
    p_full_name: null,
    p_phone: null,
    p_message: message ?? null,
  } as never);

  if (error) throw error;

  // Fire-and-forget: notify all admins — errors must not block the submission.
  notifyAdminsOfRequest(agentName ?? null);

  return data as string;
}

