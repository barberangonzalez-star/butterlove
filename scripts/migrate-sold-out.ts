/**
 * Migration: a "sold out" switch per product.
 *
 * Adds `products.sold_out`, which the admin panel flips by hand. It starts as
 * `false` for every product, so the shop looks exactly as it did before this
 * runs.
 *
 * Additive: it neither deletes nor rewrites anything.
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx tsx scripts/migrate-sold-out.ts
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is missing from the environment.");

const sql = neon(url);

async function main() {
  await sql`alter table products add column if not exists sold_out boolean not null default false`;
  console.log("Done. products.sold_out is in place.");
}

main();
