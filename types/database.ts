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
          created_at?: string;
          updated_at?: string;
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

// ── Helper types (mirrors supabase gen types output) ────────────────────────
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
