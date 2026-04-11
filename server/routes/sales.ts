import { Router } from 'express';
import type { PoolClient } from 'pg';
import { query } from '../db';
import pool from '../db';

const router = Router();

interface ParsedSaleItem {
  product_id: string;
  product_name: string;
  starting_stock: number;
  ending_stock: number;
  quantity_sold: number;
  price_per_unit: number;
}

function parseInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function parseDecimal(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function parseSaleItems(value: unknown): ParsedSaleItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => ({
      product_id: String((item as Record<string, unknown>).product_id || '').trim(),
      product_name: String((item as Record<string, unknown>).product_name || '').trim(),
      starting_stock: parseInteger((item as Record<string, unknown>).starting_stock),
      ending_stock: parseInteger((item as Record<string, unknown>).ending_stock),
      quantity_sold: parseInteger((item as Record<string, unknown>).quantity_sold),
      price_per_unit: parseDecimal((item as Record<string, unknown>).price_per_unit),
    }))
    .filter((item) => item.product_id && item.product_name);
}

function validateSaleItems(items: ParsedSaleItem[]) {
  for (const item of items) {
    if (
      !Number.isInteger(item.starting_stock) ||
      !Number.isInteger(item.ending_stock) ||
      !Number.isInteger(item.quantity_sold) ||
      !Number.isFinite(item.price_per_unit)
    ) {
      return 'One or more sale items are invalid';
    }

    if (
      item.starting_stock < 0 ||
      item.ending_stock < 0 ||
      item.quantity_sold < 0 ||
      item.price_per_unit < 0
    ) {
      return 'Sale item values must be 0 or greater';
    }

    if (item.starting_stock - item.ending_stock !== item.quantity_sold) {
      return 'Quantity sold must match brought minus remaining';
    }
  }

  return null;
}

async function ensureSufficientInventory(
  client: PoolClient,
  items: ParsedSaleItem[]
) {
  for (const item of items) {
    const productResult = await client.query(
      'SELECT current_stock FROM products WHERE id = $1 FOR UPDATE',
      [item.product_id]
    );

    if (productResult.rows.length === 0) {
      throw new Error(`Product not found for sale item ${item.product_name}`);
    }

    if (Number(productResult.rows[0].current_stock) < item.quantity_sold) {
      throw new Error(`Insufficient inventory for ${item.product_name}`);
    }
  }
}

router.get('/events', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM sales_events ORDER BY event_date DESC, created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales events:', error);
    res.status(500).json({ error: 'Failed to fetch sales events' });
  }
});

router.get('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const eventResult = await query('SELECT * FROM sales_events WHERE id = $1', [id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sales event not found' });
    }

    const itemsResult = await query(
      'SELECT * FROM sales_items WHERE sales_event_id = $1 ORDER BY created_at ASC',
      [id]
    );

    res.json({
      event: eventResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching sales event:', error);
    res.status(500).json({ error: 'Failed to fetch sales event' });
  }
});

router.post('/events', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const eventDate = String(req.body?.event_date || '').trim();
    const eventName = String(req.body?.event_name || req.body?.market_name || '').trim();
    const notes = String(req.body?.notes || '').trim();
    const saleItems = parseSaleItems(req.body?.items);
    const validationError = validateSaleItems(saleItems);

    if (!eventDate || !eventName || saleItems.length === 0 || validationError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: validationError || 'Invalid sales event payload' });
    }

    await ensureSufficientInventory(client, saleItems);

    const totalRevenue = saleItems.reduce(
      (sum, item) => sum + item.quantity_sold * item.price_per_unit,
      0
    );

    const eventResult = await client.query(
      `INSERT INTO sales_events (event_name, event_date, total_revenue, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [eventName, eventDate, totalRevenue, notes]
    );

    const eventId = eventResult.rows[0].id;

    for (const item of saleItems) {
      const subtotal = item.quantity_sold * item.price_per_unit;
      await client.query(
        `INSERT INTO sales_items
          (sales_event_id, product_id, product_name, starting_stock, ending_stock, quantity_sold, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          eventId,
          item.product_id,
          item.product_name,
          item.starting_stock,
          item.ending_stock,
          item.quantity_sold,
          item.price_per_unit,
          subtotal,
        ]
      );

      await client.query(
        'UPDATE products SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2',
        [item.quantity_sold, item.product_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(eventResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating sales event:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create sales event' });
  } finally {
    client.release();
  }
});

router.put('/events/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const eventDate = String(req.body?.event_date || '').trim();
    const eventName = String(req.body?.event_name || req.body?.market_name || '').trim();
    const notes = String(req.body?.notes || '').trim();
    const saleItems = parseSaleItems(req.body?.items);
    const validationError = validateSaleItems(saleItems);

    if (!eventDate || !eventName || saleItems.length === 0 || validationError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: validationError || 'Invalid sales event payload' });
    }

    const oldItemsResult = await client.query(
      'SELECT product_id, quantity_sold FROM sales_items WHERE sales_event_id = $1',
      [id]
    );

    for (const oldItem of oldItemsResult.rows) {
      await client.query(
        'UPDATE products SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2',
        [oldItem.quantity_sold, oldItem.product_id]
      );
    }

    await ensureSufficientInventory(client, saleItems);

    await client.query('DELETE FROM sales_items WHERE sales_event_id = $1', [id]);

    const totalRevenue = saleItems.reduce(
      (sum, item) => sum + item.quantity_sold * item.price_per_unit,
      0
    );

    const eventResult = await client.query(
      `UPDATE sales_events
       SET event_name = $1,
           event_date = $2,
           total_revenue = $3,
           notes = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [eventName, eventDate, totalRevenue, notes, id]
    );

    if (eventResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sales event not found' });
    }

    for (const item of saleItems) {
      const subtotal = item.quantity_sold * item.price_per_unit;
      await client.query(
        `INSERT INTO sales_items
          (sales_event_id, product_id, product_name, starting_stock, ending_stock, quantity_sold, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          item.product_id,
          item.product_name,
          item.starting_stock,
          item.ending_stock,
          item.quantity_sold,
          item.price_per_unit,
          subtotal,
        ]
      );

      await client.query(
        'UPDATE products SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2',
        [item.quantity_sold, item.product_id]
      );
    }

    await client.query('COMMIT');
    res.json(eventResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating sales event:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update sales event' });
  } finally {
    client.release();
  }
});

router.delete('/events/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const itemsResult = await client.query(
      'SELECT product_id, quantity_sold FROM sales_items WHERE sales_event_id = $1',
      [id]
    );

    if (itemsResult.rows.length === 0) {
      const existingEvent = await client.query('SELECT id FROM sales_events WHERE id = $1', [id]);
      if (existingEvent.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Sales event not found' });
      }
    }

    for (const item of itemsResult.rows) {
      await client.query(
        'UPDATE products SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2',
        [item.quantity_sold, item.product_id]
      );
    }

    await client.query('DELETE FROM sales_items WHERE sales_event_id = $1', [id]);
    const result = await client.query('DELETE FROM sales_events WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sales event not found' });
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting sales event:', error);
    res.status(500).json({ error: 'Failed to delete sales event' });
  } finally {
    client.release();
  }
});

router.get('/items', async (req, res) => {
  try {
    const result = await query('SELECT * FROM sales_items ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales items:', error);
    res.status(500).json({ error: 'Failed to fetch sales items' });
  }
});

export default router;
