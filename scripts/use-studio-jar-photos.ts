/**
 * Swaps the cut-out jar photos for the new studio shots of each flavour.
 *
 * The studio shots bring their own background, so every product that showed
 * the old cut-out is pointed at the new file and stops being drawn as a
 * cut-out — like the Chocomaní already is. The promo landings keep the old
 * cut-outs, which they reference directly and float over their own colours.
 *
 * Only `image` changes; the ambience photo in `/hero/` stays as it is.
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx tsx scripts/use-studio-jar-photos.ts
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is missing from the environment.");

const sql = neon(url);

const FLAVOURS = ["mani", "pistacho", "merey", "almendras"];

async function main() {
  for (const flavour of FLAVOURS) {
    const rows = await sql`
      update products
      set image = ${`/products/${flavour}-estudio.webp`}, image_cutout = false
      where image = ${`/products/${flavour}.webp`}
      returning key`;
    for (const row of rows) console.log(`${row.key} -> ${flavour}-estudio.webp`);
  }
}

main();
