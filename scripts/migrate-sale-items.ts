/**
 * Migración: una venta pasa de tener un solo producto a tener varias líneas.
 *
 * `sales` guardaba product_id / product_name / grams / quantity /
 * unit_price_usd en la propia fila. Esto crea `sale_items`, copia cada venta
 * existente como su única línea y recién entonces borra esas columnas.
 *
 * NO uses `drizzle-kit push` para este cambio: push borraría las columnas
 * antes de copiar nada y se perderían todas las ventas registradas.
 *
 * Es idempotente: si ya corrió, no hace nada. Y no borra las columnas viejas
 * a menos que cada venta tenga su línea, así que un fallo a mitad de camino
 * deja los datos originales intactos.
 *
 * Uso:
 *   npx dotenv -e .env.local -- tsx scripts/migrate-sale-items.ts
 */
import { neon } from "@neondatabase/serverless";

// Las migraciones van por la conexión directa, no por el pooler.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL en el entorno.");

const sql = neon(url);

const CREATE_TABLE = `
  create table if not exists sale_items (
    id serial primary key,
    sale_id integer not null references sales(id) on delete cascade,
    product_id integer references products(id) on delete set null,
    product_name text not null,
    grams integer not null,
    quantity integer not null,
    unit_price_usd numeric(10, 2) not null,
    position integer not null default 0
  )
`;

const CREATE_INDEX = `
  create index if not exists sale_items_sale_id_idx on sale_items (sale_id)
`;

/**
 * La copia y el borrado van dentro de un bloque PL/pgSQL para que la
 * verificación ocurra en el servidor, entre ambos pasos: si los conteos no
 * cuadran, la excepción revierte la transacción entera y las columnas viejas
 * siguen ahí.
 */
const COPY_AND_DROP = `
do $$
declare
  sales_count int;
  with_items_count int;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'sales' and column_name = 'product_name'
  ) then
    raise notice 'Las columnas viejas ya no existen: no hay nada que migrar.';
    return;
  end if;

  insert into sale_items
    (sale_id, product_id, product_name, grams, quantity, unit_price_usd, position)
  select s.id, s.product_id, s.product_name, s.grams, s.quantity, s.unit_price_usd, 0
  from sales s
  where not exists (select 1 from sale_items i where i.sale_id = s.id);

  select count(*) into sales_count from sales;
  select count(distinct sale_id) into with_items_count from sale_items;

  if sales_count <> with_items_count then
    raise exception
      'Migración abortada: % ventas pero sólo % quedaron con líneas.',
      sales_count, with_items_count;
  end if;

  alter table sales
    drop column product_id,
    drop column product_name,
    drop column grams,
    drop column quantity,
    drop column unit_price_usd;

  raise notice 'Migradas % ventas a sale_items.', sales_count;
end $$;
`;

async function main() {
  const [{ count: salesBefore }] = await sql`select count(*)::int from sales`;
  console.log(`Ventas en la base: ${salesBefore}`);

  // Los tres pasos van en una sola transacción: o queda todo, o no queda nada.
  await sql.transaction([
    sql.query(CREATE_TABLE),
    sql.query(CREATE_INDEX),
    sql.query(COPY_AND_DROP),
  ]);

  const [{ count: itemsAfter }] = await sql`select count(*)::int from sale_items`;
  const [{ count: salesAfter }] = await sql`select count(*)::int from sales`;

  console.log(`Ventas después:   ${salesAfter}`);
  console.log(`Líneas creadas:   ${itemsAfter}`);

  if (salesAfter !== salesBefore) {
    throw new Error("El número de ventas cambió: revisa la base antes de seguir.");
  }
  console.log("Listo.");
}

main().catch((error) => {
  console.error("La migración falló. No se borró ninguna columna.");
  console.error(error);
  process.exit(1);
});
