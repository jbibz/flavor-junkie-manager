import { Router } from 'express';
import { query } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM components ORDER BY category ASC, type ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching components:', error);
    res.status(500).json({ error: 'Failed to fetch components' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM components WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Component not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching component:', error);
    res.status(500).json({ error: 'Failed to fetch component' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, average_cost, total_value } = req.body;
    const result = await query(
      'UPDATE components SET quantity = $1, average_cost = $2, total_value = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [quantity, average_cost, total_value, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Component not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating component:', error);
    res.status(500).json({ error: 'Failed to update component' });
  }
});

router.post('/:id/purchases', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, total_paid } = req.body;

    const componentResult = await query('SELECT * FROM components WHERE id = $1', [id]);
    if (componentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Component not found' });
    }

    const component = componentResult.rows[0];
    const costPerUnit = total_paid / quantity;
    const oldQty = component.quantity;
    const oldCost = component.average_cost;
    const newQty = oldQty + quantity;
    const newAvgCost = (oldQty * oldCost + quantity * costPerUnit) / newQty;
    const newTotalValue = newQty * newAvgCost;

    await query(
      'UPDATE components SET quantity = $1, average_cost = $2, total_value = $3, updated_at = NOW() WHERE id = $4',
      [newQty, newAvgCost, newTotalValue, id]
    );

    await query(
      'INSERT INTO component_purchases (component_id, purchase_date, quantity, total_paid, cost_per_unit) VALUES ($1, $2, $3, $4, $5)',
      [id, new Date().toISOString().split('T')[0], quantity, total_paid, costPerUnit]
    );

    const updatedResult = await query('SELECT * FROM components WHERE id = $1', [id]);
    res.json(updatedResult.rows[0]);
  } catch (error) {
    console.error('Error adding component purchase:', error);
    res.status(500).json({ error: 'Failed to add component purchase' });
  }
});

export default router;
