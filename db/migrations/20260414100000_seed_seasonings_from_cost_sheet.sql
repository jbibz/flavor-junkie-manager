/*
  # Pre-populate seasonings inventory from provided cost sheet

  - Adds seasonings as `components` rows
  - Stores quantity in grams and average_cost as cost per gram
*/

INSERT INTO components (category, type, quantity, average_cost, total_value)
VALUES
  ('seasonings', 'sea_salt', 45359, 0.002999, 136.04),
  ('seasonings', 'pink_h_salt', 45359, 0.003938, 178.63),
  ('seasonings', 'black_pepper', 11340, 0.016313, 184.99),
  ('seasonings', 'granulated_garlic', 12474, 0.008896, 110.97),
  ('seasonings', 'granulated_onion', 11340, 0.010295, 116.74),
  ('seasonings', 'paprika', 2268, 0.007720, 17.51),
  ('seasonings', 'cayenne_powder', 2268, 0.010088, 22.88),
  ('seasonings', 'chili_powder', 2722, 0.013108, 35.68),
  ('seasonings', 'cumin', 2268, 0.013404, 30.40),
  ('seasonings', 'crushed_red_pepper', 1701, 0.013239, 22.52),
  ('seasonings', 'oregano', 680, 0.026574, 18.07),
  ('seasonings', 'jalapeno_powder', 4536, 0.019709, 89.40),
  ('seasonings', 'honey_granules', 4536, 0.015653, 71.00),
  ('seasonings', 'black_pepper_honey_garlic', 2268, 0.010141, 23.00),
  ('seasonings', 'garlic_honey_garlic', 2268, 0.009678, 21.95),
  ('seasonings', 'smoked_paprika_honey_garlic', 2268, 0.018673, 42.35),
  ('seasonings', 'kosher_salt_honey_garlic', 1361, 0.004607, 6.27)
ON CONFLICT (category, type)
DO UPDATE SET
  quantity = EXCLUDED.quantity,
  average_cost = EXCLUDED.average_cost,
  total_value = EXCLUDED.total_value,
  updated_at = NOW();
