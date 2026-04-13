import crypto from 'crypto';
import { Router } from 'express';
import type { PoolClient } from 'pg';
import pool from '../db';

const router = Router();

interface ShopifyLineItem {
  id: string;
  variant_id: string | null;
  sku: string | null;
  title: string;
  quantity: number;
  price: number;
}

interface InventoryMatch {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  startingStock: number;
  endingStock: number;
}

function getRawBody(body: unknown): Buffer {
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body);
  return Buffer.from('');
}

function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('SHOPIFY_WEBHOOK_SECRET is not set. Skipping Shopify signature verification.');
    return true;
  }

  if (!signatureHeader) return false;

  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signatureHeader);

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}

function toInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function toPrice(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCustomerName(payload: Record<string, any>): string {
  const customerFirst = String(payload?.customer?.first_name || '').trim();
  const customerLast = String(payload?.customer?.last_name || '').trim();
  const shippingName = String(payload?.shipping_address?.name || '').trim();

  const fullName = `${customerFirst} ${customerLast}`.trim();
  return fullName || shippingName || 'Unknown Customer';
}

function parseLineItems(payload: Record<string, any>): ShopifyLineItem[] {
  if (!Array.isArray(payload?.line_items)) return [];

  return payload.line_items
    .map((lineItem: Record<string, unknown>) => ({
      id: String(lineItem?.id ?? '').trim(),
      variant_id: lineItem?.variant_id ? String(lineItem.variant_id).trim() : null,
      sku: lineItem?.sku ? String(lineItem.sku).trim() : null,
      title: String(lineItem?.title ?? '').trim(),
      quantity: toInteger(lineItem?.quantity),
      price: toPrice(lineItem?.price),
    }))
    .filter((lineItem: ShopifyLineItem) => lineItem.title && lineItem.quantity > 0);
}

async function findProductForLineItem(client: PoolClient, lineItem: ShopifyLineItem) {
  if (lineItem.variant_id) {
    const byVariant = await client.query(
      'SELECT id, name, current_stock FROM products WHERE shopify_variant_id = $1 FOR UPDATE',
      [lineItem.variant_id]
    );

    if (byVariant.rows.length > 0) return byVariant.rows[0];
  }

  if (lineItem.sku) {
    const bySku = await client.query(
      'SELECT id, name, current_stock FROM products WHERE lower(shopify_sku) = lower($1) FOR UPDATE',
      [lineItem.sku]
    );

    if (bySku.rows.length > 0) return bySku.rows[0];
  }

  const byTitle = await client.query(
    'SELECT id, name, current_stock FROM products WHERE lower(name) = lower($1) FOR UPDATE',
    [lineItem.title]
  );

  if (byTitle.rows.length > 0) return byTitle.rows[0];
  return null;
}

router.post('/orders/fulfilled', async (req, res) => {
  const rawBody = getRawBody(req.body);
  const signature = req.get('x-shopify-hmac-sha256') ?? undefined;
  const webhookId = req.get('x-shopify-webhook-id') ?? null;

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ error: 'Invalid Shopify webhook signature' });
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (error) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const orderId = String(payload?.id || '').trim();
  const orderName = String(payload?.name || '').trim();
  const customerName = getCustomerName(payload);
  const lineItems = parseLineItems(payload);

  if (!orderId || lineItems.length === 0) {
    return res.status(400).json({ error: 'Missing Shopify order id or line items' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingEventResult = await client.query(
      'SELECT id, processed_at FROM shopify_order_events WHERE shopify_order_id = $1 FOR UPDATE',
      [orderId]
    );

    if (existingEventResult.rows.length > 0 && existingEventResult.rows[0].processed_at) {
      await client.query('COMMIT');
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: `Order ${orderName || orderId} was already processed`,
      });
    }

    const matchedItems: InventoryMatch[] = [];
    const unmatchedItems: ShopifyLineItem[] = [];

    for (const lineItem of lineItems) {
      const product = await findProductForLineItem(client, lineItem);

      if (!product) {
        unmatchedItems.push(lineItem);
        continue;
      }

      const currentStock = Number(product.current_stock);

      if (currentStock < lineItem.quantity) {
        throw new Error(`Insufficient inventory for ${product.name}. Need ${lineItem.quantity}, have ${currentStock}.`);
      }

      matchedItems.push({
        productId: String(product.id),
        productName: String(product.name),
        quantity: lineItem.quantity,
        unitPrice: lineItem.price,
        startingStock: currentStock,
        endingStock: currentStock - lineItem.quantity,
      });
    }

    for (const item of matchedItems) {
      await client.query(
        'UPDATE products SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, item.productId]
      );
    }

    const revenue = matchedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const noteParts = [
      `Shopify order ${orderName || orderId}`,
      `Customer: ${customerName}`,
      unmatchedItems.length > 0 ? `Unmatched line items: ${unmatchedItems.map((item) => item.title).join(', ')}` : '',
    ].filter(Boolean);

    const salesEventResult = await client.query(
      `INSERT INTO sales_events (event_date, event_name, total_revenue, notes)
       VALUES (NOW()::date, $1, $2, $3)
       RETURNING id`,
      [`Shopify Fulfillment - ${customerName}`, revenue, noteParts.join(' | ')]
    );

    const salesEventId = salesEventResult.rows[0].id;

    for (const item of matchedItems) {
      await client.query(
        `INSERT INTO sales_items
          (sales_event_id, product_id, product_name, starting_stock, ending_stock, quantity_sold, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          salesEventId,
          item.productId,
          item.productName,
          item.startingStock,
          item.endingStock,
          item.quantity,
          item.unitPrice,
          item.unitPrice * item.quantity,
        ]
      );
    }

    await client.query(
      `INSERT INTO shopify_order_events
        (shopify_order_id, shopify_webhook_id, sales_event_id, items_processed, items_unmatched, payload, processed_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
       ON CONFLICT (shopify_order_id)
       DO UPDATE SET
         shopify_webhook_id = EXCLUDED.shopify_webhook_id,
         sales_event_id = EXCLUDED.sales_event_id,
         items_processed = EXCLUDED.items_processed,
         items_unmatched = EXCLUDED.items_unmatched,
         payload = EXCLUDED.payload,
         processed_at = EXCLUDED.processed_at`,
      [orderId, webhookId, salesEventId, matchedItems.length, unmatchedItems.length, JSON.stringify(payload)]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      order_id: orderId,
      customer_name: customerName,
      items_processed: matchedItems.map((item) => ({ name: item.productName, quantity: item.quantity })),
      items_unmatched: unmatchedItems.map((item) => ({ title: item.title, quantity: item.quantity })),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing Shopify fulfilled order webhook:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process Shopify fulfilled order webhook',
    });
  } finally {
    client.release();
  }
});

export default router;
