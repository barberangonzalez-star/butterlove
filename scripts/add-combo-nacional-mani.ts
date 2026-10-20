/**
 * El combo de la landing /envio-gratis-mani: dos frascos de maní de 230g a
 * $18.99, con el envío pagado a cualquier parte del país.
 *
 * Nace fuera de la vitrina (`in_store = false`), igual que los packs de
 * /promomani: se vende sólo por el link de la landing. Existir como producto
 * es lo que hace que el pedido de WhatsApp lo nombre bien, que el panel le
 * registre ventas y que el inventario descuente sus dos frascos de maní.
 *
 * El precio lleva el flete adentro: dos frascos sueltos cuestan menos, pero el
 * flete se paga aparte en la agencia. Que el checkout no cobre el envío con
 * este combo no lo decide este script sino `FREE_SHIPPING_KEYS` en
 * `src/lib/config.ts`, que nombra la misma `key`.
 *
 * El precio se cambia acá y no sólo en la base: la última consulta lo fija,
 * así que un script con el número viejo revierte el cambio la próxima vez que
 * alguien lo corra.
 *
 * Idempotente: se puede correr varias veces.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/add-combo-nacional-mani.ts
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

/** 460g = los dos frascos de 230g juntos. */
const COMBO = {
  key: "combo-nacional-mani",
  name: "Combo Envío Nacional - 2 Maní",
  tagline: "Dos frascos de la clásica, con el envío pagado a toda Venezuela.",
  description:
    "Dos frascos de 230g de mantequilla de maní: un solo ingrediente, maní tostado y molido despacio, sin azúcar agregada. El envío va incluido: delivery en Caracas o encomienda pagada al resto del país.",
  // Una foto con su fondo, no un recorte: la tarjeta la muestra entera.
  image: "/products/duo-mani.webp",
  heroImage: "/hero/duo-mani.webp",
  bgClass: "bg-mani-bg",
  accentHex: "#F3B94D",
  grams: 460,
  price: "18.99",
  sortOrder: 12,
};

const COMBO_BADGES = ["2 frascos de 230g", "Envío incluido", "100% natural"];

async function main() {
  const [row] = await sql`
    insert into products
      (key, name, kind, tagline, description, image, hero_image, bg_class,
       accent_hex, badges, in_store, sort_order, image_cutout)
    values
      (${COMBO.key}, ${COMBO.name}, 'combo', ${COMBO.tagline}, ${COMBO.description},
       ${COMBO.image}, ${COMBO.heroImage}, ${COMBO.bgClass}, ${COMBO.accentHex},
       ${JSON.stringify(COMBO_BADGES)}::jsonb, false, ${COMBO.sortOrder}, false)
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
      image_cutout = excluded.image_cutout,
      updated_at = now()
    returning id`;

  // El stock no se toca al reinsertar: si el combo ya tenía frascos contados,
  // volver a correr el script no los borra.
  await sql`
    insert into product_sizes (product_id, grams, price)
    select ${row.id}, ${COMBO.grams}, ${COMBO.price}
    where not exists (
      select 1 from product_sizes
      where product_id = ${row.id} and grams = ${COMBO.grams}
    )`;
  await sql`
    update product_sizes set price = ${COMBO.price}
    where product_id = ${row.id} and grams = ${COMBO.grams}`;

  console.log(`${COMBO.name} -> $${COMBO.price} (fuera de la vitrina)`);
  console.log("\nListo.");
}

main();
