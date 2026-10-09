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
      agent_logs: {
        Row: {
          action: string
          agent_name: string
          created_at: string
          details: Json | null
          id: string
          status: string
        }
        Insert: {
          action: string
          agent_name: string
          created_at?: string
          details?: Json | null
          id?: string
          status?: string
        }
        Update: {
          action?: string
          agent_name?: string
          created_at?: string
          details?: Json | null
          id?: string
          status?: string
        }
        Relationships: []
      }
      agent_reports: {
        Row: {
          created_at: string
          id: string
          period_days: number
          scope: string
          sections: Json
          shop_id: string | null
          snapshot: Json
          summary_md: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_days?: number
          scope: string
          sections?: Json
          shop_id?: string | null
          snapshot?: Json
          summary_md: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_days?: number
          scope?: string
          sections?: Json
          shop_id?: string | null
          snapshot?: Json
          summary_md?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_reports_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_status: {
        Row: {
          actions: Json
          agent_name: string
          issues: Json
          last_check: string
          metrics: Json
          status: string
        }
        Insert: {
          actions?: Json
          agent_name: string
          issues?: Json
          last_check?: string
          metrics?: Json
          status?: string
        }
        Update: {
          actions?: Json
          agent_name?: string
          issues?: Json
          last_check?: string
          metrics?: Json
          status?: string
        }
        Relationships: []
      }
      business_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          scope: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          scope: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          scope?: string
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          areas: string | null
          created_at: string
          eta_days: number
          fee_cents: number
          id: string
          is_active: boolean
          name: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          areas?: string | null
          created_at?: string
          eta_days?: number
          fee_cents?: number
          id?: string
          is_active?: boolean
          name: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          areas?: string | null
          created_at?: string
          eta_days?: number
          fee_cents?: number
          id?: string
          is_active?: boolean
          name?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_cents: number
          category: string
          created_at: string
          id: string
          label: string
          spent_on: string
        }
        Insert: {
          amount_cents: number
          category?: string
          created_at?: string
          id?: string
          label: string
          spent_on?: string
        }
        Update: {
          amount_cents?: number
          category?: string
          created_at?: string
          id?: string
          label?: string
          spent_on?: string
        }
        Relationships: []
      }
      hq_job: {
        Row: {
          cron_token: string
          id: number
          last_run: string | null
          locked_until: string | null
        }
        Insert: {
          cron_token?: string
          id?: number
          last_run?: string | null
          locked_until?: string | null
        }
        Update: {
          cron_token?: string
          id?: number
          last_run?: string | null
          locked_until?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          ai_summary: string | null
          budget_cents: number | null
          buyer_id: string | null
          created_at: string
          email: string | null
          id: string
          interest: string
          name: string | null
          order_id: string | null
          phone: string | null
          product_id: string | null
          shop_id: string | null
          source: string
          status: string
          subject: string | null
          type: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          budget_cents?: number | null
          buyer_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interest: string
          name?: string | null
          order_id?: string | null
          phone?: string | null
          product_id?: string | null
          shop_id?: string | null
          source?: string
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          budget_cents?: number | null
          buyer_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interest?: string
          name?: string | null
          order_id?: string | null
          phone?: string | null
          product_id?: string | null
          shop_id?: string | null
          source?: string
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          appeal: string | null
          created_at: string
          dedupe_key: string | null
          evidence: Json | null
          id: string
          reason: string
          risk: string
          status: string
          subject_id: string | null
          subject_type: string
          updated_at: string
        }
        Insert: {
          appeal?: string | null
          created_at?: string
          dedupe_key?: string | null
          evidence?: Json | null
          id?: string
          reason: string
          risk?: string
          status?: string
          subject_id?: string | null
          subject_type: string
          updated_at?: string
        }
        Update: {
          appeal?: string | null
          created_at?: string
          dedupe_key?: string | null
          evidence?: Json | null
          id?: string
          reason?: string
          risk?: string
          status?: string
          subject_id?: string | null
          subject_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          image_url: string | null
          order_id: string
          price_cents: number
          product_id: string | null
          quantity: number
          title: string
        }
        Insert: {
          id?: string
          image_url?: string | null
          order_id: string
          price_cents: number
          product_id?: string | null
          quantity: number
          title: string
        }
        Update: {
          id?: string
          image_url?: string | null
          order_id?: string
          price_cents?: number
          product_id?: string | null
          quantity?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          courier: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          delivery_fee_cents: number
          delivery_zone_id: string | null
          id: string
          notes: string | null
          payment_method: string
          payment_status: string
          shipping_address: string | null
          shipping_city: string | null
          shipping_name: string | null
          shipping_phone: string | null
          shipping_province: string | null
          shop_id: string
          status: Database["public"]["Enums"]["order_status"]
          total_cents: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          courier?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          delivery_fee_cents?: number
          delivery_zone_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_province?: string | null
          shop_id: string
          status?: Database["public"]["Enums"]["order_status"]
          total_cents: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          courier?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          delivery_fee_cents?: number
          delivery_zone_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_province?: string | null
          shop_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_cents?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          price_cents: number
          shop_id: string
          stock: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_cents: number
          shop_id: string
          stock?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_cents?: number
          shop_id?: string
          stock?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          buyer_id: string
          created_at: string
          id: string
          order_id: string | null
          product_id: string
          rating: number
          shop_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          buyer_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          product_id: string
          rating: number
          shop_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          buyer_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string
          rating?: number
          shop_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          banner_url: string | null
          city: string | null
          contact_name: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          id_number: string | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          province: string | null
          slogan: string | null
          slug: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          province?: string | null
          slogan?: string | null
          slug: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          province?: string | null
          slogan?: string | null
          slug?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "seller" | "buyer"
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
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
    Enums: {
      app_role: ["admin", "seller", "buyer"],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
