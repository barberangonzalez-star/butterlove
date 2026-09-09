/**
 * Le pone número de venta dentro del mes a las ventas que no lo tengan.
 *
 * Idempotente y seguro de repetir: sólo toca las que están sin número y sigue
 * desde el más alto que ya tenga ese mes, así que nunca reparte un número dos
 * veces ni renumera lo ya puesto. Sirve para el relleno inicial y también para
 * las que se hayan registrado con una versión del panel que todavía no las
 * numeraba.
 *
 * El orden es el cronológico —fecha y, a igual fecha, el orden en que se
 * registraron—, que es como se leen en la pantalla de ventas.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/add-sale-numbers.ts
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`alter table sales add column if not exists monthly_number integer`;

  const rows = await sql`
    with maximos as (
      select to_char(sale_date, 'YYYY-MM') as mes, max(monthly_number) as tope
      from sales
      group by 1
    ),
    numeradas as (
      select
        s.id,
        coalesce(m.tope, 0) + row_number() over (
          partition by to_char(s.sale_date, 'YYYY-MM')
          order by s.sale_date, s.id
        ) as n
      from sales s
      left join maximos m on m.mes = to_char(s.sale_date, 'YYYY-MM')
      where s.monthly_number is null
    )
    update sales s
    set monthly_number = numeradas.n
    from numeradas
    where numeradas.id = s.id
    returning s.id`;

  console.log(
    rows.length
      ? `numeradas ${rows.length} venta/s`
      : "todas las ventas ya tienen número",
  );

  const summary = await sql`
    select
      to_char(sale_date, 'YYYY-MM') as mes,
      count(*)::int as ventas,
      max(monthly_number)::int as ultimo,
      count(*) filter (where monthly_number is null)::int as sin_numero
    from sales
    group by 1
    order by 1`;
  console.table(summary);
}

main();
