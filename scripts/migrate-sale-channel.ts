/**
 * Migración: por qué canal se vendió, al detal o al mayor.
 *
 * Sin esta columna las dos ventas se mezclan, y como el precio al mayor es
 * ~30% más bajo, la ganancia por frasco de Finanzas queda siendo un promedio
 * entre dos negocios distintos: deja de servir para decidir en cualquiera de
 * los dos.
 *
 * Va en la venta y no en el cliente a propósito. El canal es de *esa*
 * transacción: el mismo señor puede llevarse una caja para su bodega en marzo
 * y dos frascos para su casa en abril, y marcarlo a él como mayorista mentiría
 * en la segunda.
 *
 * Todo lo ya registrado queda como `detal`, que es lo que era: la venta al
 * mayor no existía cuando se escribieron.
 *
 * Es aditiva: no borra ni reescribe nada.
 *
 * Uso:
 *   npx dotenv -e .env.local -- tsx scripts/migrate-sale-channel.ts
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL en el entorno.");

const sql = neon(url);

const STATEMENTS = [
  `alter table sales
     add column if not exists channel text not null default 'detal'`,

  // El parte del canal filtra por esto en casi toda consulta que hace.
  `create index if not exists sales_channel_idx on sales (channel)`,

  /**
   * Marca al cliente que compra para revender. No decide el canal de la venta
   * —eso lo dice `sales.channel`—; sólo hace que el formulario proponga el
   * correcto y cotice con los precios de caja sin que haya que acordarse.
   */
  `alter table customers
     add column if not exists is_reseller boolean not null default false`,
];

async function main() {
  await sql.transaction(STATEMENTS.map((statement) => sql.query(statement)));

  const [{ count: total }] = await sql`select count(*)::int from sales`;
  const [{ count: mayor }] =
    await sql`select count(*)::int from sales where channel = 'mayor'`;
  const [{ count: resellers }] =
    await sql`select count(*)::int from customers where is_reseller`;

  console.log(`Ventas registradas:     ${total}`);
  console.log(`Marcadas como mayor:    ${mayor}`);
  console.log(`Clientes mayoristas:    ${resellers}`);
  console.log(
    "Listo. Las ventas viejas quedaron en 'detal'; el canal se elige al registrar.",
  );
}

main().catch((error) => {
  console.error("La migración falló. No quedó nada a medias.");
  console.error(error);
  process.exit(1);
});
