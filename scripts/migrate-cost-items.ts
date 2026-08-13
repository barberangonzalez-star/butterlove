/**
 * Migración: el costo de un envase, desglosado a mano.
 *
 * Crea `cost_items`, donde cada línea es "cómo se llama" y "cuánto le pone al
 * costo de un frasco". Reemplaza a las recetas como origen del costo: las
 * recetas piden insumos con unidades y precios de compra, y llenarlas para
 * saber cuánto deja un frasco era demasiado trabajo.
 *
 * `recipe_items` y `supply_items` se quedan como están: siguen siendo lo que
 * descuenta inventario cuando se registra una venta.
 *
 * Es aditiva: no borra ni reescribe nada.
 *
 * Uso:
 *   npx dotenv -e .env.local -- tsx scripts/migrate-cost-items.ts
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL en el entorno.");

const sql = neon(url);

const STATEMENTS = [
  `create table if not exists cost_items (
     id serial primary key,
     product_size_id integer not null references product_sizes(id) on delete cascade,
     name text not null,
     amount_usd numeric(10, 4) not null,
     position integer not null default 0
   )`,

  `create index if not exists cost_items_size_idx
     on cost_items (product_size_id)`,
];

async function main() {
  await sql.transaction(STATEMENTS.map((statement) => sql.query(statement)));

  const [{ count: sizes }] = await sql`select count(*)::int from product_sizes`;
  const [{ count: withCost }] =
    await sql`select count(*)::int from product_sizes where extra_cost_usd > 0`;
  const [{ count: lines }] = await sql`select count(*)::int from cost_items`;

  console.log(`Tamaños en el catálogo:    ${sizes}`);
  console.log(`Con costo escrito:         ${withCost}`);
  console.log(`Líneas de costo cargadas:  ${lines}`);
  console.log("Listo. El desglose se carga desde Finanzas, con la calculadora.");
}

main().catch((error) => {
  console.error("La migración falló. No quedó nada a medias.");
  console.error(error);
  process.exit(1);
});
