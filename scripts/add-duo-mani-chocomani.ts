/**
 * El dúo de maní + chocomaní en la vitrina.
 *
 * Dos frascos de 230g a $14. Sueltos son $6.99 + $8.50 = $15.49, y ese
 * "antes" no se escribe: la ficha lo calcula sola con los precios de hoy
 * —`comboSavings`— y muestra "Ahorras $1.49 contra comprarlos por separado".
 * Por eso acá sólo va el precio del combo; subirle el precio al maní corrige
 * el ahorro sin tocar este archivo.
 *
 * Idempotente: se puede correr varias veces. El producto se inserta por `key`
 * y si ya existe sólo se actualizan sus datos y su precio. Ojo con el orden:
 * la lista de abajo es el orden de la vitrina completo, así que re-correrlo
 * deshace los cambios de posición hechos a mano en el panel.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/add-duo-mani-chocomani.ts
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const combo = {
  key: "duo-mani-chocomani",
  name: "Dúo Maní + Chocomaní",
  tagline: "La clásica y la de cacao, juntas.",
  description:
    "Un frasco de 230g de mantequilla de maní y uno de chocomaní. La receta original al lado de la misma mantequilla con cacao y sin azúcar agregada: la de todos los días y el antojo, en un solo pedido.",
  // La foto de los dos frascos trae su propio fondo y llena la tarjeta
  // entera, así que no es un recorte. Va con el mismo nombre en las dos
  // carpetas, como los demás dúos: la galería la muestra una sola vez.
  image: "/products/duo-mani-chocomani.jpg",
  heroImage: "/hero/duo-mani-chocomani.jpg",
  bgClass: "bg-mani-bg",
  accentHex: "#F3B94D",
  // 460g = los dos frascos de 230g juntos. La vitrina lo muestra como
  // "2 × 230g"; el número real vive aquí para que el peso siga siendo peso.
  grams: 460,
  price: "14.00",
  badges: ["2 frascos de 230g", "Precio de combo", "Sin azúcar agregada"],
};

/** El orden de la vitrina: primero los sabores sueltos, después los dúos. */
const VITRINA = [
  "mani",
  "pistacho",
  "almendras",
  "merey",
  "chocomani",
  "duo-mani",
  "duo-mani-chocomani",
  "duo-merey-mani",
  "duo-almendras-merey",
  "duo-pistacho-almendras",
];

async function main() {
  const [row] = await sql`
    insert into products
      (key, name, kind, tagline, description, image, image_cutout, hero_image,
       bg_class, accent_hex, badges, in_store, sort_order)
    values
      (${combo.key}, ${combo.name}, 'combo', ${combo.tagline},
       ${combo.description}, ${combo.image}, false, ${combo.heroImage},
       ${combo.bgClass}, ${combo.accentHex},
       ${JSON.stringify(combo.badges)}::jsonb,
       true, ${VITRINA.indexOf(combo.key)})
    on conflict (key) do update set
      name = excluded.name,
      kind = excluded.kind,
      tagline = excluded.tagline,
      description = excluded.description,
      image = excluded.image,
      image_cutout = excluded.image_cutout,
      hero_image = excluded.hero_image,
      bg_class = excluded.bg_class,
      accent_hex = excluded.accent_hex,
      badges = excluded.badges,
      in_store = excluded.in_store,
      updated_at = now()
    returning id`;

  // El insert condicional deja intacto el `stock_quantity` si el tamaño ya
  // existía; el update de después es el que corrige el precio.
  await sql`
    insert into product_sizes (product_id, grams, price)
    select ${row.id}, ${combo.grams}, ${combo.price}
    where not exists (
      select 1 from product_sizes
      where product_id = ${row.id} and grams = ${combo.grams}
    )`;
  await sql`
    update product_sizes set price = ${combo.price}
    where product_id = ${row.id} and grams = ${combo.grams}`;

  console.log(`${combo.key} ${combo.grams}g -> $${combo.price}`);

  // El orden se escribe entero y no como "córrele uno a los dúos de abajo",
  // que aplicado dos veces los correría dos veces.
  for (const [position, key] of VITRINA.entries()) {
    await sql`update products set sort_order = ${position} where key = ${key}`;
  }

  console.log(
    `\nListo. El dúo va ${VITRINA.indexOf(combo.key) + 1}º en la vitrina.`,
  );
}

main();
