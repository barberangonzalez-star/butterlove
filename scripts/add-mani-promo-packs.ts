/**
 * Los packs de maní de la landing /landingpromomani.
 *
 * Sube el Dúo Maní a $12.99 y agrega el Trío Maní a $17.99. El trío nace
 * fuera de la vitrina (`in_store = false`): la promo se vende sólo por el link
 * de la landing, así que no aparece en la tienda, ni en el sitemap, ni tiene
 * página pública. Existir como producto sí importa: así el pedido de WhatsApp
 * lo nombra bien, el panel puede registrarle ventas y el inventario lo cuenta
 * como cualquier otro frasco.
 *
 * El dúo sube de $10.00 a $12.99 porque la landing lo cotiza a ese precio, y
 * dos precios distintos para el mismo producto es la clase de detalle que un
 * cliente encuentra antes que uno.
 *
 * Los tres precios forman escalera —$6.99, $6.50 y $6.00 el frasco—: cada
 * pack tiene que dejar el frasco más barato que el anterior, o el de tres no
 * da ninguna razón para llevarlo.
 *
 * Idempotente: se puede correr varias veces.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/add-mani-promo-packs.ts
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

/** Precio nuevo del dúo, el mismo que muestra la landing. */
const DUO_PRICE = "12.99";

/** 690g = los tres frascos de 230g juntos. */
const TRIO = {
  key: "trio-mani",
  name: "Trío Maní",
  tagline: "Tres frascos de la clásica, al mejor precio por frasco.",
  description:
    "Tres frascos de 230g de mantequilla de maní: un solo ingrediente, maní tostado y molido despacio, sin azúcar agregada. El pack para la casa donde el frasco no llega al fin de semana.",
  image: "/products/mani.png",
  heroImage: "/hero/mani.png",
  bgClass: "bg-mani-bg",
  accentHex: "#F3B94D",
  grams: 690,
  price: "17.99",
  sortOrder: 8,
};

const TRIO_BADGES = ["3 frascos de 230g", "Precio de combo", "100% natural"];

async function main() {
  const duo = await sql`
    update product_sizes s
    set price = ${DUO_PRICE}
    from products p
    where s.product_id = p.id and p.key = 'duo-mani' and s.grams = 460
    returning s.id`;
  console.log(`Dúo Maní -> $${DUO_PRICE} (${duo.length} fila/s)`);

  const [row] = await sql`
    insert into products
      (key, name, kind, tagline, description, image, hero_image, bg_class,
       accent_hex, badges, in_store, sort_order)
    values
      (${TRIO.key}, ${TRIO.name}, 'combo', ${TRIO.tagline}, ${TRIO.description},
       ${TRIO.image}, ${TRIO.heroImage}, ${TRIO.bgClass}, ${TRIO.accentHex},
       ${JSON.stringify(TRIO_BADGES)}::jsonb, false, ${TRIO.sortOrder})
    on conflict (key) do update set
      name = excluded.name,
      kind = excluded.kind,
      tagline = excluded.tagline,
      description = excluded.description,
      image = excluded.image,
      hero_image = excluded.hero_image,
      bg_class = excluded.bg_class,
      accent_hex = excluded.accent_hex,
      badges = excluded.badges,
      sort_order = excluded.sort_order,
      updated_at = now()
    returning id`;

  // El stock no se toca al reinsertar: si el trío ya tenía frascos contados,
  // volver a correr el script no los borra.
  await sql`
    insert into product_sizes (product_id, grams, price)
    select ${row.id}, ${TRIO.grams}, ${TRIO.price}
    where not exists (
      select 1 from product_sizes
      where product_id = ${row.id} and grams = ${TRIO.grams}
    )`;
  await sql`
    update product_sizes set price = ${TRIO.price}
    where product_id = ${row.id} and grams = ${TRIO.grams}`;

  console.log(`Trío Maní -> $${TRIO.price} (fuera de la vitrina)`);
  console.log("\nListo.");
}

main();
