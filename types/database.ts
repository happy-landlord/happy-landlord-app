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
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: "admin" | "agent";
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: "admin" | "agent";
          email?: string | null;
          phone?: string | null;
          created_at?: string;
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
          landlord_name: string | null;
          landlord_contact: string | null;
          key_status: "available" | "landlord";
          landlord_key_delivery_date: string | null;
          landlord_key_delivery_note: string | null;
          status: "active" | "inactive" | "archived";
          unit_number: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
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
          landlord_name?: string | null;
          landlord_contact?: string | null;
          key_status?: "available" | "landlord";
          landlord_key_delivery_date?: string | null;
          landlord_key_delivery_note?: string | null;
          status?: "active" | "inactive" | "archived";
          created_by?: string | null;
          unit_number?: string | null;
          created_at?: string;
          updated_at?: string;
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
          landlord_name?: string | null;
          landlord_contact?: string | null;
          key_status?: "available" | "landlord";
          landlord_key_delivery_date?: string | null;
          landlord_key_delivery_note?: string | null;
          status?: "active" | "inactive" | "archived";
          created_by?: string | null;
          unit_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      key_holders: {
        Row: {
          id: string;
          holder_type: "agent" | "tenant";
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
          holder_type: "agent" | "tenant";
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
          holder_type?: "agent" | "tenant";
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

      key_movements: {
        Row: {
          id: string;
          key_set_id: string;
          movement_type:
            | "created"
            | "borrowed"
            | "returned"
            | "reserved"
            | "marked_overdue"
            | "marked_lost"
            | "notes_updated";
          due_back_at: string | null;
          notes: string | null;
          updated_by: string;
          from_holder_id: string | null;
          to_holder_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          key_set_id: string;
          movement_type:
            | "created"
            | "borrowed"
            | "returned"
            | "reserved"
            | "marked_overdue"
            | "marked_lost"
            | "notes_updated";
          due_back_at?: string | null;
          notes?: string | null;
          updated_by?: string;
          from_holder_id?: string | null;
          to_holder_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          key_set_id?: string;
          movement_type?:
            | "created"
            | "borrowed"
            | "returned"
            | "reserved"
            | "marked_overdue"
            | "marked_lost"
            | "notes_updated";
          due_back_at?: string | null;
          notes?: string | null;
          updated_by?: string;
          from_holder_id?: string | null;
          to_holder_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      key_sets: {
        Row: {
          id: string;
          property_id: string;
          set_code: string;
          set_type: "tenant" | "company" | "unused";
          status: "available" | "reserved" | "borrowed" | "overdue" | "lost" | "tenant" | "inactive";
          inventory: KeyInventory;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          current_holder_id: string | null;
        };
        Insert: {
          id?: string;
          property_id: string;
          set_code: string;
          set_type: "tenant" | "company" | "unused";
          status: "available" | "reserved" | "borrowed" | "overdue" | "lost" | "tenant" | "inactive";
          inventory?: KeyInventory;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          current_holder_id?: string | null;
        };
        Update: {
          id?: string;
          property_id?: string;
          set_code?: string;
          set_type?: "tenant" | "company" | "unused";
          status?: "available" | "reserved" | "borrowed" | "overdue" | "lost" | "tenant" | "inactive";
          inventory?: KeyInventory;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          current_holder_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ── Key inventory types (JSONB shape — managed locally) ─────────────────────
export type KeyItemType =
  | "main_door"
  | "mailbox"
  | "swipe_fob"
  | "garage_remote"
  | "key_card"
  | "window"
  | "balcony";

export type KeyInventoryItem = {
  type: KeyItemType;
  code: string;
  quantity: number;
  notes?: string;
};

export type KeyInventory = {
  items: KeyInventoryItem[];
};
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
export type DbKeySet = Tables<"key_sets">;
export type DbKeySetInsert = TablesInsert<"key_sets">;
export type DbKeySetUpdate = TablesUpdate<"key_sets">;
export type DbKeyHolder = Tables<"key_holders">;
export type DbKeyHolderInsert = TablesInsert<"key_holders">;
export type DbKeyMovement = Tables<"key_movements">;
export type DbKeyMovementInsert = TablesInsert<"key_movements">;
export type KeyMovementType = DbKeyMovement["movement_type"];
export type KeyHolderType = DbKeyHolder["holder_type"];

// ── Activity movement — movement row joined with key_set + property + holders ─
export type ActivityMovement = DbKeyMovement & {
  key_set: {
    set_code: string;
    property: {
      address: string;
      suburb: string;
      formatted_address: string | null;
    };
  } | null;
  from_holder: Pick<DbKeyHolder, "full_name" | "holder_type" | "profile_id"> | null;
  to_holder: Pick<DbKeyHolder, "full_name" | "holder_type" | "profile_id"> | null;
};
