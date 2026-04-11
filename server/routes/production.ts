import { Router } from 'express';
import type { PoolClient } from 'pg';
import { query } from '../db';
import pool from '../db';

const router = Router();

interface ComponentAdjustment {
  component_id: string;
  quantity_delta: number;
}

function normalizeQuantity(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function normalizeAdjustments(value: unknown): ComponentAdjustment[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => ({
      component_id: String((item as Record<string, unknown>).component_id || '').trim(),
      quantity_delta: Number((item as Record<string, unknown>).quantity_delta),
    }))
    .filter((item) => item.component_id && Number.isFinite(item.quantity_delta) && item.quantity_delta !== 0);
}

async function applyComponentAdjustments(
  client: PoolClient,
  adjustments: ComponentAdjustment[]
) {
  for (const adjustment of adjustments) {
    const componentResult = await client.query(
      'SELECT id, quantity, average_cost FROM components WHERE id = $1 FOR UPDATE',
      [adjustment.component_id]
    );

    if (componentResult.rows.length === 0) {
      throw new Error('Component not found while updating batch materials');
    }

    const component = componentResult.rows[0];
    const nextQuantity = Number(component.quantity) + adjustment.quantity_delta;

    if (nextQuantity < 0) {
      throw new Error('Insufficient component stock for this batch');
    }

    const averageCost = Number(component.average_cost ?? 0);
    await client.query(
      `UPDATE components
       SET quantity = $1,
           total_value = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [nextQuantity, nextQuantity * averageCost, adjustment.component_id]
    );
  }
}

router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM production_history ORDER BY production_date DESC, created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching production batches:', error);
    res.status(500).json({ error: 'Failed to fetch production batches' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM production_history WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Production batch not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching production batch:', error);
    res.status(500).json({ error: 'Failed to fetch production batch' });
  }
});

router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const productId = String(req.body?.product_id || '').trim();
    const productName = String(req.body?.product_name || '').trim();
    const productionDate = String(req.body?.production_date || '').trim();
    const notes = String(req.body?.notes || '').trim();
    const quantityMade = normalizeQuantity(req.body?.quantity_made);
    const componentsUsed = req.body?.components_used || {};
    const componentAdjustments = normalizeAdjustments(req.body?.component_adjustments);

    if (!productId || !productName || !productionDate || !Number.isInteger(quantityMade) || quantityMade <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid production batch payload' });
    }

    const productResult = await client.query(
      'SELECT id FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await client.query(
      `INSERT INTO production_history
        (product_id, product_name, quantity_made, production_date, components_used, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [productId, productName, quantityMade, productionDate, componentsUsed, notes]
    );

    await applyComponentAdjustments(client, componentAdjustments);

    await client.query(
      'UPDATE products SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2',
      [quantityMade, productId]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating production batch:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create production batch' });
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const productId = String(req.body?.product_id || '').trim();
    const productName = String(req.body?.product_name || '').trim();
    const productionDate = String(req.body?.production_date || '').trim();
    const notes = String(req.body?.notes || '').trim();
    const quantityMade = normalizeQuantity(req.body?.quantity_made);
    const componentsUsed = req.body?.components_used || {};

    if (!productId || !productName || !productionDate || !Number.isInteger(quantityMade) || quantityMade <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid production batch payload' });
    }

    const oldBatchResult = await client.query(
      'SELECT product_id, quantity_made FROM production_history WHERE id = $1',
      [id]
    );

    if (oldBatchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Production batch not found' });
    }

    const oldBatch = oldBatchResult.rows[0];

    await client.query(
      'UPDATE products SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2',
      [oldBatch.quantity_made, oldBatch.product_id]
    );

    const result = await client.query(
      `UPDATE production_history
       SET product_id = $1,
           product_name = $2,
           quantity_made = $3,
           production_date = $4,
           components_used = $5,
           notes = $6
       WHERE id = $7
       RETURNING *`,
      [productId, productName, quantityMade, productionDate, componentsUsed, notes, id]
    );

    await client.query(
      'UPDATE products SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2',
      [quantityMade, productId]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating production batch:', error);
    res.status(500).json({ error: 'Failed to update production batch' });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const batchResult = await client.query(
      'SELECT product_id, quantity_made FROM production_history WHERE id = $1',
      [id]
    );

    if (batchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Production batch not found' });
    }

    const batch = batchResult.rows[0];

    await client.query(
      'UPDATE products SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2',
      [batch.quantity_made, batch.product_id]
    );

    await client.query('DELETE FROM production_history WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting production batch:', error);
    res.status(500).json({ error: 'Failed to delete production batch' });
  } finally {
    client.release();
  }
});

export default router;
