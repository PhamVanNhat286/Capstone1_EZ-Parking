import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "ez_space",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Helper query function
export const query = (text: string, params?: any[]) => pool.query(text, params);

export const testDbConnection = async () => {
  try {
    const res = await pool.query("SELECT current_database(), NOW() AS current_time;");
    console.log(`[Database] Connected to: ${res.rows[0].current_database} at ${res.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.error("[Database] Connection error:", error);
    return false;
  }
};
