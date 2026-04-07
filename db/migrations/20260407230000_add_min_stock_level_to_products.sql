-- Add missing inventory threshold column expected by dashboard and product routes.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS min_stock_level integer NOT NULL DEFAULT 10;
