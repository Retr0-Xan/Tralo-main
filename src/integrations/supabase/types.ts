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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievement_definitions: {
        Row: {
          category: string
          code: string
          color_class: string
          created_at: string
          criteria: Json
          description: string
          icon: string
          id: string
          title: string
        }
        Insert: {
          category: string
          code: string
          color_class: string
          created_at?: string
          criteria: Json
          description: string
          icon: string
          id?: string
          title: string
        }
        Update: {
          category?: string
          code?: string
          color_class?: string
          created_at?: string
          criteria?: Json
          description?: string
          icon?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      business_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_profiles: {
        Row: {
          business_address: string | null
          business_name: string
          business_type: string | null
          community_focus: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          operating_hours: string | null
          owner_name: string
          phone_number: string | null
          qr_code_data: string | null
          qr_code_url: string | null
          quality_commitment: string | null
          registration_number: string | null
          slogan: string | null
          stock_freshness: string | null
          updated_at: string
          user_id: string
          years_founded: string | null
        }
        Insert: {
          business_address?: string | null
          business_name: string
          business_type?: string | null
          community_focus?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          operating_hours?: string | null
          owner_name: string
          phone_number?: string | null
          qr_code_data?: string | null
          qr_code_url?: string | null
          quality_commitment?: string | null
          registration_number?: string | null
          slogan?: string | null
          stock_freshness?: string | null
          updated_at?: string
          user_id: string
          years_founded?: string | null
        }
        Update: {
          business_address?: string | null
          business_name?: string
          business_type?: string | null
          community_focus?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          operating_hours?: string | null
          owner_name?: string
          phone_number?: string | null
          qr_code_data?: string | null
          qr_code_url?: string | null
          quality_commitment?: string | null
          registration_number?: string | null
          slogan?: string | null
          stock_freshness?: string | null
          updated_at?: string
          user_id?: string
          years_founded?: string | null
        }
        Relationships: []
      }
      business_reminders: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_completed: boolean | null
          is_notified: boolean | null
          priority: string | null
          recurring_type: string | null
          reminder_date: string
          reminder_time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_notified?: boolean | null
          priority?: string | null
          recurring_type?: string | null
          reminder_date: string
          reminder_time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_notified?: boolean | null
          priority?: string | null
          recurring_type?: string | null
          reminder_date?: string
          reminder_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_value_ratios: {
        Row: {
          client_count: number
          created_at: string
          date: string
          id: string
          ratio: number
          total_sales_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_count?: number
          created_at?: string
          date: string
          id?: string
          ratio?: number
          total_sales_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_count?: number
          created_at?: string
          date?: string
          id?: string
          ratio?: number
          total_sales_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_purchases: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          customer_phone: string
          id: string
          payment_method: string | null
          product_name: string
          purchase_date: string
          quantity: number
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          customer_phone: string
          id?: string
          payment_method?: string | null
          product_name: string
          purchase_date?: string
          quantity?: number
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          customer_phone?: string
          id?: string
          payment_method?: string | null
          product_name?: string
          purchase_date?: string
          quantity?: number
        }
        Relationships: []
      }
      customer_sales: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          payment_method: string | null
          product_name: string
          quantity: number
          sale_date: string
          sale_id: string | null
          total_amount: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          payment_method?: string | null
          product_name: string
          quantity?: number
          sale_date?: string
          sale_id?: string | null
          total_amount: number
          unit_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          payment_method?: string | null
          product_name?: string
          quantity?: number
          sale_date?: string
          sale_id?: string | null
          total_amount?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          first_purchase_date: string | null
          id: string
          last_purchase_date: string | null
          name: string | null
          phone_number: string | null
          total_purchases: number | null
          total_sales_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_purchase_date?: string | null
          id?: string
          last_purchase_date?: string | null
          name?: string | null
          phone_number?: string | null
          total_purchases?: number | null
          total_sales_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_purchase_date?: string | null
          id?: string
          last_purchase_date?: string | null
          name?: string | null
          phone_number?: string | null
          total_purchases?: number | null
          total_sales_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: Json
          created_at: string
          customer_name: string | null
          document_number: string
          document_type: string
          file_url: string | null
          id: string
          status: string | null
          title: string
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          customer_name?: string | null
          document_number: string
          document_type: string
          file_url?: string | null
          id?: string
          status?: string | null
          title: string
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          customer_name?: string | null
          document_number?: string
          document_type?: string
          file_url?: string | null
          id?: string
          status?: string | null
          title?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string | null
          description: string | null
          expense_date: string
          expense_number: string
          external_receipt_id: string | null
          id: string
          notes: string | null
          payment_method: string | null
          receipt_image_url: string | null
          status: string | null
          updated_at: string
          user_id: string
          vendor_name: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          currency?: string | null
          description?: string | null
          expense_date: string
          expense_number: string
          external_receipt_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_image_url?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          vendor_name: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          expense_date?: string
          expense_number?: string
          external_receipt_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_image_url?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          vendor_name?: string
        }
        Relationships: []
      }
      external_receipts: {
        Row: {
          amount: number
          category: string
          converted_to_expense: boolean | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          notes: string | null
          payment_method: string | null
          receipt_date: string
          receipt_image_url: string | null
          receipt_number: string
          updated_at: string
          user_id: string
          vendor_name: string
        }
        Insert: {
          amount: number
          category: string
          converted_to_expense?: boolean | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_date: string
          receipt_image_url?: string | null
          receipt_number: string
          updated_at?: string
          user_id: string
          vendor_name: string
        }
        Update: {
          amount?: number
          category?: string
          converted_to_expense?: boolean | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_date?: string
          receipt_image_url?: string | null
          receipt_number?: string
          updated_at?: string
          user_id?: string
          vendor_name?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          movement_date: string
          movement_type: string
          notes: string | null
          product_name: string
          quantity: number
          receipt_id: string | null
          sale_id: string | null
          selling_price: number | null
          unit_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          movement_date?: string
          movement_type: string
          notes?: string | null
          product_name: string
          quantity: number
          receipt_id?: string | null
          sale_id?: string | null
          selling_price?: number | null
          unit_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          product_name?: string
          quantity?: number
          receipt_id?: string | null
          sale_id?: string | null
          selling_price?: number | null
          unit_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "inventory_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_receipts: {
        Row: {
          batch_number: string | null
          created_at: string
          expiry_date: string | null
          id: string
          product_name: string
          quantity_received: number
          received_date: string
          supplier_id: string | null
          total_cost: number | null
          unit_cost: number | null
          user_id: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          product_name: string
          quantity_received: number
          received_date?: string
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          user_id: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          product_name?: string
          quantity_received?: number
          received_date?: string
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          new_password: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          new_password: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          new_password?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      product_requests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          priority: string
          product_name: string
          reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          product_name: string
          reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          product_name?: string
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string
          business_type: string
          created_at: string
          email: string
          id: string
          location: string
          owner_name: string
          updated_at: string
        }
        Insert: {
          business_name: string
          business_type: string
          created_at?: string
          email: string
          id: string
          location: string
          owner_name: string
          updated_at?: string
        }
        Update: {
          business_name?: string
          business_type?: string
          created_at?: string
          email?: string
          id?: string
          location?: string
          owner_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      proforma_invoice_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          item_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          item_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          item_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "proforma_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "proforma_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      proforma_invoices: {
        Row: {
          created_at: string
          currency: string | null
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          discount_amount: number | null
          discount_rate: number | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          terms_and_conditions: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number | null
          discount_rate?: number | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms_and_conditions?: string | null
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number | null
          discount_rate?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms_and_conditions?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sale_reversals: {
        Row: {
          created_at: string
          id: string
          original_sale_id: string
          reversal_date: string
          reversal_reason: string | null
          reversal_receipt_number: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_sale_id: string
          reversal_date?: string
          reversal_reason?: string | null
          reversal_receipt_number: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          original_sale_id?: string
          reversal_date?: string
          reversal_reason?: string | null
          reversal_receipt_number?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_goals: {
        Row: {
          created_at: string
          goal_type: string
          id: string
          is_active: boolean
          period_end: string
          period_start: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_type?: string
          id?: string
          is_active?: boolean
          period_end: string
          period_start: string
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_type?: string
          id?: string
          is_active?: boolean
          period_end?: string
          period_start?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_insights: {
        Row: {
          created_at: string
          id: string
          insight_type: string
          is_read: boolean | null
          message: string
          priority: string | null
          product_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insight_type: string
          is_read?: boolean | null
          message: string
          priority?: string | null
          product_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insight_type?: string
          is_read?: boolean | null
          message?: string
          priority?: string | null
          product_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_code: string
          id: string
          progress_data: Json | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_code: string
          id?: string
          progress_data?: Json | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_code?: string
          id?: string
          progress_data?: Json | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_products: {
        Row: {
          created_at: string
          current_stock: number | null
          id: string
          last_sale_date: string | null
          product_name: string
          selling_price: number | null
          total_sales_this_month: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_stock?: number | null
          id?: string
          last_sale_date?: string | null
          product_name: string
          selling_price?: number | null
          total_sales_this_month?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_stock?: number | null
          id?: string
          last_sale_date?: string | null
          product_name?: string
          selling_price?: number | null
          total_sales_this_month?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_trust_scores: {
        Row: {
          created_at: string
          days_active: number | null
          debt_days: number | null
          degradation_factor: number | null
          id: string
          inconsistency_score: number | null
          last_activity_date: string | null
          last_updated: string
          profile_completeness: number | null
          total_achievements: number | null
          total_inventory_updates: number | null
          total_sales: number | null
          trust_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          days_active?: number | null
          debt_days?: number | null
          degradation_factor?: number | null
          id?: string
          inconsistency_score?: number | null
          last_activity_date?: string | null
          last_updated?: string
          profile_completeness?: number | null
          total_achievements?: number | null
          total_inventory_updates?: number | null
          total_sales?: number | null
          trust_score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          days_active?: number | null
          debt_days?: number | null
          degradation_factor?: number | null
          id?: string
          inconsistency_score?: number | null
          last_activity_date?: string | null
          last_updated?: string
          profile_completeness?: number | null
          total_achievements?: number | null
          total_inventory_updates?: number | null
          total_sales?: number | null
          trust_score?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_trust_score: {
        Args: {
          achievements_count: number
          active_days: number
          inventory_count: number
          profile_score: number
          sales_count: number
        }
        Returns: number
      }
      calculate_trust_score_with_degradation: {
        Args: {
          achievements_count: number
          active_days: number
          days_inactive?: number
          debt_days_param?: number
          inconsistency_score?: number
          inventory_count: number
          profile_score: number
          sales_count: number
        }
        Returns: number
      }
      cleanup_expired_reset_tokens: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      detect_business_inconsistencies: {
        Args: { user_uuid: string }
        Returns: number
      }
      generate_business_qr_code: {
        Args: { business_id: string }
        Returns: string
      }
      generate_expense_number: {
        Args: { user_uuid: string }
        Returns: string
      }
      generate_proforma_invoice_number: {
        Args: { user_uuid: string }
        Returns: string
      }
      generate_reversal_receipt_number: {
        Args: { user_uuid: string }
        Returns: string
      }
      update_client_value_ratio: {
        Args: { calc_date?: string; user_uuid: string }
        Returns: undefined
      }
      update_user_trust_score: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      update_user_trust_score_enhanced: {
        Args: { user_uuid: string }
        Returns: undefined
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
