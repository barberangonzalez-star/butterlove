/**
 * Merey promo (21 Oct 2026): the 230g jar at $15 with shipping included, and
 * the store drops the 350g size for every flavour.
 *
 * Free shipping itself is not decided here but by `FREE_SHIPPING_KEYS` in
 * `src/lib/config.ts`, which names `merey`.
 *
 * The 350g sizes had no stock, recipe or cost lines. Past sales store the
 * grams on the sale itself, so deleting the sizes leaves their history intact.
 * Prices before this script, in case they are ever needed again:
 *   merey 230g $12.99 · 350g: mani $8.00, pistacho $32.00, almendras $15.00,
 *   merey $15.00, chocomani $10.00.
 *
 * Idempotent: safe to run more than once.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/launch-merey-free-shipping.ts
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const MEREY_PRICE = "15.00";

async function main() {
  const removed = await sql`
    delete from product_sizes ps
    using products p
    where p.id = ps.product_id and ps.grams = 350
    returning p.key, ps.price`;
  console.log(`350g sizes removed: ${removed.length}`, removed);

  const updated = await sql`
    update product_sizes ps
    set price = ${MEREY_PRICE}
    from products p
    where p.id = ps.product_id and p.key = 'merey' and ps.grams = 230
    returning ps.price`;
  if (updated.length !== 1) throw new Error("merey 230g size not found");

  // The sitemap's lastModified reads this, so Google comes back for the new
  // price. Every flavour lost a size, so all of them changed.
  await sql`
    update products set updated_at = now()
    where kind = 'single'`;

  console.log(`merey 230g now $${updated[0].price}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
