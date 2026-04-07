import { Router } from 'express';
import { query } from '../db';

const router = Router();

async function getLowStockCount() {
  const columnCheck = await query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'min_stock_level'
    ) AS has_column`
  );

  const hasMinStockLevel = columnCheck.rows[0]?.has_column === true;

  if (hasMinStockLevel) {
    const lowStockResult = await query(
      'SELECT COUNT(*) as count FROM products WHERE current_stock < COALESCE(min_stock_level, 0)'
    );
    return parseInt(lowStockResult.rows[0].count);
  }

  const fallbackLowStockResult = await query(
    'SELECT COUNT(*) as count FROM products WHERE current_stock <= 10'
  );
  return parseInt(fallbackLowStockResult.rows[0].count);
}

router.get('/stats', async (req, res) => {
  try {
    const productsResult = await query('SELECT COUNT(*) as count FROM products');
    const totalProducts = parseInt(productsResult.rows[0].count);

    const lowStockItems = await getLowStockCount();

    const revenueResult = await query(
      'SELECT COALESCE(SUM(total_revenue), 0) as total FROM sales_events'
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].total);

    const salesResult = await query('SELECT COUNT(*) as count FROM sales_events');
    const totalSales = parseInt(salesResult.rows[0].count);

    res.json({
      totalProducts,
      lowStockItems,
      totalRevenue,
      totalSales
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/notes', async (req, res) => {
  try {
    const result = await query('SELECT * FROM dashboard_notes LIMIT 1');
    if (result.rows.length === 0) {
      return res.json(null);
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/notes', async (req, res) => {
  try {
    const { content } = req.body;
    const result = await query(
      'INSERT INTO dashboard_notes (content) VALUES ($1) RETURNING *',
      [content]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating notes:', error);
    res.status(500).json({ error: 'Failed to create notes' });
  }
});

router.put('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const result = await query(
      'UPDATE dashboard_notes SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [content, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notes not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

export default router;
