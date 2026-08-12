/**
 * Migración: la libreta de clientes.
 *
 * Crea la tabla `customers`, le agrega a `sales` la columna `customer_id`, y
 * rescata como fichas a todos los clientes que ya estaban anotados dentro de
 * las ventas: cada nombre/teléfono distinto se vuelve un cliente y sus ventas
 * quedan enganchadas a él.
 *
 * Dos ventas son del mismo cliente si comparten el teléfono (normalizado: sin
 * guiones, sin +58, sin el 0 inicial) o, cuando no hay teléfono, el nombre.
 *
 * `drizzle-kit push` alcanza para crear la tabla y la columna, pero no hace el
 * rescate; correr este script hace las dos cosas y es idempotente: si ya corrió
 * no duplica clientes ni re-enlaza ventas que ya tienen ficha.
 *
 * Uso:
 *   npx dotenv -e .env.local -- tsx scripts/migrate-customers.ts
 */
import { neon } from "@neondatabase/serverless";

// Las migraciones van por la conexión directa, no por el pooler.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL en el entorno.");

const sql = neon(url);

const CREATE_TABLE = `
  create table if not exists customers (
    id serial primary key,
    name text not null,
    phone text,
    phone_key text,
    email text,
    instagram text,
    state text,
    city text,
    delivery_zone text,
    address text,
    notes text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
  )
`;

const CREATE_CUSTOMER_INDEX = `
  create index if not exists customers_phone_key_idx on customers (phone_key)
`;

const ADD_SALE_COLUMN = `
  alter table sales
    add column if not exists customer_id integer
    references customers(id) on delete set null
`;

const CREATE_SALE_INDEX = `
  create index if not exists sales_customer_id_idx on sales (customer_id)
`;

/**
 * Cada venta con su cliente ya normalizado. Va a una tabla temporal porque el
 * mismo cálculo lo necesitan los dos pasos siguientes: crear las fichas y
 * enlazar las ventas.
 *
 * `pkey` es el teléfono reducido a dígitos, con el mismo criterio que
 * `phoneKey()` en src/lib/customers.ts: se quita el +58 sólo si debajo queda
 * un número completo, se quita el 0 inicial, y si no llegan a 7 dígitos se
 * descarta en vez de arriesgar juntar a dos clientes distintos.
 */
const BUILD_TEMP = `
  create temp table sale_people on commit drop as
  select
    s.id,
    nullif(trim(s.customer_name), '') as name,
    nullif(trim(s.customer_phone), '') as phone,
    nullif(trim(s.customer_email), '') as email,
    s.delivery_state as state,
    s.sale_date,
    k.pkey
  from sales s
  cross join lateral (
    select case when length(c.d) >= 7 then c.d end as pkey
    from (
      select case when left(b.x, 1) = '0' then substr(b.x, 2) else b.x end as d
      from (
        select case
                 when left(a.r, 2) = '58' and length(a.r) >= 12 then substr(a.r, 3)
                 else a.r
               end as x
        from (
          select regexp_replace(coalesce(s.customer_phone, ''), '\\D', '', 'g') as r
        ) a
      ) b
    ) c
  ) k
  where nullif(trim(s.customer_name), '') is not null
     or k.pkey is not null
`;

/**
 * Una ficha por cliente distinto. De sus ventas se toma la más reciente para
 * el nombre y el contacto: si alguien cambió de número, el que queda es el
 * último con el que compró.
 */
const INSERT_CUSTOMERS = `
  insert into customers (name, phone, phone_key, email, state)
  select
    coalesce(p.name, p.phone, 'Cliente sin nombre'),
    p.phone,
    p.pkey,
    p.email,
    p.state
  from (
    select distinct on (coalesce(pkey, lower(name)))
      name, phone, pkey, email, state
    from sale_people
    order by coalesce(pkey, lower(name)), sale_date desc, id desc
  ) p
  where not exists (
    select 1 from customers c
    where (p.pkey is not null and c.phone_key = p.pkey)
       or (p.pkey is null and p.name is not null and lower(c.name) = lower(p.name))
  )
`;

const LINK_SALES = `
  update sales s
  set customer_id = c.id
  from sale_people p, customers c
  where s.id = p.id
    and s.customer_id is null
    and (
      (p.pkey is not null and c.phone_key = p.pkey)
      or (p.pkey is null and p.name is not null and lower(c.name) = lower(p.name))
    )
`;

async function main() {
  const [{ count: salesTotal }] = await sql`select count(*)::int from sales`;
  console.log(`Ventas en la base: ${salesTotal}`);

  // Todo en una transacción: la tabla temporal muere con ella, y si algo falla
  // no queda ni la tabla a medias ni ventas enlazadas a clientes inexistentes.
  await sql.transaction([
    sql.query(CREATE_TABLE),
    sql.query(CREATE_CUSTOMER_INDEX),
    sql.query(ADD_SALE_COLUMN),
    sql.query(CREATE_SALE_INDEX),
    sql.query(BUILD_TEMP),
    sql.query(INSERT_CUSTOMERS),
    sql.query(LINK_SALES),
  ]);

  const [{ count: customers }] = await sql`select count(*)::int from customers`;
  const [{ count: linked }] =
    await sql`select count(*)::int from sales where customer_id is not null`;
  const [{ count: nameless }] =
    await sql`select count(*)::int from sales
              where customer_id is null
                and coalesce(trim(customer_name), '') = ''`;

  console.log(`Clientes en la libreta: ${customers}`);
  console.log(`Ventas enlazadas:       ${linked}`);
  console.log(`Ventas sin cliente:     ${nameless} (nunca se les anotó uno)`);
  console.log("Listo.");
}

main().catch((error) => {
  console.error("La migración falló. No quedó nada a medias.");
  console.error(error);
  process.exit(1);
});
