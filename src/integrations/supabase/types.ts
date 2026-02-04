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
      accessory_orders: {
        Row: {
          created_at: string
          delivery_fee: number
          id: string
          items: Json
          notes: string | null
          order_id: string | null
          order_status: string
          payment_id: string | null
          payment_status: string
          shipping_address: string
          shipping_city: string
          shipping_email: string | null
          shipping_name: string
          shipping_phone: string
          shipping_pincode: string
          shipping_state: string
          subtotal: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          id?: string
          items: Json
          notes?: string | null
          order_id?: string | null
          order_status?: string
          payment_id?: string | null
          payment_status?: string
          shipping_address: string
          shipping_city: string
          shipping_email?: string | null
          shipping_name: string
          shipping_phone: string
          shipping_pincode: string
          shipping_state: string
          subtotal: number
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          order_status?: string
          payment_id?: string | null
          payment_status?: string
          shipping_address?: string
          shipping_city?: string
          shipping_email?: string | null
          shipping_name?: string
          shipping_phone?: string
          shipping_pincode?: string
          shipping_state?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      admin_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          device_type: string | null
          event_data: Json | null
          event_type: string
          id: string
          page_url: string | null
          referrer: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      call_bookings: {
        Row: {
          created_at: string
          customer_name: string
          email: string | null
          id: string
          notes: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          email?: string | null
          id?: string
          notes?: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string
          preferred_date?: string
          preferred_time?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      car_brochures: {
        Row: {
          car_id: string
          created_at: string | null
          file_size: string | null
          id: string
          language: string | null
          sort_order: number | null
          title: string
          url: string
          variant_name: string | null
        }
        Insert: {
          car_id: string
          created_at?: string | null
          file_size?: string | null
          id?: string
          language?: string | null
          sort_order?: number | null
          title: string
          url: string
          variant_name?: string | null
        }
        Update: {
          car_id?: string
          created_at?: string | null
          file_size?: string | null
          id?: string
          language?: string | null
          sort_order?: number | null
          title?: string
          url?: string
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "car_brochures_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
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
      car_features: {
        Row: {
          car_id: string
          category: string
          created_at: string | null
          feature_name: string
          id: string
          is_standard: boolean | null
          sort_order: number | null
          variant_specific: string[] | null
        }
        Insert: {
          car_id: string
          category: string
          created_at?: string | null
          feature_name: string
          id?: string
          is_standard?: boolean | null
          sort_order?: number | null
          variant_specific?: string[] | null
        }
        Update: {
          car_id?: string
          category?: string
          created_at?: string | null
          feature_name?: string
          id?: string
          is_standard?: boolean | null
          sort_order?: number | null
          variant_specific?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "car_features_car_id_fkey"
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
      car_price_history: {
        Row: {
          car_id: string
          change_percentage: number | null
          change_type: string
          id: string
          new_price: number | null
          old_price: number | null
          recorded_at: string | null
          source: string | null
          variant_id: string | null
        }
        Insert: {
          car_id: string
          change_percentage?: number | null
          change_type: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          recorded_at?: string | null
          source?: string | null
          variant_id?: string | null
        }
        Update: {
          car_id?: string
          change_percentage?: number | null
          change_type?: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          recorded_at?: string | null
          source?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "car_price_history_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_price_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "car_variants"
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
          brochure_url: string | null
          competitors: string[] | null
          cons: string[] | null
          created_at: string
          data_freshness_score: number | null
          discount: string | null
          expected_price_max: number | null
          expected_price_min: number | null
          fuel_types: string[] | null
          id: string
          is_bestseller: boolean | null
          is_discontinued: boolean | null
          is_hot: boolean | null
          is_limited: boolean | null
          is_new: boolean | null
          is_upcoming: boolean | null
          key_highlights: string[] | null
          last_verified_at: string | null
          launch_date: string | null
          name: string
          official_url: string | null
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
          brochure_url?: string | null
          competitors?: string[] | null
          cons?: string[] | null
          created_at?: string
          data_freshness_score?: number | null
          discount?: string | null
          expected_price_max?: number | null
          expected_price_min?: number | null
          fuel_types?: string[] | null
          id?: string
          is_bestseller?: boolean | null
          is_discontinued?: boolean | null
          is_hot?: boolean | null
          is_limited?: boolean | null
          is_new?: boolean | null
          is_upcoming?: boolean | null
          key_highlights?: string[] | null
          last_verified_at?: string | null
          launch_date?: string | null
          name: string
          official_url?: string | null
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
          brochure_url?: string | null
          competitors?: string[] | null
          cons?: string[] | null
          created_at?: string
          data_freshness_score?: number | null
          discount?: string | null
          expected_price_max?: number | null
          expected_price_min?: number | null
          fuel_types?: string[] | null
          id?: string
          is_bestseller?: boolean | null
          is_discontinued?: boolean | null
          is_hot?: boolean | null
          is_limited?: boolean | null
          is_new?: boolean | null
          is_upcoming?: boolean | null
          key_highlights?: string[] | null
          last_verified_at?: string | null
          launch_date?: string | null
          name?: string
          official_url?: string | null
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
      homepage_content: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_text: string | null
          link_url: string | null
          metadata: Json | null
          section_type: string
          sort_order: number | null
          subtitle: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          metadata?: Json | null
          section_type: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          metadata?: Json | null
          section_type?: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hsrp_bookings: {
        Row: {
          address: string | null
          chassis_number: string | null
          completed_at: string | null
          created_at: string
          email: string
          engine_number: string | null
          home_installation: boolean | null
          home_installation_fee: number | null
          id: string
          mobile: string
          order_id: string | null
          order_status: string
          owner_name: string
          payment_amount: number
          payment_id: string | null
          payment_status: string
          pincode: string
          registration_number: string
          scheduled_date: string | null
          service_price: number
          service_type: string
          state: string
          tracking_id: string | null
          updated_at: string
          user_id: string
          vehicle_class: string
        }
        Insert: {
          address?: string | null
          chassis_number?: string | null
          completed_at?: string | null
          created_at?: string
          email: string
          engine_number?: string | null
          home_installation?: boolean | null
          home_installation_fee?: number | null
          id?: string
          mobile: string
          order_id?: string | null
          order_status?: string
          owner_name: string
          payment_amount: number
          payment_id?: string | null
          payment_status?: string
          pincode: string
          registration_number: string
          scheduled_date?: string | null
          service_price: number
          service_type: string
          state: string
          tracking_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_class: string
        }
        Update: {
          address?: string | null
          chassis_number?: string | null
          completed_at?: string | null
          created_at?: string
          email?: string
          engine_number?: string | null
          home_installation?: boolean | null
          home_installation_fee?: number | null
          id?: string
          mobile?: string
          order_id?: string | null
          order_status?: string
          owner_name?: string
          payment_amount?: number
          payment_id?: string | null
          payment_status?: string
          pincode?: string
          registration_number?: string
          scheduled_date?: string | null
          service_price?: number
          service_type?: string
          state?: string
          tracking_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_class?: string
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
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          lead_id: string
          metadata: Json | null
          outcome: string | null
          performed_by: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          outcome?: string | null
          performed_by?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          outcome?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          budget_max: number | null
          budget_min: number | null
          buying_timeline: string | null
          car_brand: string | null
          car_model: string | null
          car_variant: string | null
          city: string | null
          created_at: string | null
          customer_name: string
          email: string | null
          follow_up_count: number | null
          id: string
          landing_page: string | null
          last_contacted_at: string | null
          lead_type: string
          next_follow_up_at: string | null
          notes: string | null
          phone: string
          priority: string | null
          source: string
          status: string
          tags: string[] | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          buying_timeline?: string | null
          car_brand?: string | null
          car_model?: string | null
          car_variant?: string | null
          city?: string | null
          created_at?: string | null
          customer_name: string
          email?: string | null
          follow_up_count?: number | null
          id?: string
          landing_page?: string | null
          last_contacted_at?: string | null
          lead_type: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone: string
          priority?: string | null
          source: string
          status?: string
          tags?: string[] | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          buying_timeline?: string | null
          car_brand?: string | null
          car_model?: string | null
          car_variant?: string | null
          city?: string | null
          created_at?: string | null
          customer_name?: string
          email?: string | null
          follow_up_count?: number | null
          id?: string
          landing_page?: string | null
          last_contacted_at?: string | null
          lead_type?: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string
          priority?: string | null
          source?: string
          status?: string
          tags?: string[] | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      rental_bookings: {
        Row: {
          created_at: string | null
          daily_rate: number
          driver_license_number: string | null
          dropoff_date: string
          dropoff_location: string
          dropoff_time: string
          id: string
          notes: string | null
          payment_id: string | null
          payment_status: string
          pickup_date: string
          pickup_location: string
          pickup_time: string
          security_deposit: number | null
          status: string
          subtotal: number
          total_amount: number
          total_days: number
          updated_at: string | null
          user_id: string
          vehicle_image: string | null
          vehicle_name: string
          vehicle_type: string
        }
        Insert: {
          created_at?: string | null
          daily_rate: number
          driver_license_number?: string | null
          dropoff_date: string
          dropoff_location: string
          dropoff_time: string
          id?: string
          notes?: string | null
          payment_id?: string | null
          payment_status?: string
          pickup_date: string
          pickup_location: string
          pickup_time: string
          security_deposit?: number | null
          status?: string
          subtotal: number
          total_amount: number
          total_days: number
          updated_at?: string | null
          user_id: string
          vehicle_image?: string | null
          vehicle_name: string
          vehicle_type: string
        }
        Update: {
          created_at?: string | null
          daily_rate?: number
          driver_license_number?: string | null
          dropoff_date?: string
          dropoff_location?: string
          dropoff_time?: string
          id?: string
          notes?: string | null
          payment_id?: string | null
          payment_status?: string
          pickup_date?: string
          pickup_location?: string
          pickup_time?: string
          security_deposit?: number | null
          status?: string
          subtotal?: number
          total_amount?: number
          total_days?: number
          updated_at?: string | null
          user_id?: string
          vehicle_image?: string | null
          vehicle_name?: string
          vehicle_type?: string
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
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "sales" | "dealer" | "finance"
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
      app_role: ["super_admin", "admin", "sales", "dealer", "finance"],
    },
  },
} as const
