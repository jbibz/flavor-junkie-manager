import { Router } from 'express';
import { query } from '../db';
import pool from '../db';

const router = Router();

function parseInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function parseDecimal(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

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

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const quantity = parseInteger(req.body?.quantity);
    const averageCost = parseDecimal(req.body?.average_cost);
    const totalValue = parseDecimal(req.body?.total_value);

    if (quantity < 0 || averageCost < 0 || totalValue < 0) {
      return res.status(400).json({ error: 'Quantity and costs must be 0 or greater' });
    }

    const result = await query(
      `UPDATE components
       SET quantity = $1,
           average_cost = $2,
           total_value = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [quantity, averageCost, totalValue, id]
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
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const quantity = parseInteger(req.body?.quantity);
    const totalPaid = parseDecimal(req.body?.total_paid);

    if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(totalPaid) || totalPaid <= 0) {
      return res.status(400).json({ error: 'Quantity and total paid must both be greater than 0' });
    }

    await client.query('BEGIN');

    const componentResult = await client.query(
      'SELECT * FROM components WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (componentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Component not found' });
    }

    const component = componentResult.rows[0];
    const costPerUnit = totalPaid / quantity;
    const oldQty = Number(component.quantity);
    const oldCost = Number(component.average_cost);
    const newQty = oldQty + quantity;
    const newAvgCost = (oldQty * oldCost + quantity * costPerUnit) / newQty;
    const newTotalValue = newQty * newAvgCost;

    await client.query(
      `UPDATE components
       SET quantity = $1,
           average_cost = $2,
           total_value = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [newQty, newAvgCost, newTotalValue, id]
    );

    await client.query(
      `INSERT INTO component_purchases
        (component_id, purchase_date, quantity, total_paid, cost_per_unit)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, new Date().toISOString().split('T')[0], quantity, totalPaid, costPerUnit]
    );

    await client.query('COMMIT');

    const updatedResult = await query('SELECT * FROM components WHERE id = $1', [id]);
    res.json(updatedResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding component purchase:', error);
    res.status(500).json({ error: 'Failed to add component purchase' });
  } finally {
    client.release();
  }
});

export default router;
