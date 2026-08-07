/**
 * Migración 2: la promoción pasa de la venta a la línea.
 *
 * Va después de `migrate-sale-items.ts`. Hace tres cosas:
 *
 *  1. `promotions` gana producto, tamaño y precio del combo. Hasta ahora eso
 *     vivía sólo dentro del texto de la descripción, así que el formulario de
 *     ventas no podía ofrecer el combo con su precio ya calculado.
 *  2. `sale_items` gana promotion_id y promotion_label, y hereda la promo que
 *     tenía su venta.
 *  3. `sales` pierde promotion_id y promotion_label.
 *
 * Como en la migración anterior: NO uses `drizzle-kit push`, y las columnas
 * viejas sólo se borran después de verificar que las promos se copiaron.
 *
 * Uso:
 *   npx dotenv -e .env.local -- tsx scripts/migrate-promo-lines.ts
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL en el entorno.");

const sql = neon(url);

const ADD_PROMO_COLUMNS = `
  alter table promotions
    add column if not exists product_id integer references products(id) on delete set null,
    add column if not exists grams integer,
    add column if not exists bundle_price numeric(10, 2)
`;

const ADD_ITEM_COLUMNS = `
  alter table sale_items
    add column if not exists promotion_id integer references promotions(id) on delete set null,
    add column if not exists promotion_label text
`;

/**
 * Rellena las dos promos que ya existen. Se emparejan por título y el producto
 * por nombre, así que si alguna se renombró queda sin datos y se completa a
 * mano desde el panel — nunca se adivina.
 */
const BACKFILL_PROMOS = `
do $$
begin
  update promotions p set
    product_id = (select id from products where lower(name) = 'maní'),
    grams = 230,
    bundle_price = 10.00
  where p.title = 'Combo 2 maní 230g' and p.bundle_price is null;

  update promotions p set
    product_id = (select id from products where lower(name) = 'merey'),
    grams = 230,
    bundle_price = 17.00
  where p.title = 'Combo 2 merey 230g' and p.bundle_price is null;
end $$;
`;

const MOVE_AND_DROP = `
do $$
declare
  sales_with_promo int;
  items_with_promo int;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'sales' and column_name = 'promotion_id'
  ) then
    raise notice 'La promo ya no está en sales: no hay nada que mover.';
    return;
  end if;

  select count(*) into sales_with_promo
  from sales where promotion_id is not null;

  -- Las ventas de antes tenían una sola línea, así que la promo va a esa. Si
  -- alguna tuviera varias, la promo se aplicaría a la primera y no se
  -- duplicaría el descuento en las demás.
  update sale_items i set
    promotion_id = s.promotion_id,
    promotion_label = s.promotion_label
  from sales s
  where i.sale_id = s.id
    and s.promotion_id is not null
    and i.position = 0;

  select count(*) into items_with_promo
  from sale_items where promotion_id is not null;

  if items_with_promo <> sales_with_promo then
    raise exception
      'Migración abortada: % ventas con promo pero % líneas la recibieron.',
      sales_with_promo, items_with_promo;
  end if;

  alter table sales
    drop column promotion_id,
    drop column promotion_label;

  raise notice 'Movidas % promos de venta a línea.', sales_with_promo;
end $$;
`;

async function main() {
  const [{ count: promoCount }] = await sql`select count(*)::int from promotions`;
  console.log(`Promociones en la base: ${promoCount}`);

  await sql.transaction([
    sql.query(ADD_PROMO_COLUMNS),
    sql.query(ADD_ITEM_COLUMNS),
    sql.query(BACKFILL_PROMOS),
    sql.query(MOVE_AND_DROP),
  ]);

  const rows = await sql`
    select title, product_id, grams, bundle_price::text as bundle_price,
           bundle_quantity
    from promotions order by id
  `;
  console.log("\nPromociones después:");
  console.table(rows);

  const incomplete = rows.filter((r) => r.bundle_price === null);
  if (incomplete.length > 0) {
    console.log(
      `\nOjo: ${incomplete.length} promo(s) sin producto/precio. Complétalas ` +
        "desde el panel para que aparezcan en el selector de ventas:",
    );
    for (const row of incomplete) console.log(`  - ${row.title}`);
  }
  console.log("\nListo.");
}

main().catch((error) => {
  console.error("La migración falló. No se borró ninguna columna.");
  console.error(error);
  process.exit(1);
});
