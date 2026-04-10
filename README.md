# Flavor Junkie CRM

A self-hosted CRM application built specifically for managing a small seasoning company. Track inventory, sales, production, and analytics - all running on your own server with full data control.

## Features

- Product inventory management
- Sales tracking and analytics
- Production batch management
- Dashboard with real-time stats
- Shopify order webhook inventory sync
- Self-hosted PostgreSQL database
- No third-party dependencies
- Docker-ready deployment

## Quick Start

**Start everything with Docker:**

```bash
docker compose up -d
```

Access the application at **http://localhost:3001**

**Access the database manager (Adminer) at http://localhost:8080**
- Server: `postgres`
- Username: `postgres`
- Password: `postgres`
- Database: `flavor_junkie`

For detailed setup instructions, see [README.setup.md](README.setup.md)

## Tech Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express + PostgreSQL
- Database: PostgreSQL 16
- Database Manager: Adminer (web-based interface)
- Deployment: Docker + Docker Compose

## Database Management

This project uses PostgreSQL for data storage with Adminer as a web-based database management tool.

### Accessing Adminer

After starting the application with `docker compose up -d`, you can access Adminer at **http://localhost:8080**

Login credentials:
- **System**: PostgreSQL
- **Server**: postgres
- **Username**: postgres
- **Password**: postgres
- **Database**: flavor_junkie

### Database Migrations

Database migrations are stored in the `db/migrations/` directory and are automatically applied when the PostgreSQL container starts for the first time.

### Managing the Database

**Start the database:**
```bash
npm run db:up
```

**Stop the database:**
```bash
npm run db:down
```

**Reset the database (warning: deletes all data):**
```bash
npm run db:reset
```

### Environment Variables

Database connection settings are configured in the `.env` file:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: flavor_junkie)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (default: postgres)
- `SHOPIFY_WEBHOOK_SECRET` - Shared secret used to verify Shopify webhooks
- `SHOPIFY_STOCK_SYNC_ONLY` - `true` = only update inventory from Shopify orders, `false` = also create sales events/items

### Shopify Integration

Inventory can be reduced automatically from Shopify orders using a webhook.

1. Add Shopify mapping values to each product:
   - `shopify_variant_id` (recommended, exact variant match)
   - `shopify_sku` (fallback match when variant id is unavailable)
2. In Shopify Admin, create an `orders/create` webhook pointed to:
   - `POST /api/shopify/webhooks/orders-create`
3. Use the same webhook secret in Shopify and `SHOPIFY_WEBHOOK_SECRET`.
4. Set `SHOPIFY_STOCK_SYNC_ONLY=true` to only decrement inventory counts from Shopify orders.

Each webhook is processed once per Shopify order id. In stock-only mode, only `products.current_stock` is updated for matched products.
