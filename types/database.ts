export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: "admin" | "agent";
          email: string | null;
          phone: string | null;
          status: "pending" | "approved" | "rejected" | "inactive";
          created_at: string;
          profile_image: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: "admin" | "agent";
          email?: string | null;
          phone?: string | null;
          status?: "pending" | "approved" | "rejected" | "inactive";
          created_at?: string;
          profile_image?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: "admin" | "agent";
          email?: string | null;
          phone?: string | null;
          status?: "pending" | "approved" | "rejected" | "inactive";
          created_at?: string;
          profile_image?: string | null;
        };
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string;
          recipient_user_id: string | null;
          title: string;
          body: string;
          type: string;
          related_property_id: string | null;
          related_key_set_id: string | null;
          related_checkout_id: string | null;
          created_by: string | null;
          read_at: string | null;
          sent_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          recipient_user_id?: string | null;
          title: string;
          body: string;
          type: string;
          related_property_id?: string | null;
          related_key_set_id?: string | null;
          related_checkout_id?: string | null;
          created_by?: string | null;
          read_at?: string | null;
          sent_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          recipient_user_id?: string | null;
          title?: string;
          body?: string;
          type?: string;
          related_property_id?: string | null;
          related_key_set_id?: string | null;
          related_checkout_id?: string | null;
          created_by?: string | null;
          read_at?: string | null;
          sent_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };

      user_push_tokens: {
        Row: {
          id: string;
          user_id: string | null;
          expo_push_token: string;
          device_name: string | null;
          platform: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string;
          last_seen_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          expo_push_token: string;
          device_name?: string | null;
          platform?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string;
          last_seen_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          expo_push_token?: string;
          device_name?: string | null;
          platform?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string;
          last_seen_at?: string | null;
        };
        Relationships: [];
      };

      registration_requests: {
        Row: {
          id: string;
          profile_id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          requested_role: "agent" | "admin";
          status: "pending" | "approved" | "rejected";
          admin_note: string | null;
          user_message: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          requested_role?: "agent" | "admin";
          status?: "pending" | "approved" | "rejected";
          admin_note?: string | null;
          user_message?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          requested_role?: "agent" | "admin";
          status?: "pending" | "approved" | "rejected";
          admin_note?: string | null;
          user_message?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      properties: {
        Row: {
          id: string;
          property_code: string;
          address: string;
          suburb: string;
          city: string;
          postcode: string | null;
          formatted_address: string | null;
          google_place_id: string | null;
          latitude: number | null;
          longitude: number | null;
          property_type:
            | "house"
            | "townhouse"
            | "apartment"
            | "unit"
            | "duplex"
            | "villa"
            | "other";
          key_status: "available" | "leased" | "landlord";
          status: "active" | "inactive" | "archived";
          unit_number: string | null;
          landlord_holder_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          images: { path: string; sort_order: number; is_hidden: boolean }[];
        };
        Insert: {
          id?: string;
          property_code: string;
          address: string;
          suburb: string;
          city?: string;
          postcode?: string | null;
          formatted_address?: string | null;
          google_place_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          property_type:
            | "house"
            | "townhouse"
            | "apartment"
            | "unit"
            | "duplex"
            | "villa"
            | "other";
          key_status?: "available" | "leased" | "landlord";
          status?: "active" | "inactive" | "archived";
          unit_number?: string | null;
          landlord_holder_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          images?: { path: string; sort_order: number; is_hidden: boolean }[];
        };
        Update: {
          id?: string;
          property_code?: string;
          address?: string;
          suburb?: string;
          city?: string;
          postcode?: string | null;
          formatted_address?: string | null;
          google_place_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          property_type?:
            | "house"
            | "townhouse"
            | "apartment"
            | "unit"
            | "duplex"
            | "villa"
            | "other";
          key_status?: "available" | "leased" | "landlord";
          status?: "active" | "inactive" | "archived";
          unit_number?: string | null;
          landlord_holder_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          images?: { path: string; sort_order: number; is_hidden: boolean }[];
        };
        Relationships: [];
      };

      key_holders: {
        Row: {
          id: string;
          holder_type: "agent" | "tenant" | "landlord";
          profile_id: string | null;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          holder_type: "agent" | "tenant" | "landlord";
          profile_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          holder_type?: "agent" | "tenant" | "landlord";
          profile_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      keys: {
        Row: {
          id: string;
          property_id: string;
          key_type:
            | "main_door"
            | "swipe_fob"
            | "mailbox"
            | "window"
            | "garage_remote"
            | "key_card"
            | "storage_cage"
            | "common_area"
            | "security"
            | "balcony"
            | "other";
          label: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          key_set_id: string | null;
          code: string | null;
          quantity: number;
        };
        Insert: {
          id?: string;
          property_id: string;
          key_type:
            | "main_door"
            | "swipe_fob"
            | "mailbox"
            | "window"
            | "garage_remote"
            | "key_card"
            | "storage_cage"
            | "common_area"
            | "security"
            | "balcony"
            | "other";
          label: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          key_set_id?: string | null;
          code?: string | null;
          quantity?: number;
        };
        Update: {
          id?: string;
          property_id?: string;
          key_type?:
            | "main_door"
            | "swipe_fob"
            | "mailbox"
            | "window"
            | "garage_remote"
            | "key_card"
            | "storage_cage"
            | "common_area"
            | "security"
            | "balcony"
            | "other";
          label?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          key_set_id?: string | null;
          code?: string | null;
          quantity?: number;
        };
        Relationships: [];
      };

      key_sets: {
        Row: {
          id: string;
          property_id: string;
          code: string;
          name: string;
          status:
            | "available"
            | "checked_out"
            | "overdue"
            | "handover_tenant"
            | "handover_landlord"
            | "missing_damaged"
            | "inactive";
          current_holder_id: string | null;
          due_back_at: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          images: { path: string; sort_order: number; is_hidden: boolean }[];
        };
        Insert: {
          id?: string;
          property_id: string;
          code: string;
          name: string;
          status?:
            | "available"
            | "checked_out"
            | "overdue"
            | "handover_tenant"
            | "handover_landlord"
            | "missing_damaged"
            | "inactive";
          current_holder_id?: string | null;
          due_back_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          images?: { path: string; sort_order: number; is_hidden: boolean }[];
        };
        Update: {
          id?: string;
          property_id?: string;
          code?: string;
          name?: string;
          status?:
            | "available"
            | "checked_out"
            | "overdue"
            | "handover_tenant"
            | "handover_landlord"
            | "missing_damaged"
            | "inactive";
          current_holder_id?: string | null;
          due_back_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          images?: { path: string; sort_order: number; is_hidden: boolean }[];
        };
        Relationships: [];
      };

      transactions: {
        Row: {
          id: string;
          key_set_id: string;
          property_id: string;
          transaction_type:
            | "created"
            | "checked_out"
            | "returned"
            | "marked_overdue"
            | "marked_missing_damaged"
            | "handover_tenant"
            | "handover_landlord"
            | "notes_updated";
          from_holder_id: string | null;
          to_holder_id: string | null;
          due_back_at: string | null;
          notes: string | null;
          updated_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key_set_id: string;
          property_id: string;
          transaction_type:
            | "created"
            | "checked_out"
            | "returned"
            | "marked_overdue"
            | "marked_missing_damaged"
            | "handover_tenant"
            | "handover_landlord"
            | "notes_updated";
          from_holder_id?: string | null;
          to_holder_id?: string | null;
          due_back_at?: string | null;
          notes?: string | null;
          updated_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          key_set_id?: string;
          property_id?: string;
          transaction_type?:
            | "created"
            | "checked_out"
            | "returned"
            | "marked_overdue"
            | "marked_missing_damaged"
            | "handover_tenant"
            | "handover_landlord"
            | "notes_updated";
          from_holder_id?: string | null;
          to_holder_id?: string | null;
          due_back_at?: string | null;
          notes?: string | null;
          updated_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      checkout_key_set: {
        Args: {
          p_key_set_id: string;
          p_due_back_at?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
      return_key_set: {
        Args: {
          p_key_set_id: string;
          p_notes?: string | null;
        };
        Returns: string;
      };
      transfer_key_set_to_me: {
        Args: {
          p_key_set_id: string;
          p_notes?: string | null;
        };
        Returns: string;
      };
      approve_registration_request: {
        Args: {
          p_request_id: string;
          p_role?: "agent" | "admin";
          p_admin_note?: string | null;
        };
        Returns: void;
      };
      create_notification: {
        Args: {
          p_recipient_user_id: string;
          p_title: string;
          p_body: string;
          p_type: string;
          p_related_property_id?: string | null;
          p_related_key_set_id?: string | null;
          p_related_checkout_id?: string | null;
        };
        Returns: string;
      };
      mark_notification_read: {
        Args: { notification_id: string };
        Returns: void;
      };
      reject_registration_request: {
        Args: {
          p_request_id: string;
          p_admin_note?: string | null;
        };
        Returns: void;
      };
      resubmit_registration_request: {
        Args: {
          p_full_name?: string | null;
          p_phone?: string | null;
          p_message?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ── Transaction type ─────────────────────────────────────────────────────────
/** Derived from the DB enum — single source of truth via transactions.transaction_type */
export type KeyTransactionType = DbTransaction["transaction_type"];

export type KeySetStatus = DbKeySet["status"];

export type NotificationNavigationData = {
  route?: string;
  path?: string;
  related_property_id?: string;
  relatedPropertyId?: string;
  property_id?: string;
  propertyId?: string;
  related_key_set_id?: string;
  relatedKeySetId?: string;
  key_set_id?: string;
  keySetId?: string;
  related_checkout_id?: string;
  relatedCheckoutId?: string;
  checkout_id?: string;
  checkoutId?: string;
  transaction_id?: string;
  transactionId?: string;
  key_id?: string;
  keyId?: string;
  [key: string]: unknown;
};

export type NotificationType =
  | "KEY_CHECKOUT_CREATED"
  | "KEY_DUE_SOON"
  | "KEY_OVERDUE"
  | "KEY_RETURNED"
  | "KEY_LOST_REPORTED"
  | "USER_REGISTRATION_REQUESTED"
  | "KEY_RECALL_REQUESTED";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// ── Convenience row types (use these in services/components) ────────────────
export type DbProfile = Tables<"profiles">;
export type DbProfileUpdate = TablesUpdate<"profiles">;
export type DbProperty = Tables<"properties">;
export type DbPropertyInsert = TablesInsert<"properties">;
export type DbPropertyUpdate = TablesUpdate<"properties">;
export type PropertyType = DbProperty["property_type"];
export type PropertyKeyStatus = DbProperty["key_status"];
export type DbKey = Tables<"keys">;
export type DbKeyInsert = TablesInsert<"keys">;
export type DbKeyUpdate = TablesUpdate<"keys">;
export type KeyType = DbKey["key_type"];
export type DbKeyHolder = Tables<"key_holders">;
export type DbKeyHolderInsert = TablesInsert<"key_holders">;
export type DbKeySet = Tables<"key_sets">;
export type DbKeySetInsert = TablesInsert<"key_sets">;
export type DbKeySetUpdate = TablesUpdate<"key_sets">;
export type DbTransaction = Tables<"transactions">;
export type DbTransactionInsert = TablesInsert<"transactions">;
export type KeyHolderType = DbKeyHolder["holder_type"];
export type DbRegistrationRequest = Tables<"registration_requests">;
export type DbNotification = Tables<"notifications">;
export type DbUserPushToken = Tables<"user_push_tokens">;

// ── Activity transaction — transaction row joined with property + holders ─────
export type ActivityTransaction = DbTransaction & {
  property: {
    address: string;
    unit_number: string | null;
    suburb: string;
    formatted_address: string | null;
  } | null;
  from_holder: Pick<DbKeyHolder, "full_name" | "holder_type" | "profile_id"> | null;
  to_holder: Pick<DbKeyHolder, "full_name" | "holder_type" | "profile_id"> | null;
  key_set: Pick<DbKeySet, "code" | "name"> | null;
  items?: {
    id: string;
    key: { key_code: string; key_type: string; label: string } | null;
  }[];
};
