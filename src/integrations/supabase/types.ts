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
          discount_amount: number | null
          discount_applied_by: string | null
          discount_reason: string | null
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
          discount_amount?: number | null
          discount_applied_by?: string | null
          discount_reason?: string | null
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
          discount_amount?: number | null
          discount_applied_by?: string | null
          discount_reason?: string | null
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
      admin_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_otps: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          user_id?: string
          verified?: boolean
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
      ai_blog_posts: {
        Row: {
          ai_model: string | null
          author: string
          category: string
          content: string
          cover_image_description: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          excerpt: string
          id: string
          is_ai_generated: boolean | null
          published_at: string | null
          read_time: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
          views: number | null
        }
        Insert: {
          ai_model?: string | null
          author?: string
          category?: string
          content: string
          cover_image_description?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt: string
          id?: string
          is_ai_generated?: boolean | null
          published_at?: string | null
          read_time?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
          views?: number | null
        }
        Update: {
          ai_model?: string | null
          author?: string
          category?: string
          content?: string
          cover_image_description?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string
          id?: string
          is_ai_generated?: boolean | null
          published_at?: string | null
          read_time?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          views?: number | null
        }
        Relationships: []
      }
      ai_news_cache: {
        Row: {
          author: string | null
          category: string
          created_at: string
          excerpt: string
          expires_at: string | null
          fetched_at: string
          id: string
          image_description: string | null
          image_url: string | null
          is_featured: boolean | null
          published_at: string | null
          read_time: string | null
          source: string | null
          source_url: string | null
          status: string
          tags: string[] | null
          title: string
        }
        Insert: {
          author?: string | null
          category: string
          created_at?: string
          excerpt: string
          expires_at?: string | null
          fetched_at?: string
          id?: string
          image_description?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          published_at?: string | null
          read_time?: string | null
          source?: string | null
          source_url?: string | null
          status?: string
          tags?: string[] | null
          title: string
        }
        Update: {
          author?: string | null
          category?: string
          created_at?: string
          excerpt?: string
          expires_at?: string | null
          fetched_at?: string
          id?: string
          image_description?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          published_at?: string | null
          read_time?: string | null
          source?: string | null
          source_url?: string | null
          status?: string
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      ai_upcoming_cars_cache: {
        Row: {
          brand: string
          created_at: string
          expected_price: string | null
          expires_at: string | null
          fetched_at: string
          highlights: string[] | null
          id: string
          image_description: string | null
          image_url: string | null
          is_featured: boolean | null
          launch_date: string | null
          name: string
          segment: string | null
          status: string
        }
        Insert: {
          brand: string
          created_at?: string
          expected_price?: string | null
          expires_at?: string | null
          fetched_at?: string
          highlights?: string[] | null
          id?: string
          image_description?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          launch_date?: string | null
          name: string
          segment?: string | null
          status?: string
        }
        Update: {
          brand?: string
          created_at?: string
          expected_price?: string | null
          expires_at?: string | null
          fetched_at?: string
          highlights?: string[] | null
          id?: string
          image_description?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          launch_date?: string | null
          name?: string
          segment?: string | null
          status?: string
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
      api_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          partner_id: string | null
          request_body: Json | null
          response_body: Json | null
          response_code: number | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          partner_id?: string | null
          request_body?: Json | null
          response_body?: Json | null
          response_code?: number | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          partner_id?: string | null
          request_body?: Json | null
          response_body?: Json | null
          response_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "api_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      api_partners: {
        Row: {
          allowed_services: string[] | null
          api_key_hash: string | null
          api_secret_hash: string | null
          branding_enabled: boolean | null
          callback_url: string | null
          commission_percentage: number | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          custom_branding: Json | null
          description: string | null
          id: string
          ip_whitelist: string[] | null
          is_active: boolean | null
          logo_url: string | null
          name: string
          notes: string | null
          rate_limit_per_minute: number | null
          slug: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          allowed_services?: string[] | null
          api_key_hash?: string | null
          api_secret_hash?: string | null
          branding_enabled?: boolean | null
          callback_url?: string | null
          commission_percentage?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          custom_branding?: Json | null
          description?: string | null
          id?: string
          ip_whitelist?: string[] | null
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          notes?: string | null
          rate_limit_per_minute?: number | null
          slug: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          allowed_services?: string[] | null
          api_key_hash?: string | null
          api_secret_hash?: string | null
          branding_enabled?: boolean | null
          callback_url?: string | null
          commission_percentage?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          custom_branding?: Json | null
          description?: string | null
          id?: string
          ip_whitelist?: string[] | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          rate_limit_per_minute?: number | null
          slug?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_text: string | null
          link_url: string | null
          mobile_image_url: string | null
          position: string | null
          sort_order: number | null
          start_date: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          mobile_image_url?: string | null
          position?: string | null
          sort_order?: number | null
          start_date?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          mobile_image_url?: string | null
          position?: string | null
          sort_order?: number | null
          start_date?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      broadcast_recipients: {
        Row: {
          broadcast_id: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          phone: string
          read_at: string | null
          replied_at: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          broadcast_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          phone: string
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          broadcast_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          phone?: string
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
      campaign_conversions: {
        Row: {
          attributed_revenue: number | null
          campaign_id: string | null
          conversion_type: string
          conversion_value: number | null
          converted_at: string
          id: string
          lead_id: string | null
        }
        Insert: {
          attributed_revenue?: number | null
          campaign_id?: string | null
          conversion_type: string
          conversion_value?: number | null
          converted_at?: string
          id?: string
          lead_id?: string | null
        }
        Update: {
          attributed_revenue?: number | null
          campaign_id?: string | null
          conversion_type?: string
          conversion_value?: number | null
          converted_at?: string
          id?: string
          lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_conversions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_conversions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      car_brands: {
        Row: {
          country: string
          created_at: string
          id: string
          is_active: boolean | null
          is_luxury: boolean | null
          logo_url: string | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_luxury?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_luxury?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number | null
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
      car_city_pricing: {
        Row: {
          car_id: string
          city: string
          created_at: string
          effective_from: string | null
          effective_till: string | null
          ex_showroom: number
          fastag: number
          handling: number
          id: string
          insurance: number
          is_active: boolean | null
          on_road_price: number
          other_charges: number
          registration: number
          rto: number
          state: string
          tcs: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          car_id: string
          city: string
          created_at?: string
          effective_from?: string | null
          effective_till?: string | null
          ex_showroom: number
          fastag?: number
          handling?: number
          id?: string
          insurance?: number
          is_active?: boolean | null
          on_road_price: number
          other_charges?: number
          registration?: number
          rto?: number
          state: string
          tcs?: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          car_id?: string
          city?: string
          created_at?: string
          effective_from?: string | null
          effective_till?: string | null
          ex_showroom?: number
          fastag?: number
          handling?: number
          id?: string
          insurance?: number
          is_active?: boolean | null
          on_road_price?: number
          other_charges?: number
          registration?: number
          rto?: number
          state?: string
          tcs?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "car_city_pricing_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_city_pricing_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "car_variants"
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
          image_source: string | null
          image_sync_status: string | null
          image_synced_at: string | null
          image_url: string | null
          name: string
          sort_order: number | null
        }
        Insert: {
          car_id: string
          created_at?: string
          hex_code: string
          id?: string
          image_source?: string | null
          image_sync_status?: string | null
          image_synced_at?: string | null
          image_url?: string | null
          name: string
          sort_order?: number | null
        }
        Update: {
          car_id?: string
          created_at?: string
          hex_code?: string
          id?: string
          image_source?: string | null
          image_sync_status?: string | null
          image_synced_at?: string | null
          image_url?: string | null
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
      car_loan_leads: {
        Row: {
          age: number | null
          assigned_to: string | null
          buying_timeline: string | null
          city: string | null
          created_at: string
          credit_check_provider: string | null
          credit_check_response: Json | null
          credit_score: number | null
          down_payment: number | null
          eligibility_status: string | null
          employment_type: string | null
          existing_emi: number | null
          id: string
          lead_priority: string | null
          lead_score: number | null
          loan_amount_requested: number | null
          max_emi_capacity: number | null
          max_loan_eligible: number | null
          monthly_income: number | null
          name: string | null
          notes: string | null
          otp_verified_at: string | null
          pan_number: string | null
          phone: string
          preferred_car: string | null
          source: string | null
          status: string | null
          tenure_months: number | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp_alert_sent: boolean | null
        }
        Insert: {
          age?: number | null
          assigned_to?: string | null
          buying_timeline?: string | null
          city?: string | null
          created_at?: string
          credit_check_provider?: string | null
          credit_check_response?: Json | null
          credit_score?: number | null
          down_payment?: number | null
          eligibility_status?: string | null
          employment_type?: string | null
          existing_emi?: number | null
          id?: string
          lead_priority?: string | null
          lead_score?: number | null
          loan_amount_requested?: number | null
          max_emi_capacity?: number | null
          max_loan_eligible?: number | null
          monthly_income?: number | null
          name?: string | null
          notes?: string | null
          otp_verified_at?: string | null
          pan_number?: string | null
          phone: string
          preferred_car?: string | null
          source?: string | null
          status?: string | null
          tenure_months?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_alert_sent?: boolean | null
        }
        Update: {
          age?: number | null
          assigned_to?: string | null
          buying_timeline?: string | null
          city?: string | null
          created_at?: string
          credit_check_provider?: string | null
          credit_check_response?: Json | null
          credit_score?: number | null
          down_payment?: number | null
          eligibility_status?: string | null
          employment_type?: string | null
          existing_emi?: number | null
          id?: string
          lead_priority?: string | null
          lead_score?: number | null
          loan_amount_requested?: number | null
          max_emi_capacity?: number | null
          max_loan_eligible?: number | null
          monthly_income?: number | null
          name?: string | null
          notes?: string | null
          otp_verified_at?: string | null
          pan_number?: string | null
          phone?: string
          preferred_car?: string | null
          source?: string | null
          status?: string | null
          tenure_months?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_alert_sent?: boolean | null
        }
        Relationships: []
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
          images_synced: boolean | null
          images_synced_at: string | null
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
          images_synced?: boolean | null
          images_synced_at?: string | null
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
          images_synced?: boolean | null
          images_synced_at?: string | null
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
      client_interactions: {
        Row: {
          client_id: string
          created_at: string
          details: Json | null
          id: string
          interaction_type: string
          performed_by: string | null
          summary: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          details?: Json | null
          id?: string
          interaction_type: string
          performed_by?: string | null
          summary?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          interaction_type?: string
          performed_by?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          address: string | null
          assigned_to: string | null
          car_brand: string | null
          car_model: string | null
          car_variant: string | null
          chassis_number: string | null
          city: string | null
          created_at: string
          customer_name: string
          date_of_birth: string | null
          delivery_date: string | null
          email: string | null
          external_portal: string | null
          external_portal_id: string | null
          external_portal_url: string | null
          id: string
          insurance_expiry: string | null
          insurance_policy_number: string | null
          insurance_premium: number | null
          insurance_provider: string | null
          insurebook_ref_id: string | null
          last_interaction_at: string | null
          lifecycle_stage: string
          lifetime_value: number | null
          next_follow_up_at: string | null
          notes: string | null
          phone: string
          purchase_date: string | null
          satisfaction_score: number | null
          source: string | null
          state: string | null
          tags: string[] | null
          total_spend: number | null
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          car_brand?: string | null
          car_model?: string | null
          car_variant?: string | null
          chassis_number?: string | null
          city?: string | null
          created_at?: string
          customer_name: string
          date_of_birth?: string | null
          delivery_date?: string | null
          email?: string | null
          external_portal?: string | null
          external_portal_id?: string | null
          external_portal_url?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_premium?: number | null
          insurance_provider?: string | null
          insurebook_ref_id?: string | null
          last_interaction_at?: string | null
          lifecycle_stage?: string
          lifetime_value?: number | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone: string
          purchase_date?: string | null
          satisfaction_score?: number | null
          source?: string | null
          state?: string | null
          tags?: string[] | null
          total_spend?: number | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          car_brand?: string | null
          car_model?: string | null
          car_variant?: string | null
          chassis_number?: string | null
          city?: string | null
          created_at?: string
          customer_name?: string
          date_of_birth?: string | null
          delivery_date?: string | null
          email?: string | null
          external_portal?: string | null
          external_portal_id?: string | null
          external_portal_url?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_premium?: number | null
          insurance_provider?: string | null
          insurebook_ref_id?: string | null
          last_interaction_at?: string | null
          lifecycle_stage?: string
          lifetime_value?: number | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string
          purchase_date?: string | null
          satisfaction_score?: number | null
          source?: string | null
          state?: string | null
          tags?: string[] | null
          total_spend?: number | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: []
      }
      corporate_clients: {
        Row: {
          company_name: string
          created_at: string
          id: string
          industry: string | null
          is_active: boolean | null
          logo_url: string
          sort_order: number | null
          website_url: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          industry?: string | null
          is_active?: boolean | null
          logo_url: string
          sort_order?: number | null
          website_url?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          industry?: string | null
          is_active?: boolean | null
          logo_url?: string
          sort_order?: number | null
          website_url?: string | null
        }
        Relationships: []
      }
      cross_sell_analytics: {
        Row: {
          bundle_id: string | null
          created_at: string
          event_type: string
          id: string
          item_id: string | null
          metadata: Json | null
          page_url: string | null
          rule_id: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          bundle_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          item_id?: string | null
          metadata?: Json | null
          page_url?: string | null
          rule_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          bundle_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          item_id?: string | null
          metadata?: Json | null
          page_url?: string | null
          rule_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_sell_analytics_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "cross_sell_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_sell_analytics_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cross_sell_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_sell_analytics_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "cross_sell_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_sell_bundle_items: {
        Row: {
          bundle_id: string
          id: string
          individual_price: number | null
          is_optional: boolean | null
          item_description: string | null
          item_name: string
          item_type: string
          sort_order: number | null
        }
        Insert: {
          bundle_id: string
          id?: string
          individual_price?: number | null
          is_optional?: boolean | null
          item_description?: string | null
          item_name: string
          item_type: string
          sort_order?: number | null
        }
        Update: {
          bundle_id?: string
          id?: string
          individual_price?: number | null
          is_optional?: boolean | null
          item_description?: string | null
          item_name?: string
          item_type?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_sell_bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "cross_sell_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_sell_bundles: {
        Row: {
          applicable_brands: string[] | null
          applicable_segments: string[] | null
          bundle_price: number | null
          bundle_type: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          savings_text: string | null
          total_value: number | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_brands?: string[] | null
          applicable_segments?: string[] | null
          bundle_price?: number | null
          bundle_type: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          savings_text?: string | null
          total_value?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_brands?: string[] | null
          applicable_segments?: string[] | null
          bundle_price?: number | null
          bundle_type?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          savings_text?: string | null
          total_value?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      cross_sell_items: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_text: string | null
          description: string | null
          discount_text: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          item_id: string | null
          item_type: string
          offer_price: number | null
          original_price: number | null
          rule_id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          discount_text?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          item_id?: string | null
          item_type: string
          offer_price?: number | null
          original_price?: number | null
          rule_id: string
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          discount_text?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          item_id?: string | null
          item_type?: string
          offer_price?: number | null
          original_price?: number | null
          rule_id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_sell_items_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "cross_sell_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_sell_rules: {
        Row: {
          conditions: Json | null
          created_at: string
          description: string | null
          display_location: string
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          start_date: string | null
          trigger_type: string
          trigger_value: string | null
          updated_at: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          description?: string | null
          display_location: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          start_date?: string | null
          trigger_type: string
          trigger_value?: string | null
          updated_at?: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          description?: string | null
          display_location?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          start_date?: string | null
          trigger_type?: string
          trigger_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_journey_triggers: {
        Row: {
          converted_at: string | null
          created_at: string | null
          customer_id: string
          id: string
          metadata: Json | null
          recommendation: string
          sent_at: string | null
          status: string | null
          trigger_event: string
          trigger_type: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          metadata?: Json | null
          recommendation: string
          sent_at?: string | null
          status?: string | null
          trigger_event: string
          trigger_type: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          metadata?: Json | null
          recommendation?: string
          sent_at?: string | null
          status?: string | null
          trigger_event?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_journey_triggers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "unified_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_stories: {
        Row: {
          car_brand: string | null
          car_name: string
          created_at: string
          customer_name: string
          delivery_date: string | null
          id: string
          image_url: string
          is_active: boolean | null
          location: string | null
          sort_order: number | null
          testimonial: string | null
        }
        Insert: {
          car_brand?: string | null
          car_name: string
          created_at?: string
          customer_name: string
          delivery_date?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          location?: string | null
          sort_order?: number | null
          testimonial?: string | null
        }
        Update: {
          car_brand?: string | null
          car_name?: string
          created_at?: string
          customer_name?: string
          delivery_date?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          location?: string | null
          sort_order?: number | null
          testimonial?: string | null
        }
        Relationships: []
      }
      delivery_stories: {
        Row: {
          buyer_type: string | null
          car_brand: string
          car_model: string
          created_at: string
          customer_name: string
          delivery_date: string | null
          highlight: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_visible: boolean | null
          journey_steps: string[] | null
          location: string
          rating: number | null
          savings: string | null
          sort_order: number | null
          testimonial: string | null
          updated_at: string
          video_url: string | null
          wait_time: string | null
        }
        Insert: {
          buyer_type?: string | null
          car_brand: string
          car_model: string
          created_at?: string
          customer_name: string
          delivery_date?: string | null
          highlight?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_visible?: boolean | null
          journey_steps?: string[] | null
          location: string
          rating?: number | null
          savings?: string | null
          sort_order?: number | null
          testimonial?: string | null
          updated_at?: string
          video_url?: string | null
          wait_time?: string | null
        }
        Update: {
          buyer_type?: string | null
          car_brand?: string
          car_model?: string
          created_at?: string
          customer_name?: string
          delivery_date?: string | null
          highlight?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_visible?: boolean | null
          journey_steps?: string[] | null
          location?: string
          rating?: number | null
          savings?: string | null
          sort_order?: number | null
          testimonial?: string | null
          updated_at?: string
          video_url?: string | null
          wait_time?: string | null
        }
        Relationships: []
      }
      discount_presets: {
        Row: {
          applicable_to: string[] | null
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          applicable_to?: string[] | null
          created_at?: string
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          applicable_to?: string[] | null
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_bookings: {
        Row: {
          api_partner_id: string | null
          api_reference_id: string | null
          base_amount: number
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          discount_amount: number | null
          discount_reason: string | null
          distance_km: number | null
          driver_assigned_at: string | null
          driver_charges: number | null
          driver_name: string | null
          driver_phone: string | null
          dropoff_address: string | null
          dropoff_date: string | null
          dropoff_time: string | null
          duration_days: number | null
          extra_km_charges: number | null
          id: string
          night_charges: number | null
          payment_id: string | null
          payment_status: string | null
          pickup_address: string
          pickup_date: string
          pickup_time: string
          service_type: string
          source: string | null
          special_instructions: string | null
          status: string | null
          taxes: number | null
          toll_charges: number | null
          total_amount: number
          trip_type: string | null
          updated_at: string | null
          user_id: string | null
          vehicle_id: string | null
          vehicle_name: string | null
        }
        Insert: {
          api_partner_id?: string | null
          api_reference_id?: string | null
          base_amount: number
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          discount_amount?: number | null
          discount_reason?: string | null
          distance_km?: number | null
          driver_assigned_at?: string | null
          driver_charges?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          dropoff_address?: string | null
          dropoff_date?: string | null
          dropoff_time?: string | null
          duration_days?: number | null
          extra_km_charges?: number | null
          id?: string
          night_charges?: number | null
          payment_id?: string | null
          payment_status?: string | null
          pickup_address: string
          pickup_date: string
          pickup_time: string
          service_type?: string
          source?: string | null
          special_instructions?: string | null
          status?: string | null
          taxes?: number | null
          toll_charges?: number | null
          total_amount: number
          trip_type?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          vehicle_name?: string | null
        }
        Update: {
          api_partner_id?: string | null
          api_reference_id?: string | null
          base_amount?: number
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          discount_amount?: number | null
          discount_reason?: string | null
          distance_km?: number | null
          driver_assigned_at?: string | null
          driver_charges?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          dropoff_address?: string | null
          dropoff_date?: string | null
          dropoff_time?: string | null
          duration_days?: number | null
          extra_km_charges?: number | null
          id?: string
          night_charges?: number | null
          payment_id?: string | null
          payment_status?: string | null
          pickup_address?: string
          pickup_date?: string
          pickup_time?: string
          service_type?: string
          source?: string | null
          special_instructions?: string | null
          status?: string | null
          taxes?: number | null
          toll_charges?: number | null
          total_amount?: number
          trip_type?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          vehicle_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "rental_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          click_count: number | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          failed_count: number | null
          html_content: string | null
          id: string
          name: string
          open_count: number | null
          scheduled_at: string | null
          segment_filter: Json | null
          sent_count: number | null
          started_at: string | null
          status: string
          subject: string
          template_id: string | null
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          click_count?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number | null
          html_content?: string | null
          id?: string
          name: string
          open_count?: number | null
          scheduled_at?: string | null
          segment_filter?: Json | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          click_count?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number | null
          html_content?: string | null
          id?: string
          name?: string
          open_count?: number | null
          scheduled_at?: string | null
          segment_filter?: Json | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          recipient_name: string | null
          resend_id: string | null
          sent_at: string | null
          sequence_id: string | null
          status: string
          subject: string
          template_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          subject: string
          template_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          conditions: Json | null
          created_at: string
          delay_days: number
          delay_hours: number
          id: string
          is_active: boolean | null
          sequence_id: string
          step_order: number
          template_id: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          delay_days?: number
          delay_hours?: number
          id?: string
          is_active?: boolean | null
          sequence_id: string
          step_order?: number
          template_id: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          delay_days?: number
          delay_hours?: number
          id?: string
          is_active?: boolean | null
          sequence_id?: string
          step_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_event: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_event?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_event?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_subscribers: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          lead_id: string | null
          name: string | null
          phone: string | null
          preferences: Json | null
          source: string | null
          subscribed: boolean | null
          tags: string[] | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          lead_id?: string | null
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          source?: string | null
          subscribed?: boolean | null
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          lead_id?: string | null
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          source?: string | null
          subscribed?: boolean | null
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string
          created_at: string
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_type: string
          text_content: string | null
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          category?: string
          created_at?: string
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_type?: string
          text_content?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_type?: string
          text_content?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          question: string
          sort_order: number | null
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          question: string
          sort_order?: number | null
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          question?: string
          sort_order?: number | null
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
      finance_partners: {
        Row: {
          created_at: string
          id: string
          interest_rate_from: number | null
          interest_rate_to: number | null
          is_active: boolean | null
          logo_url: string | null
          max_tenure_months: number | null
          name: string
          processing_fee: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          interest_rate_from?: number | null
          interest_rate_to?: number | null
          is_active?: boolean | null
          logo_url?: string | null
          max_tenure_months?: number | null
          name: string
          processing_fee?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          interest_rate_from?: number | null
          interest_rate_to?: number | null
          is_active?: boolean | null
          logo_url?: string | null
          max_tenure_months?: number | null
          name?: string
          processing_fee?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      follow_up_reminders: {
        Row: {
          assigned_to: string | null
          auto_send: boolean | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          lead_id: string | null
          notes: string | null
          reminder_type: string
          scheduled_at: string
          status: string
        }
        Insert: {
          assigned_to?: string | null
          auto_send?: boolean | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          reminder_type: string
          scheduled_at: string
          status?: string
        }
        Update: {
          assigned_to?: string | null
          auto_send?: boolean | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          reminder_type?: string
          scheduled_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      google_reviews: {
        Row: {
          author_name: string
          author_photo: string | null
          car_purchased: string | null
          created_at: string
          has_response: boolean | null
          id: string
          is_local_guide: boolean | null
          is_visible: boolean | null
          rating: number
          relative_time: string | null
          response_text: string | null
          review_date: string | null
          review_text: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          author_name: string
          author_photo?: string | null
          car_purchased?: string | null
          created_at?: string
          has_response?: boolean | null
          id?: string
          is_local_guide?: boolean | null
          is_visible?: boolean | null
          rating?: number
          relative_time?: string | null
          response_text?: string | null
          review_date?: string | null
          review_text: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          author_name?: string
          author_photo?: string | null
          car_purchased?: string | null
          created_at?: string
          has_response?: boolean | null
          id?: string
          is_local_guide?: boolean | null
          is_visible?: boolean | null
          rating?: number
          relative_time?: string | null
          response_text?: string | null
          review_date?: string | null
          review_text?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          brand: string | null
          created_at: string
          cta_label: string | null
          cta_link: string | null
          cta_secondary_label: string | null
          cta_secondary_link: string | null
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          launch_date: string | null
          price_range: string | null
          sort_order: number | null
          spec_1_label: string | null
          spec_1_value: string | null
          spec_2_label: string | null
          spec_2_value: string | null
          spec_3_label: string | null
          spec_3_value: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          cta_secondary_label?: string | null
          cta_secondary_link?: string | null
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          launch_date?: string | null
          price_range?: string | null
          sort_order?: number | null
          spec_1_label?: string | null
          spec_1_value?: string | null
          spec_2_label?: string | null
          spec_2_value?: string | null
          spec_3_label?: string | null
          spec_3_value?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          cta_secondary_label?: string | null
          cta_secondary_link?: string | null
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          launch_date?: string | null
          price_range?: string | null
          sort_order?: number | null
          spec_1_label?: string | null
          spec_1_value?: string | null
          spec_2_label?: string | null
          spec_2_value?: string | null
          spec_3_label?: string | null
          spec_3_value?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_banners: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_text: string | null
          display_from: string | null
          display_until: string | null
          id: string
          image_url: string
          is_active: boolean | null
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_from?: string | null
          display_until?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_from?: string | null
          display_until?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string
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
      homepage_sections: {
        Row: {
          background_color: string | null
          background_image: string | null
          content: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          section_type: string
          settings: Json | null
          sort_order: number | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          background_image?: string | null
          content?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_type: string
          settings?: Json | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          background_image?: string | null
          content?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_type?: string
          settings?: Json | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hsrp_bookings: {
        Row: {
          address: string | null
          chassis_number: string | null
          completed_at: string | null
          created_at: string
          discount_amount: number | null
          discount_applied_by: string | null
          discount_reason: string | null
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
          discount_amount?: number | null
          discount_applied_by?: string | null
          discount_reason?: string | null
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
          discount_amount?: number | null
          discount_applied_by?: string | null
          discount_reason?: string | null
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
      hsrp_service_banners: {
        Row: {
          animation_type: string | null
          badge_color: string | null
          badge_text: string | null
          created_at: string
          cta_text: string | null
          description: string | null
          features: string[] | null
          gradient_from: string | null
          gradient_to: string | null
          icon_type: string | null
          id: string
          is_active: boolean | null
          price_key: string
          service_type: string
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string
          vehicle_class: string
        }
        Insert: {
          animation_type?: string | null
          badge_color?: string | null
          badge_text?: string | null
          created_at?: string
          cta_text?: string | null
          description?: string | null
          features?: string[] | null
          gradient_from?: string | null
          gradient_to?: string | null
          icon_type?: string | null
          id?: string
          is_active?: boolean | null
          price_key: string
          service_type?: string
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string
          vehicle_class: string
        }
        Update: {
          animation_type?: string | null
          badge_color?: string | null
          badge_text?: string | null
          created_at?: string
          cta_text?: string | null
          description?: string | null
          features?: string[] | null
          gradient_from?: string | null
          gradient_to?: string | null
          icon_type?: string | null
          id?: string
          is_active?: boolean | null
          price_key?: string
          service_type?: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string
          vehicle_class?: string
        }
        Relationships: []
      }
      indian_cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          is_metro: boolean | null
          name: string
          rto_code: string | null
          rto_percentage_override: number | null
          sort_order: number | null
          state_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_metro?: boolean | null
          name: string
          rto_code?: string | null
          rto_percentage_override?: number | null
          sort_order?: number | null
          state_code: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_metro?: boolean | null
          name?: string
          rto_code?: string | null
          rto_percentage_override?: number | null
          sort_order?: number | null
          state_code?: string
        }
        Relationships: []
      }
      indian_states: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          road_tax_percentage: number | null
          rto_percentage: number | null
          sort_order: number | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          road_tax_percentage?: number | null
          rto_percentage?: number | null
          sort_order?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          road_tax_percentage?: number | null
          rto_percentage?: number | null
          sort_order?: number | null
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
      insurance_activity_log: {
        Row: {
          activity_type: string
          client_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          performed_by: string | null
          policy_id: string | null
          title: string
        }
        Insert: {
          activity_type: string
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          policy_id?: string | null
          title: string
        }
        Update: {
          activity_type?: string
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          policy_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "insurance_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_activity_log_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_addons: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          tag: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          tag?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          tag?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      insurance_advisors: {
        Row: {
          cities: string[] | null
          conversion_rate: number | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          max_daily_leads: number | null
          name: string
          phone: string | null
          renewal_rate: number | null
          specialization: string[] | null
          total_commission_earned: number | null
          total_leads_assigned: number | null
          total_policies_sold: number | null
          total_premium_collected: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cities?: string[] | null
          conversion_rate?: number | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          max_daily_leads?: number | null
          name: string
          phone?: string | null
          renewal_rate?: number | null
          specialization?: string[] | null
          total_commission_earned?: number | null
          total_leads_assigned?: number | null
          total_policies_sold?: number | null
          total_premium_collected?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cities?: string[] | null
          conversion_rate?: number | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          max_daily_leads?: number | null
          name?: string
          phone?: string | null
          renewal_rate?: number | null
          specialization?: string[] | null
          total_commission_earned?: number | null
          total_leads_assigned?: number | null
          total_policies_sold?: number | null
          total_premium_collected?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      insurance_claims: {
        Row: {
          approved_amount: number | null
          claim_amount: number | null
          claim_number: string | null
          claim_type: string | null
          client_id: string
          created_at: string
          documents: string[] | null
          garage_contact: string | null
          garage_name: string | null
          id: string
          incident_date: string | null
          incident_description: string | null
          notes: string | null
          policy_id: string | null
          settlement_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          claim_amount?: number | null
          claim_number?: string | null
          claim_type?: string | null
          client_id: string
          created_at?: string
          documents?: string[] | null
          garage_contact?: string | null
          garage_name?: string | null
          id?: string
          incident_date?: string | null
          incident_description?: string | null
          notes?: string | null
          policy_id?: string | null
          settlement_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          claim_amount?: number | null
          claim_number?: string | null
          claim_type?: string | null
          client_id?: string
          created_at?: string
          documents?: string[] | null
          garage_contact?: string | null
          garage_name?: string | null
          id?: string
          incident_date?: string | null
          incident_description?: string | null
          notes?: string | null
          policy_id?: string | null
          settlement_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "insurance_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_clients: {
        Row: {
          advisor_name: string | null
          anniversary_date: string | null
          assigned_advisor_id: string | null
          chassis_number: string | null
          city: string | null
          created_at: string
          current_insurer: string | null
          current_policy_number: string | null
          current_policy_type: string | null
          current_premium: number | null
          customer_name: string | null
          date_of_birth: string | null
          email: string | null
          engine_number: string | null
          fitness_expiry: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          is_otp_verified: boolean | null
          last_contacted_at: string | null
          lead_source: string | null
          lead_status: string | null
          national_permit_expiry: string | null
          ncb_percentage: number | null
          notes: string | null
          original_lead_id: string | null
          phone: string
          pincode: string | null
          policy_expiry_date: string | null
          policy_start_date: string | null
          priority: string | null
          puc_expiry: string | null
          rc_expiry: string | null
          relationship: string | null
          rto_tax_expiry: string | null
          state: string | null
          state_permit_expiry: string | null
          tags: string[] | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          vehicle_fuel_type: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_number: string | null
          vehicle_registration_date: string | null
          vehicle_variant: string | null
          vehicle_year: number | null
          whatsapp_opted_in: boolean | null
        }
        Insert: {
          advisor_name?: string | null
          anniversary_date?: string | null
          assigned_advisor_id?: string | null
          chassis_number?: string | null
          city?: string | null
          created_at?: string
          current_insurer?: string | null
          current_policy_number?: string | null
          current_policy_type?: string | null
          current_premium?: number | null
          customer_name?: string | null
          date_of_birth?: string | null
          email?: string | null
          engine_number?: string | null
          fitness_expiry?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_otp_verified?: boolean | null
          last_contacted_at?: string | null
          lead_source?: string | null
          lead_status?: string | null
          national_permit_expiry?: string | null
          ncb_percentage?: number | null
          notes?: string | null
          original_lead_id?: string | null
          phone: string
          pincode?: string | null
          policy_expiry_date?: string | null
          policy_start_date?: string | null
          priority?: string | null
          puc_expiry?: string | null
          rc_expiry?: string | null
          relationship?: string | null
          rto_tax_expiry?: string | null
          state?: string | null
          state_permit_expiry?: string | null
          tags?: string[] | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vehicle_fuel_type?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_number?: string | null
          vehicle_registration_date?: string | null
          vehicle_variant?: string | null
          vehicle_year?: number | null
          whatsapp_opted_in?: boolean | null
        }
        Update: {
          advisor_name?: string | null
          anniversary_date?: string | null
          assigned_advisor_id?: string | null
          chassis_number?: string | null
          city?: string | null
          created_at?: string
          current_insurer?: string | null
          current_policy_number?: string | null
          current_policy_type?: string | null
          current_premium?: number | null
          customer_name?: string | null
          date_of_birth?: string | null
          email?: string | null
          engine_number?: string | null
          fitness_expiry?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_otp_verified?: boolean | null
          last_contacted_at?: string | null
          lead_source?: string | null
          lead_status?: string | null
          national_permit_expiry?: string | null
          ncb_percentage?: number | null
          notes?: string | null
          original_lead_id?: string | null
          phone?: string
          pincode?: string | null
          policy_expiry_date?: string | null
          policy_start_date?: string | null
          priority?: string | null
          puc_expiry?: string | null
          rc_expiry?: string | null
          relationship?: string | null
          rto_tax_expiry?: string | null
          state?: string | null
          state_permit_expiry?: string | null
          tags?: string[] | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vehicle_fuel_type?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_number?: string | null
          vehicle_registration_date?: string | null
          vehicle_variant?: string | null
          vehicle_year?: number | null
          whatsapp_opted_in?: boolean | null
        }
        Relationships: []
      }
      insurance_commissions: {
        Row: {
          advisor_id: string | null
          advisor_name: string | null
          bonus_amount: number | null
          client_id: string
          commission_amount: number | null
          commission_percentage: number | null
          commission_type: string | null
          created_at: string
          id: string
          insurer: string | null
          paid_date: string | null
          payment_reference: string | null
          policy_id: string
          premium_amount: number | null
          status: string | null
          total_earned: number | null
          updated_at: string
        }
        Insert: {
          advisor_id?: string | null
          advisor_name?: string | null
          bonus_amount?: number | null
          client_id: string
          commission_amount?: number | null
          commission_percentage?: number | null
          commission_type?: string | null
          created_at?: string
          id?: string
          insurer?: string | null
          paid_date?: string | null
          payment_reference?: string | null
          policy_id: string
          premium_amount?: number | null
          status?: string | null
          total_earned?: number | null
          updated_at?: string
        }
        Update: {
          advisor_id?: string | null
          advisor_name?: string | null
          bonus_amount?: number | null
          client_id?: string
          commission_amount?: number | null
          commission_percentage?: number | null
          commission_type?: string | null
          created_at?: string
          id?: string
          insurer?: string | null
          paid_date?: string | null
          payment_reference?: string | null
          policy_id?: string
          premium_amount?: number | null
          status?: string | null
          total_earned?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "insurance_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_commissions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_content: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          section_data: Json
          section_key: string
          section_title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_data?: Json
          section_key: string
          section_title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_data?: Json
          section_key?: string
          section_title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      insurance_documents: {
        Row: {
          client_id: string
          created_at: string
          document_name: string
          document_type: string
          file_size: string | null
          file_url: string
          id: string
          notes: string | null
          policy_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          document_name: string
          document_type: string
          file_size?: string | null
          file_url: string
          id?: string
          notes?: string | null
          policy_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          document_name?: string
          document_type?: string
          file_size?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          policy_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "insurance_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_documents_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_active: boolean | null
          question: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          question: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          question?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      insurance_leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          current_insurer: string | null
          customer_name: string | null
          email: string | null
          id: string
          notes: string | null
          ownership_type: string | null
          phone: string
          policy_expiry: string | null
          policy_type: string | null
          source: string | null
          status: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_number: string | null
          vehicle_year: number | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          current_insurer?: string | null
          customer_name?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          ownership_type?: string | null
          phone: string
          policy_expiry?: string | null
          policy_type?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_number?: string | null
          vehicle_year?: number | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          current_insurer?: string | null
          customer_name?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          ownership_type?: string | null
          phone?: string
          policy_expiry?: string | null
          policy_type?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_number?: string | null
          vehicle_year?: number | null
        }
        Relationships: []
      }
      insurance_page_content: {
        Row: {
          content: Json
          id: string
          is_active: boolean | null
          section_key: string
          sort_order: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          id?: string
          is_active?: boolean | null
          section_key: string
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          id?: string
          is_active?: boolean | null
          section_key?: string
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      insurance_partners: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string
          name: string
          sort_order: number | null
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url: string
          name: string
          sort_order?: number | null
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string
          name?: string
          sort_order?: number | null
          website_url?: string | null
        }
        Relationships: []
      }
      insurance_plans: {
        Row: {
          cashless_garages: string | null
          claim_settlement_ratio: string | null
          created_at: string
          features: string[] | null
          id: string
          idv: string | null
          insurer_name: string
          is_active: boolean | null
          is_popular: boolean | null
          logo_url: string | null
          plan_type: string
          premium_display: string
          premium_value: number
          rating: number | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          cashless_garages?: string | null
          claim_settlement_ratio?: string | null
          created_at?: string
          features?: string[] | null
          id?: string
          idv?: string | null
          insurer_name: string
          is_active?: boolean | null
          is_popular?: boolean | null
          logo_url?: string | null
          plan_type?: string
          premium_display: string
          premium_value?: number
          rating?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          cashless_garages?: string | null
          claim_settlement_ratio?: string | null
          created_at?: string
          features?: string[] | null
          id?: string
          idv?: string | null
          insurer_name?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          logo_url?: string | null
          plan_type?: string
          premium_display?: string
          premium_value?: number
          rating?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      insurance_policies: {
        Row: {
          addon_premium: number | null
          addons: string[] | null
          client_id: string
          created_at: string
          expiry_date: string
          gst_amount: number | null
          id: string
          idv: number | null
          insurer: string
          is_renewal: boolean | null
          issued_date: string | null
          ncb_discount: number | null
          net_premium: number | null
          payment_mode: string | null
          payment_reference: string | null
          plan_name: string | null
          policy_document_url: string | null
          policy_number: string | null
          policy_type: string
          premium_amount: number | null
          previous_policy_id: string | null
          renewal_status: string | null
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          addon_premium?: number | null
          addons?: string[] | null
          client_id: string
          created_at?: string
          expiry_date: string
          gst_amount?: number | null
          id?: string
          idv?: number | null
          insurer: string
          is_renewal?: boolean | null
          issued_date?: string | null
          ncb_discount?: number | null
          net_premium?: number | null
          payment_mode?: string | null
          payment_reference?: string | null
          plan_name?: string | null
          policy_document_url?: string | null
          policy_number?: string | null
          policy_type: string
          premium_amount?: number | null
          previous_policy_id?: string | null
          renewal_status?: string | null
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          addon_premium?: number | null
          addons?: string[] | null
          client_id?: string
          created_at?: string
          expiry_date?: string
          gst_amount?: number | null
          id?: string
          idv?: number | null
          insurer?: string
          is_renewal?: boolean | null
          issued_date?: string | null
          ncb_discount?: number | null
          net_premium?: number | null
          payment_mode?: string | null
          payment_reference?: string | null
          plan_name?: string | null
          policy_document_url?: string | null
          policy_number?: string | null
          policy_type?: string
          premium_amount?: number | null
          previous_policy_id?: string | null
          renewal_status?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "insurance_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_previous_policy_id_fkey"
            columns: ["previous_policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_prospect_activity: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          performed_by: string | null
          prospect_id: string
          title: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          prospect_id: string
          title: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          prospect_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_prospect_activity_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "insurance_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_prospects: {
        Row: {
          assigned_to: string | null
          batch_id: string | null
          call_count: number | null
          city: string | null
          converted_at: string | null
          converted_by: string | null
          converted_to_lead_id: string | null
          created_at: string
          customer_name: string | null
          data_source: string
          duplicate_of_client_id: string | null
          email: string | null
          expiry_date: string | null
          id: string
          insurer: string | null
          is_grabyourcar_customer: boolean | null
          last_contacted_at: string | null
          next_callback_at: string | null
          notes: string | null
          phone: string
          policy_type: string | null
          premium_amount: number | null
          prospect_status: string
          source_file: string | null
          state: string | null
          tags: string[] | null
          updated_at: string
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_number: string | null
        }
        Insert: {
          assigned_to?: string | null
          batch_id?: string | null
          call_count?: number | null
          city?: string | null
          converted_at?: string | null
          converted_by?: string | null
          converted_to_lead_id?: string | null
          created_at?: string
          customer_name?: string | null
          data_source?: string
          duplicate_of_client_id?: string | null
          email?: string | null
          expiry_date?: string | null
          id?: string
          insurer?: string | null
          is_grabyourcar_customer?: boolean | null
          last_contacted_at?: string | null
          next_callback_at?: string | null
          notes?: string | null
          phone: string
          policy_type?: string | null
          premium_amount?: number | null
          prospect_status?: string
          source_file?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_number?: string | null
        }
        Update: {
          assigned_to?: string | null
          batch_id?: string | null
          call_count?: number | null
          city?: string | null
          converted_at?: string | null
          converted_by?: string | null
          converted_to_lead_id?: string | null
          created_at?: string
          customer_name?: string | null
          data_source?: string
          duplicate_of_client_id?: string | null
          email?: string | null
          expiry_date?: string | null
          id?: string
          insurer?: string | null
          is_grabyourcar_customer?: boolean | null
          last_contacted_at?: string | null
          next_callback_at?: string | null
          notes?: string | null
          phone?: string
          policy_type?: string | null
          premium_amount?: number | null
          prospect_status?: string
          source_file?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_number?: string | null
        }
        Relationships: []
      }
      insurance_renewal_tracking: {
        Row: {
          advisor_alert_sent_at: string | null
          advisor_alerted: boolean | null
          client_id: string
          created_at: string
          days_until_expiry: number | null
          expiry_date: string
          id: string
          last_recovery_at: string | null
          lost_reason: string | null
          outcome: string | null
          policy_id: string
          recovery_attempts: number | null
          reminder_1_sent: boolean | null
          reminder_1_sent_at: string | null
          reminder_15_sent: boolean | null
          reminder_15_sent_at: string | null
          reminder_30_sent: boolean | null
          reminder_30_sent_at: string | null
          reminder_60_sent: boolean | null
          reminder_60_sent_at: string | null
          reminder_7_sent: boolean | null
          reminder_7_sent_at: string | null
          renewed_policy_id: string | null
          requote_generated: boolean | null
          requote_insurer: string | null
          requote_premium: number | null
          requote_sent_at: string | null
          updated_at: string
        }
        Insert: {
          advisor_alert_sent_at?: string | null
          advisor_alerted?: boolean | null
          client_id: string
          created_at?: string
          days_until_expiry?: number | null
          expiry_date: string
          id?: string
          last_recovery_at?: string | null
          lost_reason?: string | null
          outcome?: string | null
          policy_id: string
          recovery_attempts?: number | null
          reminder_1_sent?: boolean | null
          reminder_1_sent_at?: string | null
          reminder_15_sent?: boolean | null
          reminder_15_sent_at?: string | null
          reminder_30_sent?: boolean | null
          reminder_30_sent_at?: string | null
          reminder_60_sent?: boolean | null
          reminder_60_sent_at?: string | null
          reminder_7_sent?: boolean | null
          reminder_7_sent_at?: string | null
          renewed_policy_id?: string | null
          requote_generated?: boolean | null
          requote_insurer?: string | null
          requote_premium?: number | null
          requote_sent_at?: string | null
          updated_at?: string
        }
        Update: {
          advisor_alert_sent_at?: string | null
          advisor_alerted?: boolean | null
          client_id?: string
          created_at?: string
          days_until_expiry?: number | null
          expiry_date?: string
          id?: string
          last_recovery_at?: string | null
          lost_reason?: string | null
          outcome?: string | null
          policy_id?: string
          recovery_attempts?: number | null
          reminder_1_sent?: boolean | null
          reminder_1_sent_at?: string | null
          reminder_15_sent?: boolean | null
          reminder_15_sent_at?: string | null
          reminder_30_sent?: boolean | null
          reminder_30_sent_at?: string | null
          reminder_60_sent?: boolean | null
          reminder_60_sent_at?: string | null
          reminder_7_sent?: boolean | null
          reminder_7_sent_at?: string | null
          renewed_policy_id?: string | null
          requote_generated?: boolean | null
          requote_insurer?: string | null
          requote_premium?: number | null
          requote_sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_renewal_tracking_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "insurance_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_renewal_tracking_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_scraped_data: {
        Row: {
          content_type: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          scraped_at: string
          scraped_content: Json
          source_name: string | null
          source_url: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          scraped_at?: string
          scraped_content?: Json
          source_name?: string | null
          source_url: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          scraped_at?: string
          scraped_content?: Json
          source_name?: string | null
          source_url?: string
        }
        Relationships: []
      }
      insurance_tasks: {
        Row: {
          assigned_name: string | null
          assigned_to: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_automated: boolean | null
          policy_id: string | null
          priority: string | null
          status: string | null
          task_type: string
          title: string
          trigger_event: string | null
          updated_at: string
        }
        Insert: {
          assigned_name?: string | null
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_automated?: boolean | null
          policy_id?: string | null
          priority?: string | null
          status?: string | null
          task_type: string
          title: string
          trigger_event?: string | null
          updated_at?: string
        }
        Update: {
          assigned_name?: string | null
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_automated?: boolean | null
          policy_id?: string | null
          priority?: string | null
          status?: string | null
          task_type?: string
          title?: string
          trigger_event?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "insurance_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_tasks_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_automations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          total_completed: number | null
          total_converted: number | null
          total_enrolled: number | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          total_completed?: number | null
          total_converted?: number | null
          total_enrolled?: number | null
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          total_completed?: number | null
          total_converted?: number | null
          total_enrolled?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      journey_enrollments: {
        Row: {
          completed_at: string | null
          current_step_id: string | null
          enrolled_at: string
          id: string
          journey_id: string | null
          lead_id: string | null
          metadata: Json | null
          next_action_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          current_step_id?: string | null
          enrolled_at?: string
          id?: string
          journey_id?: string | null
          lead_id?: string | null
          metadata?: Json | null
          next_action_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          current_step_id?: string | null
          enrolled_at?: string
          id?: string
          journey_id?: string | null
          lead_id?: string | null
          metadata?: Json | null
          next_action_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_enrollments_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "journey_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_enrollments_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journey_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_steps: {
        Row: {
          condition_rules: Json | null
          created_at: string
          delay_days: number | null
          delay_hours: number | null
          delay_minutes: number | null
          id: string
          is_active: boolean | null
          journey_id: string | null
          step_config: Json
          step_order: number
          step_type: string
          template_id: string | null
        }
        Insert: {
          condition_rules?: Json | null
          created_at?: string
          delay_days?: number | null
          delay_hours?: number | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          journey_id?: string | null
          step_config?: Json
          step_order: number
          step_type: string
          template_id?: string | null
        }
        Update: {
          condition_rules?: Json | null
          created_at?: string
          delay_days?: number | null
          delay_hours?: number | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          journey_id?: string | null
          step_config?: Json
          step_order?: number
          step_type?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_steps_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journey_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_source: string | null
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          lead_id: string
          metadata: Json | null
          outcome: string | null
          performed_by: string | null
          score_impact: number | null
        }
        Insert: {
          activity_source?: string | null
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          outcome?: string | null
          performed_by?: string | null
          score_impact?: number | null
        }
        Update: {
          activity_source?: string | null
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          outcome?: string | null
          performed_by?: string | null
          score_impact?: number | null
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
      lead_imports: {
        Row: {
          completed_at: string | null
          created_at: string
          errors: Json | null
          failed: number | null
          field_mapping: Json | null
          file_name: string | null
          id: string
          import_type: string
          imported: number | null
          imported_by: string | null
          skipped: number | null
          source_name: string | null
          status: string
          total_rows: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          failed?: number | null
          field_mapping?: Json | null
          file_name?: string | null
          id?: string
          import_type: string
          imported?: number | null
          imported_by?: string | null
          skipped?: number | null
          source_name?: string | null
          status?: string
          total_rows?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          failed?: number | null
          field_mapping?: Json | null
          file_name?: string | null
          id?: string
          import_type?: string
          imported?: number | null
          imported_by?: string | null
          skipped?: number | null
          source_name?: string | null
          status?: string
          total_rows?: number | null
        }
        Relationships: []
      }
      lead_scores: {
        Row: {
          created_at: string
          email_clicks: number | null
          email_opens: number | null
          engagement_level: string | null
          form_submissions: number | null
          id: string
          last_activity_at: string | null
          lead_id: string | null
          page_views: number | null
          score: number | null
          score_breakdown: Json | null
          updated_at: string
          whatsapp_replies: number | null
        }
        Insert: {
          created_at?: string
          email_clicks?: number | null
          email_opens?: number | null
          engagement_level?: string | null
          form_submissions?: number | null
          id?: string
          last_activity_at?: string | null
          lead_id?: string | null
          page_views?: number | null
          score?: number | null
          score_breakdown?: Json | null
          updated_at?: string
          whatsapp_replies?: number | null
        }
        Update: {
          created_at?: string
          email_clicks?: number | null
          email_opens?: number | null
          engagement_level?: string | null
          form_submissions?: number | null
          id?: string
          last_activity_at?: string | null
          lead_id?: string | null
          page_views?: number | null
          score?: number | null
          score_breakdown?: Json | null
          updated_at?: string
          whatsapp_replies?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_scores_lead_id_fkey"
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
          service_category: string | null
          source: string
          status: string
          tags: string[] | null
          team_assigned: string | null
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
          service_category?: string | null
          source: string
          status?: string
          tags?: string[] | null
          team_assigned?: string | null
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
          service_category?: string | null
          source?: string
          status?: string
          tags?: string[] | null
          team_assigned?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      loan_page_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      loan_partners: {
        Row: {
          apply_url: string | null
          created_at: string
          features: string[] | null
          highlight: string | null
          id: string
          interest_rate_max: number
          interest_rate_min: number
          is_active: boolean | null
          logo_url: string | null
          max_amount: number | null
          max_tenure_years: number | null
          name: string
          partner_type: string | null
          processing_fee: string | null
          rating: number | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          apply_url?: string | null
          created_at?: string
          features?: string[] | null
          highlight?: string | null
          id?: string
          interest_rate_max?: number
          interest_rate_min?: number
          is_active?: boolean | null
          logo_url?: string | null
          max_amount?: number | null
          max_tenure_years?: number | null
          name: string
          partner_type?: string | null
          processing_fee?: string | null
          rating?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          apply_url?: string | null
          created_at?: string
          features?: string[] | null
          highlight?: string | null
          id?: string
          interest_rate_max?: number
          interest_rate_min?: number
          is_active?: boolean | null
          logo_url?: string | null
          max_amount?: number | null
          max_tenure_years?: number | null
          name?: string
          partner_type?: string | null
          processing_fee?: string | null
          rating?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_alerts: {
        Row: {
          alert_type: string
          conditions: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          notification_channels: Json | null
        }
        Insert: {
          alert_type: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notification_channels?: Json | null
        }
        Update: {
          alert_type?: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notification_channels?: Json | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          ab_test_enabled: boolean | null
          ab_test_variants: Json | null
          campaign_type: string
          click_count: number | null
          conversion_count: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          open_count: number | null
          sent_count: number | null
          start_date: string | null
          status: string | null
          target_segment: Json | null
          total_recipients: number | null
          updated_at: string
          winning_variant: string | null
        }
        Insert: {
          ab_test_enabled?: boolean | null
          ab_test_variants?: Json | null
          campaign_type: string
          click_count?: number | null
          conversion_count?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          open_count?: number | null
          sent_count?: number | null
          start_date?: string | null
          status?: string | null
          target_segment?: Json | null
          total_recipients?: number | null
          updated_at?: string
          winning_variant?: string | null
        }
        Update: {
          ab_test_enabled?: boolean | null
          ab_test_variants?: Json | null
          campaign_type?: string
          click_count?: number | null
          conversion_count?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          open_count?: number | null
          sent_count?: number | null
          start_date?: string | null
          status?: string | null
          target_segment?: Json | null
          total_recipients?: number | null
          updated_at?: string
          winning_variant?: string | null
        }
        Relationships: []
      }
      messaging_providers: {
        Row: {
          config: Json | null
          created_at: string | null
          daily_limit: number | null
          id: string
          is_active: boolean | null
          name: string
          provider_type: string
          rate_limit_per_second: number | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          provider_type?: string
          rate_limit_per_second?: number | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          provider_type?: string
          rate_limit_per_second?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      navigation_menu: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          is_external: boolean | null
          menu_location: string
          parent_id: string | null
          sort_order: number | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_external?: boolean | null
          menu_location: string
          parent_id?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_external?: boolean | null
          menu_location?: string
          parent_id?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_menu_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation_menu"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rental_bookings: {
        Row: {
          created_at: string | null
          daily_rate: number
          discount_amount: number | null
          discount_applied_by: string | null
          discount_reason: string | null
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
          discount_amount?: number | null
          discount_applied_by?: string | null
          discount_reason?: string | null
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
          discount_amount?: number | null
          discount_applied_by?: string | null
          discount_reason?: string | null
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
      rental_services: {
        Row: {
          base_price: number | null
          created_at: string | null
          description: string | null
          features: Json | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          price_unit: string | null
          slug: string
          sort_order: number | null
          terms: string | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_unit?: string | null
          slug: string
          sort_order?: number | null
          terms?: string | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_unit?: string | null
          slug?: string
          sort_order?: number | null
          terms?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rental_vehicles: {
        Row: {
          brand: string
          color: string | null
          created_at: string | null
          features: Json | null
          fuel_type: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_available: boolean | null
          location: string | null
          name: string
          registration_number: string | null
          rent_outstation_per_km: number | null
          rent_self_drive: number | null
          rent_with_driver: number | null
          seats: number | null
          transmission: string | null
          updated_at: string | null
          vehicle_type: string
          year: number | null
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string | null
          features?: Json | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          location?: string | null
          name: string
          registration_number?: string | null
          rent_outstation_per_km?: number | null
          rent_self_drive?: number | null
          rent_with_driver?: number | null
          seats?: number | null
          transmission?: string | null
          updated_at?: string | null
          vehicle_type: string
          year?: number | null
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string | null
          features?: Json | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          location?: string | null
          name?: string
          registration_number?: string | null
          rent_outstation_per_km?: number | null
          rent_self_drive?: number | null
          rent_with_driver?: number | null
          seats?: number | null
          transmission?: string | null
          updated_at?: string | null
          vehicle_type?: string
          year?: number | null
        }
        Relationships: []
      }
      road_tax_rule_history: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          rule_id: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          rule_id?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "road_tax_rule_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "road_tax_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      road_tax_rules: {
        Row: {
          additional_cess: number
          city: string | null
          created_at: string
          created_by: string | null
          effective_from: string
          effective_till: string | null
          ev_exemption: boolean
          fastag_fee: number
          flat_charge: number
          fuel_type: string
          green_tax: number
          handling_charges: number
          hsrp_fee: number
          hypothecation_fee: number
          id: string
          insurance_percentage: number
          is_active: boolean
          luxury_surcharge: number
          notes: string | null
          ownership_type: string
          price_max: number | null
          price_min: number
          priority: number
          registration_fee: number
          state_code: string
          state_name: string
          tax_percentage: number
          temp_reg_fee: number
          updated_at: string
          version: number
        }
        Insert: {
          additional_cess?: number
          city?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_till?: string | null
          ev_exemption?: boolean
          fastag_fee?: number
          flat_charge?: number
          fuel_type?: string
          green_tax?: number
          handling_charges?: number
          hsrp_fee?: number
          hypothecation_fee?: number
          id?: string
          insurance_percentage?: number
          is_active?: boolean
          luxury_surcharge?: number
          notes?: string | null
          ownership_type?: string
          price_max?: number | null
          price_min?: number
          priority?: number
          registration_fee?: number
          state_code: string
          state_name: string
          tax_percentage?: number
          temp_reg_fee?: number
          updated_at?: string
          version?: number
        }
        Update: {
          additional_cess?: number
          city?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_till?: string | null
          ev_exemption?: boolean
          fastag_fee?: number
          flat_charge?: number
          fuel_type?: string
          green_tax?: number
          handling_charges?: number
          hsrp_fee?: number
          hypothecation_fee?: number
          id?: string
          insurance_percentage?: number
          is_active?: boolean
          luxury_surcharge?: number
          notes?: string | null
          ownership_type?: string
          price_max?: number | null
          price_min?: number
          priority?: number
          registration_fee?: number
          state_code?: string
          state_name?: string
          tax_percentage?: number
          temp_reg_fee?: number
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          frequency: string
          id: string
          last_sent_at: string | null
          next_scheduled_at: string | null
          recipients: string[]
          report_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          frequency: string
          id?: string
          last_sent_at?: string | null
          next_scheduled_at?: string | null
          recipients?: string[]
          report_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          last_sent_at?: string | null
          next_scheduled_at?: string | null
          recipients?: string[]
          report_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_pages: {
        Row: {
          content: Json | null
          created_at: string
          hero_image: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          is_active: boolean | null
          meta_description: string | null
          meta_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          hero_image?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          hero_image?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_pricing: {
        Row: {
          base_price: number
          category: string
          created_at: string
          description: string | null
          discount_amount: number | null
          features: Json | null
          final_price: number | null
          gst_rate: number | null
          id: string
          is_active: boolean | null
          name: string
          service_type: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          base_price: number
          category: string
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          features?: Json | null
          final_price?: number | null
          gst_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          service_type: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          features?: Json | null
          final_price?: number | null
          gst_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          service_type?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          field_type: string | null
          id: string
          is_public: boolean | null
          label: string | null
          setting_key: string
          setting_value: Json
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          field_type?: string | null
          id?: string
          is_public?: boolean | null
          label?: string | null
          setting_key: string
          setting_value: Json
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          field_type?: string | null
          id?: string
          is_public?: boolean | null
          label?: string | null
          setting_key?: string
          setting_value?: Json
          sort_order?: number | null
          updated_at?: string
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
      testimonials: {
        Row: {
          car_purchased: string | null
          created_at: string
          customer_image: string | null
          customer_location: string | null
          customer_name: string
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          rating: number | null
          sort_order: number | null
          testimonial_text: string
          video_url: string | null
        }
        Insert: {
          car_purchased?: string | null
          created_at?: string
          customer_image?: string | null
          customer_location?: string | null
          customer_name: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          rating?: number | null
          sort_order?: number | null
          testimonial_text: string
          video_url?: string | null
        }
        Update: {
          car_purchased?: string | null
          created_at?: string
          customer_image?: string | null
          customer_location?: string | null
          customer_name?: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          rating?: number | null
          sort_order?: number | null
          testimonial_text?: string
          video_url?: string | null
        }
        Relationships: []
      }
      unified_activity_timeline: {
        Row: {
          activity_type: string
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          metadata: Json | null
          source_id: string | null
          source_table: string | null
          title: string
          vertical: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string | null
          source_table?: string | null
          title: string
          vertical: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string | null
          source_table?: string | null
          title?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_activity_timeline_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "unified_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_customers: {
        Row: {
          assigned_advisor: string | null
          auth_user_id: string | null
          city: string | null
          created_at: string | null
          customer_name: string | null
          email: string | null
          engagement_score: number | null
          first_source: string | null
          has_accessory_order: boolean | null
          has_booking: boolean | null
          has_car_inquiry: boolean | null
          has_insurance: boolean | null
          has_loan_inquiry: boolean | null
          id: string
          last_activity_at: string | null
          last_activity_type: string | null
          latest_source: string | null
          lifetime_value: number | null
          notes: string | null
          otp_verified: boolean | null
          otp_verified_at: string | null
          phone: string
          state: string | null
          tags: string[] | null
          total_interactions: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_advisor?: string | null
          auth_user_id?: string | null
          city?: string | null
          created_at?: string | null
          customer_name?: string | null
          email?: string | null
          engagement_score?: number | null
          first_source?: string | null
          has_accessory_order?: boolean | null
          has_booking?: boolean | null
          has_car_inquiry?: boolean | null
          has_insurance?: boolean | null
          has_loan_inquiry?: boolean | null
          id?: string
          last_activity_at?: string | null
          last_activity_type?: string | null
          latest_source?: string | null
          lifetime_value?: number | null
          notes?: string | null
          otp_verified?: boolean | null
          otp_verified_at?: string | null
          phone: string
          state?: string | null
          tags?: string[] | null
          total_interactions?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_advisor?: string | null
          auth_user_id?: string | null
          city?: string | null
          created_at?: string | null
          customer_name?: string | null
          email?: string | null
          engagement_score?: number | null
          first_source?: string | null
          has_accessory_order?: boolean | null
          has_booking?: boolean | null
          has_car_inquiry?: boolean | null
          has_insurance?: boolean | null
          has_loan_inquiry?: boolean | null
          id?: string
          last_activity_at?: string | null
          last_activity_type?: string | null
          latest_source?: string | null
          lifetime_value?: number | null
          notes?: string | null
          otp_verified?: boolean | null
          otp_verified_at?: string | null
          phone?: string
          state?: string | null
          tags?: string[] | null
          total_interactions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vehicle_body_types: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      vehicle_brands: {
        Row: {
          country: string | null
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_fuel_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      vehicle_price_ranges: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          label: string
          max_price: number | null
          min_price: number
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          label: string
          max_price?: number | null
          min_price?: number
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          label?: string
          max_price?: number | null
          min_price?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      vehicle_transmissions: {
        Row: {
          created_at: string
          description: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      wa_automation_log: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string | null
          message_id: string | null
          phone: string
          rule_id: string | null
          status: string | null
          suppression_reason: string | null
          trigger_data: Json | null
          trigger_event: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message_id?: string | null
          phone: string
          rule_id?: string | null
          status?: string | null
          suppression_reason?: string | null
          trigger_data?: Json | null
          trigger_event: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message_id?: string | null
          phone?: string
          rule_id?: string | null
          status?: string | null
          suppression_reason?: string | null
          trigger_data?: Json | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_automation_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_automation_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "wa_message_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_automation_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "wa_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_automation_rules: {
        Row: {
          cooldown_hours: number | null
          created_at: string | null
          created_by: string | null
          delay_minutes: number | null
          description: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          max_sends_per_lead: number | null
          message_content: string | null
          name: string
          template_id: string | null
          total_sent: number | null
          total_suppressed: number | null
          total_triggered: number | null
          trigger_conditions: Json | null
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          cooldown_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          max_sends_per_lead?: number | null
          message_content?: string | null
          name: string
          template_id?: string | null
          total_sent?: number | null
          total_suppressed?: number | null
          total_triggered?: number | null
          trigger_conditions?: Json | null
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          cooldown_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          max_sends_per_lead?: number | null
          message_content?: string | null
          name?: string
          template_id?: string | null
          total_sent?: number | null
          total_suppressed?: number | null
          total_triggered?: number | null
          trigger_conditions?: Json | null
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_automation_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_campaign_analytics: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          date: string
          delivered: number | null
          failed: number | null
          id: string
          leads_generated: number | null
          opted_out: number | null
          read_count: number | null
          replied: number | null
          sent: number | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          date?: string
          delivered?: number | null
          failed?: number | null
          id?: string
          leads_generated?: number | null
          opted_out?: number | null
          read_count?: number | null
          replied?: number | null
          sent?: number | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          date?: string
          delivered?: number | null
          failed?: number | null
          id?: string
          leads_generated?: number | null
          opted_out?: number | null
          read_count?: number | null
          replied?: number | null
          sent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "wa_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_campaigns: {
        Row: {
          batch_delay_ms: number | null
          batch_size: number | null
          campaign_type: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          estimated_recipients: number | null
          id: string
          media_type: string | null
          media_url: string | null
          message_content: string | null
          name: string
          paused_at: string | null
          scheduled_at: string | null
          segment_rules: Json | null
          send_window_end: string | null
          send_window_start: string | null
          started_at: string | null
          status: string
          tags: string[] | null
          template_id: string | null
          timezone: string | null
          total_delivered: number | null
          total_failed: number | null
          total_opted_out: number | null
          total_queued: number | null
          total_read: number | null
          total_replied: number | null
          total_sent: number | null
          updated_at: string | null
        }
        Insert: {
          batch_delay_ms?: number | null
          batch_size?: number | null
          campaign_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_recipients?: number | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_content?: string | null
          name: string
          paused_at?: string | null
          scheduled_at?: string | null
          segment_rules?: Json | null
          send_window_end?: string | null
          send_window_start?: string | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          template_id?: string | null
          timezone?: string | null
          total_delivered?: number | null
          total_failed?: number | null
          total_opted_out?: number | null
          total_queued?: number | null
          total_read?: number | null
          total_replied?: number | null
          total_sent?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_delay_ms?: number | null
          batch_size?: number | null
          campaign_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_recipients?: number | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_content?: string | null
          name?: string
          paused_at?: string | null
          scheduled_at?: string | null
          segment_rules?: Json | null
          send_window_end?: string | null
          send_window_start?: string | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          template_id?: string | null
          timezone?: string | null
          total_delivered?: number | null
          total_failed?: number | null
          total_opted_out?: number | null
          total_queued?: number | null
          total_read?: number | null
          total_replied?: number | null
          total_sent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_contact_segments: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          estimated_count: number | null
          id: string
          is_dynamic: boolean | null
          name: string
          rules: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_count?: number | null
          id?: string
          is_dynamic?: boolean | null
          name: string
          rules?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_count?: number | null
          id?: string
          is_dynamic?: boolean | null
          name?: string
          rules?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wa_event_triggers: {
        Row: {
          conditions: Json | null
          cooldown_hours: number | null
          created_at: string
          delay_seconds: number
          event_name: string
          id: string
          is_active: boolean
          max_sends_per_lead: number | null
          priority: number
          template_id: string | null
          updated_at: string
          variable_mapping: Json | null
        }
        Insert: {
          conditions?: Json | null
          cooldown_hours?: number | null
          created_at?: string
          delay_seconds?: number
          event_name: string
          id?: string
          is_active?: boolean
          max_sends_per_lead?: number | null
          priority?: number
          template_id?: string | null
          updated_at?: string
          variable_mapping?: Json | null
        }
        Update: {
          conditions?: Json | null
          cooldown_hours?: number | null
          created_at?: string
          delay_seconds?: number
          event_name?: string
          id?: string
          is_active?: boolean
          max_sends_per_lead?: number | null
          priority?: number
          template_id?: string | null
          updated_at?: string
          variable_mapping?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_event_triggers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "wa_template_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_message_logs: {
        Row: {
          campaign_id: string | null
          created_at: string
          customer_name: string | null
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          lead_id: string | null
          message_content: string | null
          message_type: string
          phone: string
          provider: string
          provider_message_id: string | null
          read_at: string | null
          replied_at: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          template_name: string | null
          trigger_event: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          customer_name?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          lead_id?: string | null
          message_content?: string | null
          message_type?: string
          phone: string
          provider?: string
          provider_message_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          trigger_event?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          customer_name?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          lead_id?: string | null
          message_content?: string | null
          message_type?: string
          phone?: string
          provider?: string
          provider_message_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          trigger_event?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_message_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_message_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "wa_template_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_message_queue: {
        Row: {
          attempts: number | null
          automation_rule_id: string | null
          campaign_id: string | null
          created_at: string | null
          delivered_at: string | null
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          lead_id: string | null
          max_attempts: number | null
          media_type: string | null
          media_url: string | null
          message_content: string
          next_retry_at: string | null
          phone: string
          priority: number | null
          provider_message_id: string | null
          read_at: string | null
          replied_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          updated_at: string | null
          variables_data: Json | null
        }
        Insert: {
          attempts?: number | null
          automation_rule_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          lead_id?: string | null
          max_attempts?: number | null
          media_type?: string | null
          media_url?: string | null
          message_content: string
          next_retry_at?: string | null
          phone: string
          priority?: number | null
          provider_message_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string | null
          variables_data?: Json | null
        }
        Update: {
          attempts?: number | null
          automation_rule_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          lead_id?: string | null
          max_attempts?: number | null
          media_type?: string | null
          media_url?: string | null
          message_content?: string
          next_retry_at?: string | null
          phone?: string
          priority?: number | null
          provider_message_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string | null
          variables_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_message_queue_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "wa_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_message_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "wa_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_message_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_opt_outs: {
        Row: {
          id: string
          opted_out_at: string | null
          phone: string
          reason: string | null
          source: string | null
        }
        Insert: {
          id?: string
          opted_out_at?: string | null
          phone: string
          reason?: string | null
          source?: string | null
        }
        Update: {
          id?: string
          opted_out_at?: string | null
          phone?: string
          reason?: string | null
          source?: string | null
        }
        Relationships: []
      }
      wa_provider_config: {
        Row: {
          auth_type: string
          base_url: string
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          provider_name: string
          updated_at: string
        }
        Insert: {
          auth_type?: string
          base_url?: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          provider_name?: string
          updated_at?: string
        }
        Update: {
          auth_type?: string
          base_url?: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          provider_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      wa_template_catalog: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          language: string
          provider: string
          sample_body: string | null
          template_id: string | null
          template_name: string
          trigger_conditions: Json | null
          trigger_event: string | null
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          language?: string
          provider?: string
          sample_body?: string | null
          template_id?: string | null
          template_name: string
          trigger_conditions?: Json | null
          trigger_event?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          language?: string
          provider?: string
          sample_body?: string | null
          template_id?: string | null
          template_name?: string
          trigger_conditions?: Json | null
          trigger_event?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      whatsapp_broadcasts: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          delivered_count: number | null
          failed_count: number | null
          id: string
          message_content: string | null
          name: string
          read_count: number | null
          reply_count: number | null
          scheduled_at: string | null
          segment_filters: Json | null
          sent_count: number | null
          started_at: string | null
          status: string | null
          target_segment: Json | null
          template_id: string | null
          total_recipients: number | null
          updated_at: string
          variables_data: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          message_content?: string | null
          name: string
          read_count?: number | null
          reply_count?: number | null
          scheduled_at?: string | null
          segment_filters?: Json | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          target_segment?: Json | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
          variables_data?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          message_content?: string | null
          name?: string
          read_count?: number | null
          reply_count?: number | null
          scheduled_at?: string | null
          segment_filters?: Json | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          target_segment?: Json | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
          variables_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcasts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          created_at: string
          customer_name: string | null
          id: string
          last_message_at: string | null
          messages: Json | null
          phone_number: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          id?: string
          last_message_at?: string | null
          messages?: Json | null
          phone_number: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          id?: string
          last_message_at?: string | null
          messages?: Json | null
          phone_number?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_otps: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          phone: string
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          approval_status: string | null
          category: string
          content: string
          created_at: string | null
          created_by: string | null
          example_data: Json | null
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          language: string | null
          name: string
          preview: string | null
          template_type: string
          updated_at: string | null
          updated_by: string | null
          use_cases: string[] | null
          variables: string[] | null
          wbiztool_template_id: string | null
        }
        Insert: {
          approval_status?: string | null
          category: string
          content: string
          created_at?: string | null
          created_by?: string | null
          example_data?: Json | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          language?: string | null
          name: string
          preview?: string | null
          template_type: string
          updated_at?: string | null
          updated_by?: string | null
          use_cases?: string[] | null
          variables?: string[] | null
          wbiztool_template_id?: string | null
        }
        Update: {
          approval_status?: string | null
          category?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          example_data?: Json | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          language?: string | null
          name?: string
          preview?: string | null
          template_type?: string
          updated_at?: string | null
          updated_by?: string | null
          use_cases?: string[] | null
          variables?: string[] | null
          wbiztool_template_id?: string | null
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
      app_role:
        | "super_admin"
        | "admin"
        | "sales"
        | "dealer"
        | "finance"
        | "insurance"
        | "marketing"
        | "calling"
        | "operations"
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
      app_role: [
        "super_admin",
        "admin",
        "sales",
        "dealer",
        "finance",
        "insurance",
        "marketing",
        "calling",
        "operations",
      ],
    },
  },
} as const
