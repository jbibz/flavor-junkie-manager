/*
  # Flavor Junkie CRM Database Schema
  
  1. New Tables
    - `products` - Finished seasoning products
      - `id` (uuid, primary key)
      - `name` (text) - Product name
      - `size` (text) - Regular or Big
      - `current_stock` (integer) - Current inventory count
      - `lid_color` (text) - White, Red, or Black
      - `bottle_type` (text) - Regular or Big
      - `price` (numeric) - Selling price
      - `description` (text) - Product description
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `components` - Raw materials inventory
      - `id` (uuid, primary key)
      - `category` (text) - lids, bottles, labels
      - `type` (text) - Specific type (white, red, black, regular, big, etc)
      - `quantity` (integer) - Current stock
      - `average_cost` (numeric) - Weighted average cost per unit
      - `total_value` (numeric) - Total inventory value
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `recipes` - Product recipes in grams
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `ingredients` (jsonb) - Array of {name, amount, unit}
      - `original_batch_size` (integer) - Number of bottles in original recipe
      - `total_recipe_weight` (numeric) - Total grams
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `sales_events` - Sales history
      - `id` (uuid, primary key)
      - `event_date` (date) - Sale date
      - `event_name` (text) - Event name
      - `total_revenue` (numeric) - Total revenue
      - `notes` (text) - Optional notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `sales_items` - Individual product sales within events
      - `id` (uuid, primary key)
      - `sales_event_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key)
      - `product_name` (text) - Cached product name
      - `starting_stock` (integer) - Stock at market start
      - `ending_stock` (integer) - Stock at market end
      - `quantity_sold` (integer) - Units sold
      - `unit_price` (numeric) - Price per unit
      - `subtotal` (numeric) - Total for this product
      - `created_at` (timestamptz)
    
    - `production_history` - Production batches
      - `id` (uuid, primary key)
      - `production_date` (date) - Date produced
      - `product_id` (uuid, foreign key)
      - `product_name` (text) - Cached product name
      - `quantity_made` (integer) - Units produced
      - `components_used` (jsonb) - Components deducted
      - `notes` (text) - Optional notes
      - `created_at` (timestamptz)
    
    - `component_purchases` - Purchase history for components
      - `id` (uuid, primary key)
      - `component_id` (uuid, foreign key)
      - `purchase_date` (date) - Date purchased
      - `quantity` (integer) - Quantity purchased
      - `total_paid` (numeric) - Total price paid
      - `cost_per_unit` (numeric) - Calculated unit cost
      - `created_at` (timestamptz)
    
    - `dashboard_notes` - Rich text notes
      - `id` (uuid, primary key)
      - `content` (text) - HTML content
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Create policies for public access (single-user app)
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size text NOT NULL,
  current_stock integer NOT NULL DEFAULT 0,
  lid_color text NOT NULL,
  bottle_type text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create components table
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

-- Create recipes table
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

-- Create sales_events table
CREATE TABLE IF NOT EXISTS sales_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  event_name text NOT NULL,
  total_revenue numeric(10,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sales_items table
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

-- Create production_history table
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

-- Create component_purchases table
CREATE TABLE IF NOT EXISTS component_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  purchase_date date NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  total_paid numeric(10,2) NOT NULL DEFAULT 0,
  cost_per_unit numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create dashboard_notes table
CREATE TABLE IF NOT EXISTS dashboard_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_notes ENABLE ROW LEVEL SECURITY;

-- Create public access policies (single-user app, no auth required)
CREATE POLICY "Public access to products"
  ON products FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to components"
  ON components FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to recipes"
  ON recipes FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to sales_events"
  ON sales_events FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to sales_items"
  ON sales_items FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to production_history"
  ON production_history FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to component_purchases"
  ON component_purchases FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to dashboard_notes"
  ON dashboard_notes FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_items_event ON sales_items(sales_event_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product ON sales_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_events_date ON sales_events(event_date);
CREATE INDEX IF NOT EXISTS idx_production_history_date ON production_history(production_date);
CREATE INDEX IF NOT EXISTS idx_production_history_product ON production_history(product_id);
CREATE INDEX IF NOT EXISTS idx_component_purchases_component ON component_purchases(component_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product ON recipes(product_id);