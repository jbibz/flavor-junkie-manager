/*
  # Flavor Junkie CRM Database Schema

  Creates all core tables for the Flavor Junkie inventory and sales management app.

  1. New Tables
    - `products` - Finished seasoning products with stock, pricing, and component details
    - `components` - Raw materials inventory (lids, bottles, labels)
    - `recipes` - Per-product ingredient lists with weights in grams
    - `sales_events` - Sales event records with revenue totals
    - `sales_items` - Individual product line items within a sales event
    - `production_history` - Batch production records
    - `component_purchases` - Purchase history for component restocking
    - `dashboard_notes` - Free-text notes for the dashboard

  2. Security
    - RLS enabled on all tables
    - Public access policies (single-user internal app, no authentication required)

  3. Indexes
    - Performance indexes on all frequently queried foreign keys and dates
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size text NOT NULL,
  current_stock integer NOT NULL DEFAULT 0,
  min_stock_level integer NOT NULL DEFAULT 10,
  lid_color text NOT NULL,
  bottle_type text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  description text DEFAULT '',
  shopify_variant_id text,
  shopify_sku text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_shopify_variant_id_unique
  ON products(shopify_variant_id)
  WHERE shopify_variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_shopify_sku_lower
  ON products(lower(shopify_sku))
  WHERE shopify_sku IS NOT NULL;

CREATE TABLE IF NOT EXISTS components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  type text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  average_cost numeric(10,2) NOT NULL DEFAULT 0,
  total_value numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category, type)
);

CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  original_batch_size integer NOT NULL DEFAULT 1,
  total_recipe_weight numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

CREATE TABLE IF NOT EXISTS sales_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  event_name text NOT NULL,
  total_revenue numeric(10,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_event_id uuid NOT NULL REFERENCES sales_events(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  starting_stock integer NOT NULL DEFAULT 0,
  ending_stock integer NOT NULL DEFAULT 0,
  quantity_sold integer NOT NULL DEFAULT 0,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_date date NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity_made integer NOT NULL DEFAULT 0,
  components_used jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS component_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  purchase_date date NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  total_paid numeric(10,2) NOT NULL DEFAULT 0,
  cost_per_unit numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboard_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shopify_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id text NOT NULL UNIQUE,
  shopify_webhook_id text,
  sales_event_id uuid REFERENCES sales_events(id) ON DELETE SET NULL,
  items_processed integer NOT NULL DEFAULT 0,
  items_unmatched integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopify_order_events_created_at
  ON shopify_order_events(created_at DESC);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access to products"
  ON products FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to components"
  ON components FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to recipes"
  ON recipes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to sales_events"
  ON sales_events FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to sales_items"
  ON sales_items FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to production_history"
  ON production_history FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to component_purchases"
  ON component_purchases FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to dashboard_notes"
  ON dashboard_notes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to shopify_order_events"
  ON shopify_order_events FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sales_items_event ON sales_items(sales_event_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product ON sales_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_events_date ON sales_events(event_date);
CREATE INDEX IF NOT EXISTS idx_production_history_date ON production_history(production_date);
CREATE INDEX IF NOT EXISTS idx_production_history_product ON production_history(product_id);
CREATE INDEX IF NOT EXISTS idx_component_purchases_component ON component_purchases(component_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product ON recipes(product_id);
