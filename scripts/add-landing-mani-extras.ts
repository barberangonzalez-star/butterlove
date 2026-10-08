/**
 * Lo que la landing /landingpromomani suma al pedido: el Pack Familiar de seis
 * frascos y los dos frascos que se ofrecen como agregado al elegir un combo.
 *
 * Los tres nacen fuera de la vitrina (`in_store = false`), igual que el Trío
 * Maní: se venden sólo desde la landing. Existir como productos es lo que hace
 * que el precio de promo llegue entero al panel —el pedido relee los precios
 * del catálogo y no del navegador—, que el WhatsApp los nombre bien y que el
 * inventario descuente del frasco de verdad (ver `COMBO_COMPONENTS`).
 *
 *   - Pack Familiar Maní: 6 frascos de 230g a $29.99 ($5.00 c/u).
 *   - Chocomaní y Merey a precio de promo: el mismo frasco de 230g de la
 *     tienda, más barato sólo si se lleva junto con un combo de la landing.
 *     Van con nombre propio para que en el panel se distinga cuál se cobró a
 *     precio de promo.
 *
 * Los precios se cambian acá y no sólo en la base: la última consulta los
 * fija, así que un script con el número viejo los revierte.
 *
 * Idempotente: se puede correr varias veces.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/add-landing-mani-extras.ts
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

interface Extra {
  key: string;
  name: string;
  kind: "single" | "combo";
  tagline: string;
  description: string;
  image: string;
  heroImage: string;
  bgClass: string;
  accentHex: string;
  badges: string[];
  grams: number;
  price: string;
  sortOrder: number;
}

const EXTRAS: Extra[] = [
  {
    key: "pack-familiar-mani",
    name: "Pack Familiar Maní",
    kind: "combo",
    tagline: "Seis frascos de la clásica, al precio más bajo por frasco.",
    description:
      "Seis frascos de 230g de mantequilla de maní: un solo ingrediente, maní tostado y molido despacio, sin azúcar agregada. Para la casa donde un frasco no llega ni al miércoles.",
    image: "/products/mani.webp",
    heroImage: "/hero/mani.webp",
    bgClass: "bg-mani-bg",
    accentHex: "#F3B94D",
    badges: ["6 frascos de 230g", "Precio de combo", "100% natural"],
    // 1380g = seis frascos de 230g: así `sizeLabel` lo cuenta como "6 × 230g".
    grams: 1380,
    price: "29.99",
    sortOrder: 9,
  },
  {
    key: "chocomani-promo",
    name: "Chocomaní (precio promo)",
    kind: "single",
    tagline: "El Chocomaní de siempre, a precio de promo con tu combo.",
    description:
      "Un frasco de 230g de Chocomaní, a precio especial por llevarlo junto con un combo de maní.",
    image: "/products/chocomani.jpg",
    heroImage: "/hero/chocomani.webp",
    bgClass: "bg-neutro-a-bg",
    accentHex: "#D8C9A8",
    badges: ["230g", "Precio de promo"],
    grams: 230,
    price: "6.00",
    sortOrder: 10,
  },
  {
    key: "merey-promo",
    name: "Merey (precio promo)",
    kind: "single",
    tagline: "La de merey de siempre, a precio de promo con tu combo.",
    description:
      "Un frasco de 230g de mantequilla de merey, a precio especial por llevarlo junto con un combo de maní.",
    image: "/products/merey.webp",
    heroImage: "/hero/merey.webp",
    bgClass: "bg-merey-bg",
    accentHex: "#A9DCE8",
    badges: ["230g", "Precio de promo"],
    grams: 230,
    price: "9.99",
    sortOrder: 11,
  },
];

async function main() {
  for (const p of EXTRAS) {
    const [row] = await sql`
      insert into products
        (key, name, kind, tagline, description, image, hero_image, bg_class,
         accent_hex, badges, in_store, sort_order)
      values
        (${p.key}, ${p.name}, ${p.kind}, ${p.tagline}, ${p.description},
         ${p.image}, ${p.heroImage}, ${p.bgClass}, ${p.accentHex},
         ${JSON.stringify(p.badges)}::jsonb, false, ${p.sortOrder})
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

    // El stock no se toca al reinsertar.
    await sql`
      insert into product_sizes (product_id, grams, price)
      select ${row.id}, ${p.grams}, ${p.price}
      where not exists (
        select 1 from product_sizes
        where product_id = ${row.id} and grams = ${p.grams}
      )`;
    await sql`
      update product_sizes set price = ${p.price}
      where product_id = ${row.id} and grams = ${p.grams}`;

    console.log(`${p.name} -> $${p.price} (fuera de la vitrina)`);
  }
  console.log("\nListo.");
}

main();
