import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import * as dotenv from 'dotenv';

dotenv.config();

// Function to create a new connection pool.
export const createPool = () => {
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;
  const database = process.env.SQL_DB_NAME;
  const host = process.env.SQL_HOST;

  if (user && password && database && host) {
    const connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@/${encodeURIComponent(database)}?host=${encodeURIComponent(host)}`;
    return new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 15000,
    });
  }

  return new Pool({
    host,
    user,
    password,
    database,
    max: 10,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 15000,
  });
};

// Create a pool instance.
const pool = createPool();

// Prevent unhandled pool-level errors from crashing the application
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
