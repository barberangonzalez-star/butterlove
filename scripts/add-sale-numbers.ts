/**
 * Le pone número a las ventas que no lo tengan: el de la venta y el del mes.
 *
 * Idempotente y seguro de repetir: sólo toca las que están sin número y sigue
 * desde el más alto ya repartido, así que nunca reparte un número dos veces ni
 * renumera lo ya puesto. Sirve para el relleno inicial y también para las que
 * se hayan registrado con una versión del panel que todavía no las numeraba.
 *
 * El número de la venta va en el orden en que se registraron, que es como se
 * repartió siempre; el del mes, en el cronológico —fecha y, a igual fecha, el
 * orden de registro—, que es como se leen en la pantalla de ventas.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/add-sale-numbers.ts
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`alter table sales add column if not exists sale_number integer`;
  await sql`alter table sales add column if not exists monthly_number integer`;

  const numeradas = await sql`
    with numeradas as (
      select
        s.id,
        (select coalesce(max(sale_number), 0) from sales)
          + row_number() over (order by s.id) as n
      from sales s
      where s.sale_number is null
    )
    update sales s
    set sale_number = numeradas.n
    from numeradas
    where numeradas.id = s.id
    returning s.id`;

  console.log(
    numeradas.length
      ? `numeradas ${numeradas.length} venta/s`
      : "todas las ventas ya tienen número",
  );

  const delMes = await sql`
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
    delMes.length
      ? `numeradas ${delMes.length} venta/s dentro de su mes`
      : "todas las ventas ya tienen número del mes",
  );

  const summary = await sql`
    select
      to_char(sale_date, 'YYYY-MM') as mes,
      count(*)::int as ventas,
      min(sale_number)::int as desde,
      max(sale_number)::int as hasta,
      max(monthly_number)::int as ultimo_del_mes,
      count(*) filter (where sale_number is null)::int as sin_numero
    from sales
    group by 1
    order by 1`;
  console.table(summary);
}

main();
