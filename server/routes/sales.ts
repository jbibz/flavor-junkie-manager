import { Router } from 'express';
import { query } from '../db';
import pool from '../db';

const router = Router();

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
      'SELECT * FROM sales_items WHERE sales_event_id = $1',
      [id]
    );

    res.json({
      event: eventResult.rows[0],
      items: itemsResult.rows
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

    const {
      event_name,
      market_name,
      event_date,
      items,
      notes
    } = req.body;
    const saleItems = Array.isArray(items) ? items : [];
    const saleEventName = event_name || market_name || '';

    let totalRevenue = 0;
    for (const item of saleItems) {
      totalRevenue += item.quantity_sold * item.price_per_unit;
    }

    const eventResult = await client.query(
      'INSERT INTO sales_events (event_name, event_date, total_revenue, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [saleEventName, event_date, totalRevenue, notes || '']
    );

    const eventId = eventResult.rows[0].id;

    for (const item of saleItems) {
      const subtotal = item.quantity_sold * item.price_per_unit;
      await client.query(
        'INSERT INTO sales_items (sales_event_id, product_id, product_name, starting_stock, ending_stock, quantity_sold, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          eventId,
          item.product_id,
          item.product_name,
          item.starting_stock ?? 0,
          item.ending_stock ?? item.starting_stock ?? 0,
          item.quantity_sold,
          item.price_per_unit,
          subtotal
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
    res.status(500).json({ error: 'Failed to create sales event' });
  } finally {
    client.release();
  }
});

router.put('/events/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      event_name,
      market_name,
      event_date,
      items,
      notes
    } = req.body;
    const saleItems = Array.isArray(items) ? items : [];
    const saleEventName = event_name || market_name || '';

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

    await client.query('DELETE FROM sales_items WHERE sales_event_id = $1', [id]);

    let totalRevenue = 0;
    for (const item of saleItems) {
      totalRevenue += item.quantity_sold * item.price_per_unit;
    }

    const eventResult = await client.query(
      'UPDATE sales_events SET event_name = $1, event_date = $2, total_revenue = $3, notes = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [saleEventName, event_date, totalRevenue, notes || '', id]
    );

    if (eventResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sales event not found' });
    }

    for (const item of saleItems) {
      const subtotal = item.quantity_sold * item.price_per_unit;
      await client.query(
        'INSERT INTO sales_items (sales_event_id, product_id, product_name, starting_stock, ending_stock, quantity_sold, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          id,
          item.product_id,
          item.product_name,
          item.starting_stock ?? 0,
          item.ending_stock ?? item.starting_stock ?? 0,
          item.quantity_sold,
          item.price_per_unit,
          subtotal
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
    res.status(500).json({ error: 'Failed to update sales event' });
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
