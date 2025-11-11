import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const runSqlFile = async (filePath) => {
  const sql = fs.readFileSync(filePath, "utf-8");
  await pool.query(sql);
};

const bootstrap = async () => {
  try {
    const migrationsPath = path.resolve(__dirname, "../src/db/create_tables.sql");
    const seedPath = path.resolve(__dirname, "../src/db/seed_rooms.sql");

    await runSqlFile(migrationsPath);
    await runSqlFile(seedPath);

    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  } finally {
    await pool.end();
  }
};

bootstrap();
