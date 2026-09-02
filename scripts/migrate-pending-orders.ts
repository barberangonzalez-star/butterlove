/**
 * Migración: los pedidos que entran por la tienda y los teléfonos a los que se
 * les avisa.
 *
 * `pending_orders` guarda lo que llenó el cliente al terminar el checkout,
 * antes de que nadie haya pagado. No es una venta y por eso no vive dentro de
 * `sales`: si lo fuera, cada consulta de Finanzas, Mayoreo, clientes y stock
 * tendría que acordarse de filtrarla, y la que se olvidara contaría plata que
 * no entró. Al confirmar se convierte en venta de verdad y la fila se borra.
 *
 * `push_subscriptions` es a qué navegadores mandarle la notificación. El
 * endpoint es único: reactivar en el mismo teléfono actualiza las llaves en
 * vez de duplicar el aviso.
 *
 * Es aditiva: no borra ni reescribe nada de lo que ya está.
 *
 * Uso:
 *   npx dotenv -e .env.local -- tsx scripts/migrate-pending-orders.ts
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL en el entorno.");

const sql = neon(url);

const STATEMENTS = [
  `create table if not exists pending_orders (
     id serial primary key,
     items jsonb not null default '[]'::jsonb,
     subtotal_usd numeric(10, 2) not null,
     delivery_fee_usd numeric(10, 2),
     amount_usd numeric(10, 2) not null,
     customer_name text,
     customer_phone text,
     payment_method text,
     payment_claimed boolean not null default false,
     delivery_method text,
     delivery_zone text,
     address text,
     courier text,
     id_card text,
     agency text,
     created_at timestamp not null default now()
   )`,

  // La bandeja se lee siempre del más nuevo al más viejo.
  `create index if not exists pending_orders_created_at_idx
     on pending_orders (created_at desc)`,

  `create table if not exists push_subscriptions (
     id serial primary key,
     endpoint text not null unique,
     p256dh text not null,
     auth text not null,
     user_agent text,
     created_at timestamp not null default now()
   )`,
];

async function main() {
  await sql.transaction(STATEMENTS.map((statement) => sql.query(statement)));

  const [{ count: pending }] =
    await sql`select count(*)::int from pending_orders`;
  const [{ count: subs }] =
    await sql`select count(*)::int from push_subscriptions`;

  console.log(`Pedidos pendientes:     ${pending}`);
  console.log(`Teléfonos suscritos:    ${subs}`);
  console.log(
    "Listo. Los pedidos de la tienda ya tienen dónde caer, y las notificaciones dónde apuntar.",
  );
}

main().catch((error) => {
  console.error("La migración falló. No quedó nada a medias.");
  console.error(error);
  process.exit(1);
});
