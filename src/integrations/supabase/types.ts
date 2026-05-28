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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clinics: {
        Row: {
          additional_info: string | null
          categories: string | null
          city: string | null
          clinic_name: string
          created_at: string
          email_primary: string | null
          email_secondary: string | null
          google_map_url: string | null
          google_rating: number | null
          google_reviews_count: number | null
          id: string
          last_synced_at: string | null
          phone_primary: string | null
          phone_secondary: string | null
          state: string | null
          status: Database["public"]["Enums"]["clinic_status"]
          street: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          additional_info?: string | null
          categories?: string | null
          city?: string | null
          clinic_name: string
          created_at?: string
          email_primary?: string | null
          email_secondary?: string | null
          google_map_url?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          id?: string
          last_synced_at?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["clinic_status"]
          street?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          additional_info?: string | null
          categories?: string | null
          city?: string | null
          clinic_name?: string
          created_at?: string
          email_primary?: string | null
          email_secondary?: string | null
          google_map_url?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          id?: string
          last_synced_at?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["clinic_status"]
          street?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      outreach_timeline: {
        Row: {
          clinic_id: string
          created_at: string
          date_logged: string
          id: string
          notes: string | null
          outcome: string | null
          staff_id: string | null
          type: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          date_logged?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          staff_id?: string | null
          type: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          date_logged?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          staff_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_timeline_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_timeline_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      socials: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          staff_id: string | null
          url: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          staff_id?: string | null
          url: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          staff_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "socials_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socials_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          clinic_id: string
          created_at: string
          email: string | null
          facebook_url: string | null
          full_name: string
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          notes: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          full_name: string
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          notes?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          full_name?: string
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          notes?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      clinic_status:
        | "New"
        | "Researching"
        | "Contacted"
        | "In Discussion"
        | "Closed-Won"
        | "Closed-Lost"
      social_platform:
        | "Instagram"
        | "Facebook"
        | "Twitter"
        | "YouTube"
        | "LinkedIn"
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
      clinic_status: [
        "New",
        "Researching",
        "Contacted",
        "In Discussion",
        "Closed-Won",
        "Closed-Lost",
      ],
      social_platform: [
        "Instagram",
        "Facebook",
        "Twitter",
        "YouTube",
        "LinkedIn",
      ],
    },
  },
} as const
