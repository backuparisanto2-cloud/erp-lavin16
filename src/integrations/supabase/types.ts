export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      conditions: {
        Row: {
          created_at: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      expense_locations: {
        Row: {
          created_at: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          attachments: Json
          category: string
          created_at: string
          dues_contact: string | null
          dues_name: string | null
          expense_date: string
          id: string
          invoice_no: string | null
          location: string | null
          name: string
          notes: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          attachments?: Json
          category?: string
          created_at?: string
          dues_contact?: string | null
          dues_name?: string | null
          expense_date?: string
          id?: string
          invoice_no?: string | null
          location?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          attachments?: Json
          category?: string
          created_at?: string
          dues_contact?: string | null
          dues_name?: string | null
          expense_date?: string
          id?: string
          invoice_no?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      room_items: {
        Row: {
          brand: string | null
          condition: string
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          photos: Json
          purchase_date: string | null
          purchase_price: number | null
          quantity: number
          receipts: Json
          room_id: string
          serial_number: string | null
          updated_at: string
          vendor: string | null
          warranty_until: string | null
        }
        Insert: {
          brand?: string | null
          condition?: string
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          photos?: Json
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number
          receipts?: Json
          room_id: string
          serial_number?: string | null
          updated_at?: string
          vendor?: string | null
          warranty_until?: string | null
        }
        Update: {
          brand?: string | null
          condition?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          photos?: Json
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number
          receipts?: Json
          room_id?: string
          serial_number?: string | null
          updated_at?: string
          vendor?: string | null
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          floor: number
          id: string
          notes: string | null
          number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          floor: number
          id?: string
          notes?: string | null
          number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          floor?: number
          id?: string
          notes?: string | null
          number?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_items: {
        Row: {
          brand: string | null
          category: string
          condition: string
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          photos: Json
          purchase_date: string | null
          purchase_price: number | null
          quantity: number
          receipts: Json
          serial_number: string | null
          updated_at: string
          vendor: string | null
          warranty_until: string | null
        }
        Insert: {
          brand?: string | null
          category?: string
          condition?: string
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          photos?: Json
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number
          receipts?: Json
          serial_number?: string | null
          updated_at?: string
          vendor?: string | null
          warranty_until?: string | null
        }
        Update: {
          brand?: string | null
          category?: string
          condition?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          photos?: Json
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number
          receipts?: Json
          serial_number?: string | null
          updated_at?: string
          vendor?: string | null
          warranty_until?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
