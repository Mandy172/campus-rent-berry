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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      listings: {
        Row: {
          agreement_template: string
          available: boolean
          category: string
          condition: string
          created_at: string
          daily_rate: number | null
          deposit: number
          description: string
          flat_rate: number | null
          hourly_rate: number | null
          id: string
          location: string
          media: Json
          owner_id: string
          owner_name: string
          quantity: number
          rules: string[]
          tags: string[]
          title: string
        }
        Insert: {
          agreement_template?: string
          available?: boolean
          category: string
          condition?: string
          created_at?: string
          daily_rate?: number | null
          deposit?: number
          description?: string
          flat_rate?: number | null
          hourly_rate?: number | null
          id: string
          location: string
          media?: Json
          owner_id: string
          owner_name: string
          quantity?: number
          rules?: string[]
          tags?: string[]
          title: string
        }
        Update: {
          agreement_template?: string
          available?: boolean
          category?: string
          condition?: string
          created_at?: string
          daily_rate?: number | null
          deposit?: number
          description?: string
          flat_rate?: number | null
          hourly_rate?: number | null
          id?: string
          location?: string
          media?: Json
          owner_id?: string
          owner_name?: string
          quantity?: number
          rules?: string[]
          tags?: string[]
          title?: string
        }
        Relationships: []
      }
      payout_accounts: {
        Row: {
          connected: boolean
          owner_id: string
          stripe_account_id: string
          updated_at: string
        }
        Insert: {
          connected?: boolean
          owner_id: string
          stripe_account_id: string
          updated_at?: string
        }
        Update: {
          connected?: boolean
          owner_id?: string
          stripe_account_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rentals: {
        Row: {
          borrower_id: string
          created_at: string
          days: number
          deposit: number
          end_date: string
          fee: number
          id: string
          listing_id: string
          note: string
          owner_id: string
          quantity: number
          start_date: string
          status: string
          subtotal: number
        }
        Insert: {
          borrower_id: string
          created_at?: string
          days: number
          deposit?: number
          end_date: string
          fee: number
          id?: string
          listing_id: string
          note?: string
          owner_id: string
          quantity?: number
          start_date: string
          status?: string
          subtotal: number
        }
        Update: {
          borrower_id?: string
          created_at?: string
          days?: number
          deposit?: number
          end_date?: string
          fee?: number
          id?: string
          listing_id?: string
          note?: string
          owner_id?: string
          quantity?: number
          start_date?: string
          status?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "rentals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      borrowbee_photo_is_visible: { Args: { p_name: string }; Returns: boolean }
      create_rental_request: {
        Args: {
          p_end_date: string
          p_listing_id: string
          p_note: string
          p_quantity: number
          p_start_date: string
        }
        Returns: string
      }
      respond_to_rental: {
        Args: { p_action: string; p_rental_id: string }
        Returns: boolean
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
