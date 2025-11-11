import { Pool } from "pg";

let pool;

export const initializePool = async () => {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 10,
    idleTimeoutMillis: 30000
  });

  await pool.query("SELECT 1");
  console.log("Database connection established");
  return pool;
};

export const getPool = () => {
  if (!pool) {
    throw new Error("Pool has not been initialized. Call initializePool first.");
  }
  return pool;
};
