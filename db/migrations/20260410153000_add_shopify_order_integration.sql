-- Add Shopify product mapping fields and webhook processing log for order ingestion.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS shopify_variant_id text,
ADD COLUMN IF NOT EXISTS shopify_sku text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_shopify_variant_id_unique
ON products(shopify_variant_id)
WHERE shopify_variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_shopify_sku_lower
ON products(lower(shopify_sku))
WHERE shopify_sku IS NOT NULL;

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
