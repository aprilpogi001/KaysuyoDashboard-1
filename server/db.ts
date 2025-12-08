import { drizzle } from "drizzle-orm/neon-http";
import { neon, NeonQueryFunction } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn("DATABASE_URL environment variable is not set. Database features will be limited.");
}

const sql: NeonQueryFunction<boolean, boolean> | null = DATABASE_URL ? neon(DATABASE_URL) : null;
export const db = sql ? drizzle(sql) : null as any;
