/*
  # Increase component cost precision for seasoning cost/gram tracking

  - Preserve small per-gram costs like 0.003
  - Keep total value with currency precision
*/

ALTER TABLE components
  ALTER COLUMN average_cost TYPE numeric(12,6) USING average_cost::numeric;

ALTER TABLE component_purchases
  ALTER COLUMN cost_per_unit TYPE numeric(12,6) USING cost_per_unit::numeric;
