import { Router } from 'express';
import { query } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM products ORDER BY name ASC'
    );
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

router.post('/', async (req, res) => {
  try {
    const { name, current_stock, min_stock_level, unit } = req.body;
    const result = await query(
      'INSERT INTO products (name, current_stock, min_stock_level, unit) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, current_stock, min_stock_level, unit]
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
    const { name, current_stock, min_stock_level, unit } = req.body;
    const result = await query(
      'UPDATE products SET name = $1, current_stock = $2, min_stock_level = $3, unit = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [name, current_stock, min_stock_level, unit, id]
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

router.post('/:id/components', async (req, res) => {
  try {
    const { id } = req.params;
    const { component_name, quantity_used, cost, batch_number } = req.body;

    const result = await query(
      'INSERT INTO component_purchases (product_id, component_name, quantity_used, cost, batch_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, component_name, quantity_used, cost, batch_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding component:', error);
    res.status(500).json({ error: 'Failed to add component' });
  }
});

router.get('/:id/components', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM component_purchases WHERE product_id = $1 ORDER BY purchase_date DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching components:', error);
    res.status(500).json({ error: 'Failed to fetch components' });
  }
});

export default router;
