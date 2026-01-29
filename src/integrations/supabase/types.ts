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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accessory_wishlist: {
        Row: {
          accessory_id: number
          accessory_name: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          accessory_id: number
          accessory_name: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          accessory_id?: number
          accessory_name?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      car_colors: {
        Row: {
          car_id: string
          created_at: string
          hex_code: string
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          car_id: string
          created_at?: string
          hex_code: string
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          car_id?: string
          created_at?: string
          hex_code?: string
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "car_colors_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_images: {
        Row: {
          alt_text: string | null
          car_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          sort_order: number | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          car_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          sort_order?: number | null
          url: string
        }
        Update: {
          alt_text?: string | null
          car_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_images_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_offers: {
        Row: {
          car_id: string
          created_at: string
          description: string | null
          discount: string
          id: string
          is_active: boolean | null
          offer_type: string
          sort_order: number | null
          title: string
          valid_till: string | null
        }
        Insert: {
          car_id: string
          created_at?: string
          description?: string | null
          discount: string
          id?: string
          is_active?: boolean | null
          offer_type: string
          sort_order?: number | null
          title: string
          valid_till?: string | null
        }
        Update: {
          car_id?: string
          created_at?: string
          description?: string | null
          discount?: string
          id?: string
          is_active?: boolean | null
          offer_type?: string
          sort_order?: number | null
          title?: string
          valid_till?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "car_offers_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_specifications: {
        Row: {
          car_id: string
          category: string
          created_at: string
          id: string
          label: string
          sort_order: number | null
          value: string
        }
        Insert: {
          car_id: string
          category: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number | null
          value: string
        }
        Update: {
          car_id?: string
          category?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_specifications_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_variants: {
        Row: {
          car_id: string
          created_at: string
          ex_showroom: number | null
          fastag: number | null
          features: string[] | null
          fuel_type: string | null
          handling: number | null
          id: string
          insurance: number | null
          name: string
          on_road_price: number | null
          price: string
          price_numeric: number | null
          registration: number | null
          rto: number | null
          sort_order: number | null
          tcs: number | null
          transmission: string | null
        }
        Insert: {
          car_id: string
          created_at?: string
          ex_showroom?: number | null
          fastag?: number | null
          features?: string[] | null
          fuel_type?: string | null
          handling?: number | null
          id?: string
          insurance?: number | null
          name: string
          on_road_price?: number | null
          price: string
          price_numeric?: number | null
          registration?: number | null
          rto?: number | null
          sort_order?: number | null
          tcs?: number | null
          transmission?: string | null
        }
        Update: {
          car_id?: string
          created_at?: string
          ex_showroom?: number | null
          fastag?: number | null
          features?: string[] | null
          fuel_type?: string | null
          handling?: number | null
          id?: string
          insurance?: number | null
          name?: string
          on_road_price?: number | null
          price?: string
          price_numeric?: number | null
          registration?: number | null
          rto?: number | null
          sort_order?: number | null
          tcs?: number | null
          transmission?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "car_variants_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      cars: {
        Row: {
          availability: string | null
          body_type: string | null
          brand: string
          competitors: string[] | null
          cons: string[] | null
          created_at: string
          discount: string | null
          fuel_types: string[] | null
          id: string
          is_hot: boolean | null
          is_limited: boolean | null
          is_new: boolean | null
          is_upcoming: boolean | null
          key_highlights: string[] | null
          launch_date: string | null
          name: string
          original_price: string | null
          overview: string | null
          price_numeric: number | null
          price_range: string | null
          pros: string[] | null
          slug: string
          tagline: string | null
          transmission_types: string[] | null
          updated_at: string
        }
        Insert: {
          availability?: string | null
          body_type?: string | null
          brand: string
          competitors?: string[] | null
          cons?: string[] | null
          created_at?: string
          discount?: string | null
          fuel_types?: string[] | null
          id?: string
          is_hot?: boolean | null
          is_limited?: boolean | null
          is_new?: boolean | null
          is_upcoming?: boolean | null
          key_highlights?: string[] | null
          launch_date?: string | null
          name: string
          original_price?: string | null
          overview?: string | null
          price_numeric?: number | null
          price_range?: string | null
          pros?: string[] | null
          slug: string
          tagline?: string | null
          transmission_types?: string[] | null
          updated_at?: string
        }
        Update: {
          availability?: string | null
          body_type?: string | null
          brand?: string
          competitors?: string[] | null
          cons?: string[] | null
          created_at?: string
          discount?: string | null
          fuel_types?: string[] | null
          id?: string
          is_hot?: boolean | null
          is_limited?: boolean | null
          is_new?: boolean | null
          is_upcoming?: boolean | null
          key_highlights?: string[] | null
          launch_date?: string | null
          name?: string
          original_price?: string | null
          overview?: string | null
          price_numeric?: number | null
          price_range?: string | null
          pros?: string[] | null
          slug?: string
          tagline?: string | null
          transmission_types?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          car_id: number
          car_slug: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          car_id: number
          car_slug: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          car_id?: number
          car_slug?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          car_id: number
          car_name: string
          car_slug: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          car_id: number
          car_name: string
          car_slug: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          car_id?: number
          car_name?: string
          car_slug?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          cars_enhanced: number | null
          cars_processed: number | null
          completed_at: string | null
          created_at: string
          errors: string[] | null
          id: string
          metadata: Json | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          cars_enhanced?: number | null
          cars_processed?: number | null
          completed_at?: string | null
          created_at?: string
          errors?: string[] | null
          id?: string
          metadata?: Json | null
          started_at?: string
          status?: string
          sync_type: string
        }
        Update: {
          cars_enhanced?: number | null
          cars_processed?: number | null
          completed_at?: string | null
          created_at?: string
          errors?: string[] | null
          id?: string
          metadata?: Json | null
          started_at?: string
          status?: string
          sync_type?: string
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
