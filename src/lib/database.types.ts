export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TableNames = 'products' | 'components' | 'recipes' | 'sales_events' | 'sales_items' | 'production_history' | 'component_purchases' | 'dashboard_notes' | 'shopify_order_events';

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          size: string
          current_stock: number
          min_stock_level: number
          lid_color: string
          bottle_type: string
          price: number
          description: string
          shopify_variant_id: string | null
          shopify_sku: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          size: string
          current_stock?: number
          min_stock_level?: number
          lid_color: string
          bottle_type: string
          price?: number
          description?: string
          shopify_variant_id?: string | null
          shopify_sku?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          size?: string
          current_stock?: number
          min_stock_level?: number
          lid_color?: string
          bottle_type?: string
          price?: number
          description?: string
          shopify_variant_id?: string | null
          shopify_sku?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      components: {
        Row: {
          id: string
          category: string
          type: string
          quantity: number
          average_cost: number
          total_value: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category: string
          type: string
          quantity?: number
          average_cost?: number
          total_value?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category?: string
          type?: string
          quantity?: number
          average_cost?: number
          total_value?: number
          created_at?: string
          updated_at?: string
        }
      }
      recipes: {
        Row: {
          id: string
          product_id: string
          ingredients: Json
          original_batch_size: number
          total_recipe_weight: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          ingredients?: Json
          original_batch_size?: number
          total_recipe_weight?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          ingredients?: Json
          original_batch_size?: number
          total_recipe_weight?: number
          created_at?: string
          updated_at?: string
        }
      }
      sales_events: {
        Row: {
          id: string
          event_date: string
          event_name: string
          total_revenue: number
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_date: string
          event_name: string
          total_revenue?: number
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_date?: string
          event_name?: string
          total_revenue?: number
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      sales_items: {
        Row: {
          id: string
          sales_event_id: string
          product_id: string
          product_name: string
          starting_stock: number
          ending_stock: number
          quantity_sold: number
          unit_price: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          sales_event_id: string
          product_id: string
          product_name: string
          starting_stock?: number
          ending_stock?: number
          quantity_sold?: number
          unit_price?: number
          subtotal?: number
          created_at?: string
        }
        Update: {
          id?: string
          sales_event_id?: string
          product_id?: string
          product_name?: string
          starting_stock?: number
          ending_stock?: number
          quantity_sold?: number
          unit_price?: number
          subtotal?: number
          created_at?: string
        }
      }
      production_history: {
        Row: {
          id: string
          production_date: string
          product_id: string
          product_name: string
          quantity_made: number
          components_used: Json
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          production_date: string
          product_id: string
          product_name: string
          quantity_made?: number
          components_used?: Json
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          production_date?: string
          product_id?: string
          product_name?: string
          quantity_made?: number
          components_used?: Json
          notes?: string
          created_at?: string
        }
      }
      component_purchases: {
        Row: {
          id: string
          component_id: string
          purchase_date: string
          quantity: number
          total_paid: number
          cost_per_unit: number
          created_at: string
        }
        Insert: {
          id?: string
          component_id: string
          purchase_date: string
          quantity?: number
          total_paid?: number
          cost_per_unit?: number
          created_at?: string
        }
        Update: {
          id?: string
          component_id?: string
          purchase_date?: string
          quantity?: number
          total_paid?: number
          cost_per_unit?: number
          created_at?: string
        }
      }
      dashboard_notes: {
        Row: {
          id: string
          content: string
          updated_at: string
        }
        Insert: {
          id?: string
          content?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          updated_at?: string
        }
      }
      shopify_order_events: {
        Row: {
          id: string
          shopify_order_id: string
          shopify_webhook_id: string | null
          sales_event_id: string | null
          items_processed: number
          items_unmatched: number
          payload: Json
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shopify_order_id: string
          shopify_webhook_id?: string | null
          sales_event_id?: string | null
          items_processed?: number
          items_unmatched?: number
          payload?: Json
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          shopify_order_id?: string
          shopify_webhook_id?: string | null
          sales_event_id?: string | null
          items_processed?: number
          items_unmatched?: number
          payload?: Json
          processed_at?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Product = Database['public']['Tables']['products']['Row'];
export type Component = Database['public']['Tables']['components']['Row'];
export type Recipe = Database['public']['Tables']['recipes']['Row'];
export type SalesEvent = Database['public']['Tables']['sales_events']['Row'];
export type SalesItem = Database['public']['Tables']['sales_items']['Row'];
export type ProductionHistory = Database['public']['Tables']['production_history']['Row'];
export type ComponentPurchase = Database['public']['Tables']['component_purchases']['Row'];
export type DashboardNotes = Database['public']['Tables']['dashboard_notes']['Row'];
export type ShopifyOrderEvent = Database['public']['Tables']['shopify_order_events']['Row'];

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}
