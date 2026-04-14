import { Pool, types } from 'pg';

// PostgreSQL numeric columns come back as strings by default.
// Parse them once here so the API returns real numbers to the frontend.
types.setTypeParser(1700, (value) => parseFloat(value));

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'flavor_junkie',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

const pool = new Pool(poolConfig);

const shouldLogQueries = process.env.DB_LOG_QUERIES === 'true';

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (shouldLogQueries) {
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
  }
  return res;
}

export default pool;
