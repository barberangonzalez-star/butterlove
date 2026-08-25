/**
 * Sube los precios individuales de 230g y agrega los cuatro combos a la tienda.
 *
 * Idempotente: se puede correr varias veces. Los combos se insertan por `key`
 * y si ya existen sólo se actualiza su precio.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/add-combo-products.ts
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

/** Precios nuevos del frasco individual de 230g. */
const newUnitPrices: { key: string; grams: number; price: string }[] = [
  { key: "mani", grams: 230, price: "6.99" },
  { key: "almendras", grams: 230, price: "12.99" },
  { key: "merey", grams: 230, price: "12.99" },
  { key: "pistacho", grams: 230, price: "24.99" },
];

/**
 * Los combos van como productos de la tienda, no como filas de `promotions`:
 * esa tabla sólo sabe de un producto por promo y sólo la usa el panel de
 * ventas, así que no puede representar un dúo de dos sabores ni mostrarse en
 * la vitrina. Todos son 2 frascos de 230g, de ahí los 460g.
 */
const combos = [
  {
    key: "duo-mani",
    name: "Dúo Maní",
    tagline: "Dos frascos de la clásica, a precio de combo.",
    description:
      "Dos frascos de 230g de nuestra mantequilla de maní: la receta original, solo maní tostado y molido despacio. El combo para la casa donde el frasco nunca dura una semana.",
    image: "/products/duo-mani.png",
    heroImage: "/hero/duo-mani.png",
    bgClass: "bg-mani-bg",
    accentHex: "#F3B94D",
    price: "10.00",
    sortOrder: 4,
  },
  {
    key: "duo-merey-mani",
    name: "Dúo Merey + Maní",
    tagline: "La clásica y la cremosa, juntas.",
    description:
      "Un frasco de 230g de merey y uno de maní. El contraste perfecto: la suavidad dulce del merey al lado de la mantequilla de maní de siempre.",
    image: "/products/duo-merey-mani.png",
    heroImage: "/hero/duo-merey-mani.png",
    bgClass: "bg-merey-bg",
    accentHex: "#A9DCE8",
    price: "15.00",
    sortOrder: 5,
  },
  {
    key: "duo-almendras-merey",
    name: "Dúo Almendras + Merey",
    tagline: "Las dos más suaves del catálogo.",
    description:
      "Un frasco de 230g de almendras y uno de merey. Dos mantequillas delicadas, ideales para desayunos, repostería y para quien busca algo más sutil que el maní.",
    image: "/products/duo-almendras-merey.png",
    heroImage: "/hero/duo-almendras-merey.png",
    bgClass: "bg-almendras-bg",
    accentHex: "#F5A8C4",
    price: "22.00",
    sortOrder: 6,
  },
  {
    key: "duo-pistacho-almendras",
    name: "Dúo Pistacho + Almendras",
    tagline: "El dúo premium.",
    description:
      "Un frasco de 230g de pistacho y uno de almendras. Nuestras dos mantequillas más finas en un solo pedido, para repostería con carácter y para regalar.",
    image: "/products/duo-pistacho-almendras.png",
    heroImage: "/hero/duo-pistacho-almendras.png",
    bgClass: "bg-pistacho-bg",
    accentHex: "#B7D96B",
    price: "38.00",
    sortOrder: 7,
  },
];

const COMBO_BADGES = ["2 frascos de 230g", "Precio de combo", "100% natural"];

async function main() {
  // La columna distingue "Mantequilla de Maní" de "Dúo Merey + Maní" al
  // momento de titular. Va aquí y no en una migración de drizzle-kit para que
  // este script quede autosuficiente.
  await sql`alter table products add column if not exists kind text not null default 'single'`;

  for (const { key, grams, price } of newUnitPrices) {
    const rows = await sql`
      update product_sizes s
      set price = ${price}
      from products p
      where s.product_id = p.id and p.key = ${key} and s.grams = ${grams}
      returning s.id`;
    console.log(`precio ${key} ${grams}g -> $${price} (${rows.length} fila/s)`);
  }

  for (const combo of combos) {
    const [row] = await sql`
      insert into products
        (key, name, kind, tagline, description, image, image_cutout,
         hero_image, bg_class, accent_hex, badges, sort_order)
      values
        (${combo.key}, ${combo.name}, 'combo', ${combo.tagline},
         ${combo.description}, ${combo.image}, false, ${combo.heroImage},
         ${combo.bgClass}, ${combo.accentHex},
         ${JSON.stringify(COMBO_BADGES)}::jsonb, ${combo.sortOrder})
      on conflict (key) do update set
        name = excluded.name,
        kind = excluded.kind,
        tagline = excluded.tagline,
        description = excluded.description,
        image = excluded.image,
        -- Las fotos de los dúos traen su propio fondo y llenan la tarjeta
        -- enteras, en vez de flotar sobre el color del sabor.
        image_cutout = excluded.image_cutout,
        hero_image = excluded.hero_image,
        bg_class = excluded.bg_class,
        accent_hex = excluded.accent_hex,
        badges = excluded.badges,
        sort_order = excluded.sort_order,
        updated_at = now()
      returning id`;

    // 460g = los dos frascos de 230g juntos. La vitrina lo muestra como
    // "2 × 230g"; el número real vive aquí para que el peso siga siendo peso.
    await sql`
      insert into product_sizes (product_id, grams, price)
      select ${row.id}, 460, ${combo.price}
      where not exists (
        select 1 from product_sizes where product_id = ${row.id} and grams = 460
      )`;
    await sql`
      update product_sizes set price = ${combo.price}
      where product_id = ${row.id} and grams = 460`;

    console.log(`combo ${combo.key} -> $${combo.price}`);
  }

  console.log("\nListo.");
}

main();
