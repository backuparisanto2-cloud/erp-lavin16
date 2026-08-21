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
      audit_logs: {
        Row: {
          action: string
          changed_fields: Json
          created_at: string
          event_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          summary: string | null
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: Json
          created_at?: string
          event_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          summary?: string | null
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: Json
          created_at?: string
          event_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          summary?: string | null
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      incomes: {
        Row: {
          amount: number
          attachments: Json
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          period_months: number
          period_type: string
          room_number: string | null
          start_date: string
          tenant_id: string
          tenant_name: string
          updated_at: string
        }
        Insert: {
          amount?: number
          attachments?: Json
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          period_months?: number
          period_type?: string
          room_number?: string | null
          start_date?: string
          tenant_id: string
          tenant_name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          attachments?: Json
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          period_months?: number
          period_type?: string
          room_number?: string | null
          start_date?: string
          tenant_id?: string
          tenant_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      other_incomes: {
        Row: {
          amount: number
          attachments: Json
          created_at: string
          description: string | null
          id: string
          income_date: string
          name: string
          payer: string | null
          payment_method: string
          updated_at: string
        }
        Insert: {
          amount?: number
          attachments?: Json
          created_at?: string
          description?: string | null
          id?: string
          income_date?: string
          name: string
          payer?: string | null
          payment_method?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          attachments?: Json
          created_at?: string
          description?: string | null
          id?: string
          income_date?: string
          name?: string
          payer?: string | null
          payment_method?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_update: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      room_items: {
        Row: {
          brand: string | null
          code: string | null
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
          code?: string | null
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
          code?: string | null
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
          code: string | null
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
          code?: string | null
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
          code?: string | null
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
      tenant_emergency_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string
          relationship: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          relationship?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          relationship?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_emergency_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_payments: {
        Row: {
          amount: number
          attachments: Json
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          period_end: string | null
          period_start: string | null
          period_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          attachments?: Json
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          attachments?: Json
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_phones: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          label: string | null
          phone: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          phone: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          phone?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_phones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_status_history: {
        Row: {
          changed_at: string
          id: string
          new_room: string | null
          new_status: string
          note: string | null
          old_room: string | null
          old_status: string | null
          tenant_id: string | null
          tenant_name: string | null
        }
        Insert: {
          changed_at?: string
          id?: string
          new_room?: string | null
          new_status: string
          note?: string | null
          old_room?: string | null
          old_status?: string | null
          tenant_id?: string | null
          tenant_name?: string | null
        }
        Update: {
          changed_at?: string
          id?: string
          new_room?: string | null
          new_status?: string
          note?: string | null
          old_room?: string | null
          old_status?: string | null
          tenant_id?: string | null
          tenant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_vehicles: {
        Row: {
          brand_model: string | null
          created_at: string
          id: string
          plate_number: string | null
          tenant_id: string
          vehicle_type: string
        }
        Insert: {
          brand_model?: string | null
          created_at?: string
          id?: string
          plate_number?: string | null
          tenant_id: string
          vehicle_type: string
        }
        Update: {
          brand_model?: string | null
          created_at?: string
          id?: string
          plate_number?: string | null
          tenant_id?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          check_in_date: string | null
          contact: string | null
          created_at: string
          current_address: string | null
          documents: Json
          due_date: string | null
          email: string | null
          home_address: string | null
          id: string
          id_card_files: Json
          ktp_files: Json
          maps_home_url: string | null
          maps_school_url: string | null
          name: string
          nik: string | null
          notes: string | null
          photo_path: string | null
          rent_period: string | null
          room_id: string | null
          room_number: string | null
          rules_agreed: boolean
          rules_agreed_at: string | null
          school_work_address: string | null
          status: string
          student_card: string | null
          updated_at: string
        }
        Insert: {
          check_in_date?: string | null
          contact?: string | null
          created_at?: string
          current_address?: string | null
          documents?: Json
          due_date?: string | null
          email?: string | null
          home_address?: string | null
          id?: string
          id_card_files?: Json
          ktp_files?: Json
          maps_home_url?: string | null
          maps_school_url?: string | null
          name: string
          nik?: string | null
          notes?: string | null
          photo_path?: string | null
          rent_period?: string | null
          room_id?: string | null
          room_number?: string | null
          rules_agreed?: boolean
          rules_agreed_at?: string | null
          school_work_address?: string | null
          status?: string
          student_card?: string | null
          updated_at?: string
        }
        Update: {
          check_in_date?: string | null
          contact?: string | null
          created_at?: string
          current_address?: string | null
          documents?: Json
          due_date?: string | null
          email?: string | null
          home_address?: string | null
          id?: string
          id_card_files?: Json
          ktp_files?: Json
          maps_home_url?: string | null
          maps_school_url?: string | null
          name?: string
          nik?: string | null
          notes?: string | null
          photo_path?: string | null
          rent_period?: string | null
          room_id?: string | null
          room_number?: string | null
          rules_agreed?: boolean
          rules_agreed_at?: string | null
          school_work_address?: string | null
          status?: string
          student_card?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_delete: { Args: { _user_id: string }; Returns: boolean }
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inventory_code: {
        Args: { _date: string; _name: string; _seq: number }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "owner" | "finance" | "employee"
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
    Enums: {
      app_role: ["admin", "owner", "finance", "employee"],
    },
  },
} as const
