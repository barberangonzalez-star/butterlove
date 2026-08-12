/**
 * Migración: costos, gastos y ganancias.
 *
 * Agrega lo que hace falta para medir cuánto cuesta hacer cada envase y cuánto
 * queda al final del mes:
 *
 *   - `supply_items`: cómo se compra el insumo (precio y cuánto rinde).
 *   - `product_sizes.extra_cost_usd`: lo que no sale de la receta.
 *   - `recipe_items`: qué insumos lleva cada envase y cuántos.
 *   - `sale_items.unit_cost_usd`: el costo congelado el día de la venta.
 *   - `sales.delivery_cost_usd`: lo que costó llevar el pedido.
 *   - `expenses`: anuncios, sueldos, comisiones.
 *   - `replacement_rates`: a qué tasa se reponen los dólares cada mes.
 *
 * Todo es aditivo: no borra ni reescribe nada de lo que ya está. Las ventas
 * viejas quedan con `unit_cost_usd` en null, que es la verdad — de esas no se
 * sabe qué costaron.
 *
 * Uso:
 *   npx dotenv -e .env.local -- tsx scripts/migrate-costs.ts
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL en el entorno.");

const sql = neon(url);

const STATEMENTS = [
  `alter table supply_items
     add column if not exists purchase_price_usd numeric(10, 2),
     add column if not exists purchase_quantity integer`,

  `alter table product_sizes
     add column if not exists extra_cost_usd numeric(10, 2) not null default 0`,

  `create table if not exists recipe_items (
     id serial primary key,
     product_size_id integer not null references product_sizes(id) on delete cascade,
     supply_item_id integer not null references supply_items(id) on delete restrict,
     quantity numeric(12, 3) not null,
     position integer not null default 0
   )`,

  `create index if not exists recipe_items_size_idx
     on recipe_items (product_size_id)`,

  `alter table sale_items
     add column if not exists unit_cost_usd numeric(12, 4)`,

  `alter table sales
     add column if not exists delivery_cost_usd numeric(10, 2)`,

  `create table if not exists expenses (
     id serial primary key,
     expense_date date not null,
     category text not null,
     kind text not null default 'operativo',
     amount_usd numeric(10, 2) not null,
     description text,
     created_at timestamp not null default now()
   )`,

  `create index if not exists expenses_date_idx on expenses (expense_date)`,

  `create table if not exists replacement_rates (
     month text primary key,
     rate numeric(12, 4) not null,
     notes text,
     updated_at timestamp not null default now()
   )`,
];

async function main() {
  await sql.transaction(STATEMENTS.map((statement) => sql.query(statement)));

  const [{ count: sizes }] = await sql`select count(*)::int from product_sizes`;
  const [{ count: supplies }] = await sql`select count(*)::int from supply_items`;
  const [{ count: priced }] =
    await sql`select count(*)::int from supply_items
              where purchase_price_usd is not null and purchase_quantity > 0`;

  console.log(`Tamaños de producto:      ${sizes} (cada uno necesita su receta)`);
  console.log(`Insumos registrados:      ${supplies}`);
  console.log(`Insumos con precio:       ${priced}`);
  console.log("Listo. Falta cargar precios de insumos y recetas desde el admin.");
}

main().catch((error) => {
  console.error("La migración falló. No quedó nada a medias.");
  console.error(error);
  process.exit(1);
});
