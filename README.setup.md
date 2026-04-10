# Flavor Junkie - Self-Hosted Setup Guide

This application uses a self-hosted PostgreSQL database, giving you full control over your data without any third-party dependencies.

## Prerequisites

- Docker and Docker Compose installed
- Git (for cloning the repository)

**Note:** Node.js is NOT required if you use Docker for everything.

## Quick Start with Docker (Recommended)

### 1. Start Everything with Docker

```bash
docker compose up -d
```

This single command will:
- Build the application Docker image
- Start the PostgreSQL database
- Run database migrations automatically
- Start the application server
- Serve the frontend and backend together

### 2. Access the Application

Open your browser to: **http://localhost:3001**

That's it! Everything is running in Docker containers.

### 3. View Logs

```bash
# View all logs
docker compose logs -f

# View app logs only
docker compose logs -f app

# View database logs only
docker compose logs -f postgres
```

### 4. Stop Everything

```bash
docker compose down
```

## Development Setup (Without Docker)

If you prefer to develop without Docker:

### 1. Install Dependencies

```bash
npm install
```

### 2. Start PostgreSQL Database Only

```bash
npm run db:up
```

### 3. Start Development Servers

**Option A: Start both frontend and backend together**
```bash
npm run dev:all
```

**Option B: Start them separately**

Terminal 1 (Backend API):
```bash
npm run dev:server
```

Terminal 2 (Frontend):
```bash
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Available Commands

### Docker Commands (Recommended)

- `docker compose up -d` - Start everything (database + app)
- `docker compose down` - Stop everything
- `docker compose down -v` - Stop and delete all data
- `docker compose logs -f` - View logs
- `docker compose restart app` - Restart just the app
- `docker compose build --no-cache app` - Rebuild the app

### NPM Scripts (Development)

- `npm run dev` - Start frontend development server
- `npm run dev:server` - Start backend API server
- `npm run dev:all` - Start both frontend and backend
- `npm run build` - Build frontend for production
- `npm run server` - Start backend in production mode
- `npm run db:up` - Start PostgreSQL database only
- `npm run db:down` - Stop PostgreSQL database
- `npm run db:reset` - Reset database (deletes all data)

## Database Management

### Viewing Database Contents

Connect to the database using any PostgreSQL client:

```bash
# Using psql
psql -h localhost -U postgres -d flavor_junkie

# Or use a GUI tool like pgAdmin, DBeaver, or TablePlus
```

### Backup Database

```bash
docker exec flavor-junkie-db pg_dump -U postgres flavor_junkie > backup.sql
```

### Restore Database

```bash
docker exec -i flavor-junkie-db psql -U postgres flavor_junkie < backup.sql
```

## Database Schema

The database includes these tables:
- `products` - Product inventory
- `sales_events` - Sales tracking
- `sales_items` - Individual sale items
- `production_batches` - Production history
- `component_purchases` - Component purchase history
- `dashboard_notes` - Dashboard notes
- `components` - Raw materials (partial support)
- `recipes` - Product recipes (partial support)

## Production Deployment

### Option 1: Deploy with Docker (Easiest)

The application is already configured to run in production with Docker:

1. Clone the repository on your server
2. Edit `docker-compose.yml` to change default passwords
3. Start everything:
   ```bash
   docker compose up -d
   ```
4. Access your app at `http://your-server:3001`

**Important:** Change the default PostgreSQL password in `docker-compose.yml` before deploying to production!

### Option 2: Deploy Without Docker

1. Install PostgreSQL on your server
2. Create a production `.env` file with your credentials
3. Run migrations:
   ```bash
   psql -U your_user -d your_database -f supabase/migrations/20251202220748_create_flavor_junkie_schema.sql
   psql -U your_user -d your_database -f supabase/migrations/20251202220819_seed_initial_data.sql
   ```
4. Build and run:
   ```bash
   npm install
   npm run build
   NODE_ENV=production npm run server
   ```

### Using a Reverse Proxy (Recommended)

For production, put the application behind nginx or Caddy:

**Nginx Example:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Configuration

### Environment Variables

When using Docker, all configuration is in `docker-compose.yml`.

For development, edit `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flavor_junkie
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3001
```

### Changing Ports

To use a different port, edit `docker-compose.yml`:
```yaml
app:
  ports:
    - "8080:3001"  # Access on port 8080 instead
```

## Troubleshooting

### Application won't start

1. Check Docker is running: `docker ps`
2. View logs: `docker compose logs -f app`
3. Rebuild: `docker compose build --no-cache app`

### Database Connection Errors

1. Ensure PostgreSQL is healthy: `docker compose ps`
2. Check logs: `docker compose logs -f postgres`
3. Reset database: `docker compose down -v && docker compose up -d`

### Port Already in Use

If port 3001 is in use, change it in `docker-compose.yml`:
```yaml
app:
  ports:
    - "8080:3001"
```

### Cannot connect from another machine

If accessing from another device on your network:
1. Find your server's IP address
2. Open port 3001 in your firewall
3. Access via `http://your-server-ip:3001`

## Security Notes

- Change default PostgreSQL password in production
- Use environment variables for sensitive data
- Set up proper firewall rules
- Enable SSL for database connections in production
- Keep your database backed up regularly

## Support

For issues or questions, check the application logs:
- Backend: Console output from `npm run dev:server`
- Database: `docker logs flavor-junkie-db`
