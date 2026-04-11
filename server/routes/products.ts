import { Router } from 'express';
import { query } from '../db';

const router = Router();

function parseInteger(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function parseDecimal(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeProductPayload(body: Record<string, unknown>) {
  return {
    name: String(body.name || '').trim(),
    size: String(body.size || '').trim(),
    current_stock: parseInteger(body.current_stock, 0),
    min_stock_level: parseInteger(body.min_stock_level, 0),
    lid_color: String(body.lid_color || '').trim(),
    bottle_type: String(body.bottle_type || '').trim(),
    price: parseDecimal(body.price, 0),
    description: String(body.description || '').trim(),
  };
}

function validateProductPayload(payload: ReturnType<typeof normalizeProductPayload>) {
  if (!payload.name || !payload.size || !payload.lid_color || !payload.bottle_type) {
    return 'Name, size, lid color, and bottle type are required';
  }

  if (payload.current_stock < 0 || payload.min_stock_level < 0 || payload.price < 0) {
    return 'Stock, minimum stock, and price must be 0 or greater';
  }

  return null;
}

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM products ORDER BY name ASC, size ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.get('/:id/recipe', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM recipes WHERE product_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

router.put('/:id/recipe', async (req, res) => {
  try {
    const { id } = req.params;
    const { ingredients, original_batch_size } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Ingredients are required' });
    }

    const parsedBatchSize = Number(original_batch_size);
    if (!Number.isFinite(parsedBatchSize) || parsedBatchSize <= 0) {
      return res.status(400).json({ error: 'original_batch_size must be greater than 0' });
    }

    const totalRecipeWeight = ingredients.reduce((sum, ingredient) => {
      const amount = Number(ingredient?.amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const result = await query(
      `UPDATE recipes
       SET ingredients = $1::jsonb,
           original_batch_size = $2,
           total_recipe_weight = $3,
           updated_at = NOW()
       WHERE product_id = $4
       RETURNING *`,
      [JSON.stringify(ingredients), parsedBatchSize, totalRecipeWeight, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = normalizeProductPayload(req.body || {});
    const validationError = validateProductPayload(payload);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await query(
      `INSERT INTO products
        (name, size, current_stock, min_stock_level, lid_color, bottle_type, price, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        payload.name,
        payload.size,
        payload.current_stock,
        payload.min_stock_level,
        payload.lid_color,
        payload.bottle_type,
        payload.price,
        payload.description,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = normalizeProductPayload(req.body || {});
    const validationError = validateProductPayload(payload);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await query(
      `UPDATE products
       SET name = $1,
           size = $2,
           current_stock = $3,
           min_stock_level = $4,
           lid_color = $5,
           bottle_type = $6,
           price = $7,
           description = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        payload.name,
        payload.size,
        payload.current_stock,
        payload.min_stock_level,
        payload.lid_color,
        payload.bottle_type,
        payload.price,
        payload.description,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
