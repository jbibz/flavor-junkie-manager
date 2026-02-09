/*
  # Seed Initial Data for Flavor Junkie CRM
  
  1. Initial Products
    - 7 seasoning products with stock levels
  
  2. Initial Components
    - Lids (white, red, black)
    - Bottles (regular, big)
    - Labels (7 types matching products)
  
  3. Sample Recipes
    - Recipe data for each product
  
  4. Dashboard Notes
    - Initialize empty notes
*/

-- Insert 7 products
INSERT INTO products (name, size, current_stock, lid_color, bottle_type, price, description) VALUES
  ('All Ya Need', 'Regular', 35, 'White', 'Regular', 8.99, 'Our signature all-purpose seasoning blend with the perfect balance of garlic, salt, and herbs'),
  ('All Ya Need plus Heat', 'Regular', 28, 'Red', 'Regular', 8.99, 'All the flavor of All Ya Need with an added kick of heat'),
  ('All Ya Need', 'Big', 12, 'White', 'Big', 14.99, 'Our signature blend in a larger size for serious flavor enthusiasts'),
  ('All Ya Need plus Heat', 'Big', 8, 'Red', 'Big', 14.99, 'The spicy version in our larger bottle size'),
  ('Honey Garlic', 'Regular', 22, 'Black', 'Regular', 8.99, 'Sweet honey meets savory garlic in this unique blend'),
  ('Taco Fiesta', 'Regular', 31, 'Red', 'Regular', 8.99, 'Authentic taco seasoning with bold Mexican flavors'),
  ('Jalapeno Salt', 'Regular', 19, 'Black', 'Regular', 7.99, 'Smoky jalapeno-infused sea salt for that perfect kick')
ON CONFLICT DO NOTHING;

-- Insert component inventory
INSERT INTO components (category, type, quantity, average_cost, total_value) VALUES
  ('lids', 'white', 150, 0.50, 75.00),
  ('lids', 'red', 75, 0.45, 33.75),
  ('lids', 'black', 90, 0.48, 43.20),
  ('bottles', 'regular', 280, 0.75, 210.00),
  ('bottles', 'big', 85, 1.25, 106.25),
  ('labels', 'all_ya_need', 120, 0.30, 36.00),
  ('labels', 'all_ya_need_heat', 95, 0.30, 28.50),
  ('labels', 'all_ya_need_big', 45, 0.35, 15.75),
  ('labels', 'all_ya_need_heat_big', 30, 0.35, 10.50),
  ('labels', 'honey_garlic', 80, 0.30, 24.00),
  ('labels', 'taco_fiesta', 110, 0.30, 33.00),
  ('labels', 'jalapeno_salt', 70, 0.30, 21.00)
ON CONFLICT (category, type) DO NOTHING;

-- Insert recipes for each product
INSERT INTO recipes (product_id, ingredients, original_batch_size, total_recipe_weight)
SELECT 
  p.id,
  CASE p.name || ' ' || p.size
    WHEN 'All Ya Need Regular' THEN '[
      {"name": "Kosher Salt", "amount": 480, "unit": "g"},
      {"name": "Garlic Powder", "amount": 360, "unit": "g"},
      {"name": "Onion Powder", "amount": 240, "unit": "g"},
      {"name": "Black Pepper", "amount": 180, "unit": "g"},
      {"name": "Dried Parsley", "amount": 120, "unit": "g"}
    ]'::jsonb
    WHEN 'All Ya Need plus Heat Regular' THEN '[
      {"name": "Kosher Salt", "amount": 450, "unit": "g"},
      {"name": "Garlic Powder", "amount": 340, "unit": "g"},
      {"name": "Onion Powder", "amount": 220, "unit": "g"},
      {"name": "Black Pepper", "amount": 170, "unit": "g"},
      {"name": "Cayenne Pepper", "amount": 150, "unit": "g"},
      {"name": "Dried Parsley", "amount": 110, "unit": "g"}
    ]'::jsonb
    WHEN 'All Ya Need Big' THEN '[
      {"name": "Kosher Salt", "amount": 960, "unit": "g"},
      {"name": "Garlic Powder", "amount": 720, "unit": "g"},
      {"name": "Onion Powder", "amount": 480, "unit": "g"},
      {"name": "Black Pepper", "amount": 360, "unit": "g"},
      {"name": "Dried Parsley", "amount": 240, "unit": "g"}
    ]'::jsonb
    WHEN 'All Ya Need plus Heat Big' THEN '[
      {"name": "Kosher Salt", "amount": 900, "unit": "g"},
      {"name": "Garlic Powder", "amount": 680, "unit": "g"},
      {"name": "Onion Powder", "amount": 440, "unit": "g"},
      {"name": "Black Pepper", "amount": 340, "unit": "g"},
      {"name": "Cayenne Pepper", "amount": 300, "unit": "g"},
      {"name": "Dried Parsley", "amount": 220, "unit": "g"}
    ]'::jsonb
    WHEN 'Honey Garlic Regular' THEN '[
      {"name": "Honey Powder", "amount": 400, "unit": "g"},
      {"name": "Garlic Powder", "amount": 350, "unit": "g"},
      {"name": "Kosher Salt", "amount": 280, "unit": "g"},
      {"name": "Onion Powder", "amount": 200, "unit": "g"},
      {"name": "Black Pepper", "amount": 150, "unit": "g"}
    ]'::jsonb
    WHEN 'Taco Fiesta Regular' THEN '[
      {"name": "Chili Powder", "amount": 400, "unit": "g"},
      {"name": "Cumin", "amount": 300, "unit": "g"},
      {"name": "Garlic Powder", "amount": 250, "unit": "g"},
      {"name": "Paprika", "amount": 200, "unit": "g"},
      {"name": "Onion Powder", "amount": 180, "unit": "g"},
      {"name": "Oregano", "amount": 100, "unit": "g"}
    ]'::jsonb
    WHEN 'Jalapeno Salt Regular' THEN '[
      {"name": "Sea Salt", "amount": 600, "unit": "g"},
      {"name": "Dried Jalapeno Powder", "amount": 280, "unit": "g"},
      {"name": "Smoked Paprika", "amount": 180, "unit": "g"},
      {"name": "Garlic Powder", "amount": 120, "unit": "g"}
    ]'::jsonb
  END,
  CASE p.name || ' ' || p.size
    WHEN 'All Ya Need Regular' THEN 24
    WHEN 'All Ya Need plus Heat Regular' THEN 24
    WHEN 'All Ya Need Big' THEN 12
    WHEN 'All Ya Need plus Heat Big' THEN 12
    WHEN 'Honey Garlic Regular' THEN 24
    WHEN 'Taco Fiesta Regular' THEN 24
    WHEN 'Jalapeno Salt Regular' THEN 24
  END,
  CASE p.name || ' ' || p.size
    WHEN 'All Ya Need Regular' THEN 1380
    WHEN 'All Ya Need plus Heat Regular' THEN 1440
    WHEN 'All Ya Need Big' THEN 2760
    WHEN 'All Ya Need plus Heat Big' THEN 2880
    WHEN 'Honey Garlic Regular' THEN 1380
    WHEN 'Taco Fiesta Regular' THEN 1430
    WHEN 'Jalapeno Salt Regular' THEN 1180
  END
FROM products p
ON CONFLICT (product_id) DO NOTHING;

-- Insert initial dashboard note
INSERT INTO dashboard_notes (content, updated_at) VALUES
  ('<p>Welcome to Flavor Junkie CRM! Use this space for daily notes and reminders.</p>', now())
ON CONFLICT DO NOTHING;