import { Router } from 'express';
import { query } from '../db';

const router = Router();

router.get('/stats', async (req, res) => {
  try {
    const [productsResult, lowStockResult, revenueResult, salesResult] = await Promise.all([
      query('SELECT COUNT(*) AS count FROM products'),
      query('SELECT COUNT(*) AS count FROM products WHERE current_stock < min_stock_level'),
      query('SELECT COALESCE(SUM(total_revenue), 0) AS total FROM sales_events'),
      query('SELECT COUNT(*) AS count FROM sales_events'),
    ]);

    res.json({
      totalProducts: parseInt(productsResult.rows[0].count, 10),
      lowStockItems: parseInt(lowStockResult.rows[0].count, 10),
      totalRevenue: Number(revenueResult.rows[0].total ?? 0),
      totalSales: parseInt(salesResult.rows[0].count, 10),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/notes', async (req, res) => {
  try {
    const result = await query('SELECT * FROM dashboard_notes ORDER BY updated_at DESC LIMIT 1');
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
    const content = String(req.body?.content || '');
    const existing = await query('SELECT id FROM dashboard_notes ORDER BY updated_at DESC LIMIT 1');

    if (existing.rows.length > 0) {
      const updated = await query(
        'UPDATE dashboard_notes SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [content, existing.rows[0].id]
      );
      return res.json(updated.rows[0]);
    }

    const created = await query(
      'INSERT INTO dashboard_notes (content) VALUES ($1) RETURNING *',
      [content]
    );
    res.status(201).json(created.rows[0]);
  } catch (error) {
    console.error('Error saving notes:', error);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

router.put('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const content = String(req.body?.content || '');
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
