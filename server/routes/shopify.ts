import crypto from 'crypto';
import express, { Router } from 'express';
import pool from '../db';

const router = Router();
const shopifyStockSyncOnly = process.env.SHOPIFY_STOCK_SYNC_ONLY !== 'false';

type ShopifyLineItem = {
  title?: string;
  sku?: string;
  variant_id?: number | string | null;
  quantity?: number | string;
  price?: number | string;
  price_set?: {
    shop_money?: {
      amount?: string;
    };
  };
};

type ShopifyOrderPayload = {
  id?: number | string;
  order_number?: number | string;
  name?: string;
  created_at?: string;
  line_items?: ShopifyLineItem[];
};

type ShopifyOrderEventRow = {
  shopify_order_id: string;
  payload: ShopifyOrderPayload | null;
};

router.get('/sync-results', async (req, res) => {
  const limitParam = Number(req.query.limit);
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(Math.floor(limitParam), 50)
    : 10;

  try {
    const result = await pool.query(
      `SELECT
         shopify_order_id,
         shopify_webhook_id,
         sales_event_id,
         items_processed,
         items_unmatched,
         processed_at,
         created_at
       FROM shopify_order_events
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    const rows = result.rows.map((row) => ({
      shopify_order_id: row.shopify_order_id,
      shopify_webhook_id: row.shopify_webhook_id,
      sales_event_id: row.sales_event_id,
      items_processed: Number(row.items_processed ?? 0),
      items_unmatched: Number(row.items_unmatched ?? 0),
      processed_at: row.processed_at,
      created_at: row.created_at,
      mode: row.sales_event_id ? 'stock-and-sales' : 'stock-only',
      status: row.processed_at ? 'processed' : 'pending',
    }));

    return res.json({
      count: rows.length,
      latest: rows[0] || null,
      rows,
    });
  } catch (error) {
    console.error('Error fetching Shopify sync results:', error);
    return res.status(500).json({ error: 'Failed to fetch Shopify sync results' });
  }
});

function verifyShopifyWebhook(rawBody: Buffer, hmacHeader: string, secret: string) {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  const digestBuffer = Buffer.from(digest);
  const hmacBuffer = Buffer.from(hmacHeader);

  if (digestBuffer.length !== hmacBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(digestBuffer, hmacBuffer);
}

function parseUnitPrice(lineItem: ShopifyLineItem) {
  const directPrice = Number(lineItem.price);
  if (!Number.isNaN(directPrice)) {
    return directPrice;
  }

  const nestedPrice = Number(lineItem.price_set?.shop_money?.amount);
  if (!Number.isNaN(nestedPrice)) {
    return nestedPrice;
  }

  return 0;
}

router.get('/orders/by-sales-event/:salesEventId', async (req, res) => {
  const { salesEventId } = req.params;

  try {
    const result = await pool.query(
      `SELECT shopify_order_id, payload
       FROM shopify_order_events
       WHERE sales_event_id = $1
       LIMIT 1`,
      [salesEventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shopify order not found for this sales event' });
    }

    const row = result.rows[0] as ShopifyOrderEventRow;
    const payload = row.payload || {};
    const lineItems = Array.isArray(payload.line_items) ? payload.line_items : [];

    const normalizedLineItems = lineItems.map((item) => {
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = parseUnitPrice(item);
      return {
        title: item.title || 'Untitled item',
        sku: item.sku || null,
        variant_id: item.variant_id ? String(item.variant_id) : null,
        quantity: Number.isFinite(quantity) ? quantity : 0,
        unit_price: unitPrice,
        subtotal: (Number.isFinite(quantity) ? quantity : 0) * unitPrice,
      };
    });

    return res.json({
      shopify_order_id: row.shopify_order_id,
      order_name: payload.name || null,
      order_number: payload.order_number ? String(payload.order_number) : null,
      created_at: payload.created_at || null,
      line_items: normalizedLineItems,
    });
  } catch (error) {
    console.error('Error fetching Shopify order by sales event:', error);
    return res.status(500).json({ error: 'Failed to fetch Shopify order details' });
  }
});

router.post(
  '/webhooks/orders-create',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'SHOPIFY_WEBHOOK_SECRET is not configured' });
    }

    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    if (!hmacHeader || !Buffer.isBuffer(req.body)) {
      return res.status(401).json({ error: 'Invalid Shopify webhook request' });
    }

    const isValid = verifyShopifyWebhook(req.body, hmacHeader, secret);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Shopify webhook signature' });
    }

    let payload: ShopifyOrderPayload;
    try {
      payload = JSON.parse(req.body.toString('utf8'));
    } catch (error) {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const orderId = String(payload.id ?? '').trim();
    if (!orderId) {
      return res.status(400).json({ error: 'Missing Shopify order id' });
    }

    const orderReference = String(payload.order_number ?? payload.name ?? orderId);
    const createdAtDate = payload.created_at ? new Date(payload.created_at) : null;
    const eventDate =
      createdAtDate && !Number.isNaN(createdAtDate.getTime())
        ? createdAtDate.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    const webhookId = req.get('X-Shopify-Webhook-Id') ?? null;
    const lineItems = Array.isArray(payload.line_items) ? payload.line_items : [];

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const eventInsert = await client.query(
        `INSERT INTO shopify_order_events (shopify_order_id, shopify_webhook_id, payload)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (shopify_order_id) DO NOTHING
         RETURNING id`,
        [orderId, webhookId, JSON.stringify(payload)]
      );

      if (eventInsert.rows.length === 0) {
        await client.query('COMMIT');
        return res.json({ success: true, duplicate: true });
      }

      const shopifyEventId = eventInsert.rows[0].id;
      const matchedItems: {
        productId: string;
        productName: string;
        quantitySold: number;
        unitPrice: number;
        startingStock: number;
        endingStock: number;
      }[] = [];
      let unmatchedCount = 0;

      for (const lineItem of lineItems) {
        const quantitySold = Number(lineItem.quantity ?? 0);
        if (!Number.isFinite(quantitySold) || quantitySold <= 0) {
          continue;
        }

        const sku = String(lineItem.sku ?? '').trim();
        const variantId = String(lineItem.variant_id ?? '').trim();

        let productResult;
        if (variantId) {
          productResult = await client.query(
            'SELECT id, name, current_stock FROM products WHERE shopify_variant_id = $1 LIMIT 1',
            [variantId]
          );
        }

        if ((!productResult || productResult.rows.length === 0) && sku) {
          productResult = await client.query(
            'SELECT id, name, current_stock FROM products WHERE lower(shopify_sku) = lower($1) LIMIT 1',
            [sku]
          );
        }

        if (!productResult || productResult.rows.length === 0) {
          unmatchedCount += 1;
          continue;
        }

        const product = productResult.rows[0];
        const unitPrice = parseUnitPrice(lineItem);
        const endingStock = product.current_stock - quantitySold;

        matchedItems.push({
          productId: product.id,
          productName: product.name,
          quantitySold,
          unitPrice,
          startingStock: product.current_stock,
          endingStock,
        });
      }

      let salesEventId: string | null = null;

      if (matchedItems.length > 0) {
        if (!shopifyStockSyncOnly) {
          const totalRevenue = matchedItems.reduce(
            (sum, item) => sum + item.quantitySold * item.unitPrice,
            0
          );

          const salesEventResult = await client.query(
            `INSERT INTO sales_events (event_name, event_date, total_revenue, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [
              `Shopify Order #${orderReference}`,
              eventDate,
              totalRevenue,
              `Imported automatically from Shopify order ${orderReference}`,
            ]
          );

          salesEventId = salesEventResult.rows[0].id;
        }

        for (const item of matchedItems) {
          if (!shopifyStockSyncOnly && salesEventId) {
            const subtotal = item.quantitySold * item.unitPrice;

            await client.query(
              `INSERT INTO sales_items
                (sales_event_id, product_id, product_name, starting_stock, ending_stock, quantity_sold, unit_price, subtotal)
               VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                salesEventId,
                item.productId,
                item.productName,
                item.startingStock,
                item.endingStock,
                item.quantitySold,
                item.unitPrice,
                subtotal,
              ]
            );
          }

          await client.query(
            'UPDATE products SET current_stock = $1, updated_at = NOW() WHERE id = $2',
            [item.endingStock, item.productId]
          );
        }
      }

      await client.query(
        `UPDATE shopify_order_events
         SET sales_event_id = $1,
             items_processed = $2,
             items_unmatched = $3,
             processed_at = NOW()
         WHERE id = $4`,
        [salesEventId, matchedItems.length, unmatchedCount, shopifyEventId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        duplicate: false,
        mode: shopifyStockSyncOnly ? 'stock-only' : 'stock-and-sales',
        itemsProcessed: matchedItems.length,
        itemsUnmatched: unmatchedCount,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing Shopify order webhook:', error);
      res.status(500).json({ error: 'Failed to process Shopify order webhook' });
    } finally {
      client.release();
    }
  }
);

export default router;
