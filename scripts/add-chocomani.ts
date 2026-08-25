/**
 * Chocomaní en el catálogo y en la vitrina.
 *
 * Nació como producto de sólo encargo —aparecía en ventas e inventario pero no
 * en la tienda, y por eso no tenía fotos—. Ahora se vende como cualquier otro
 * sabor: entra a la vitrina con su recorte y su foto de ambiente, detrás de
 * Merey y delante de los dúos.
 *
 * Idempotente: se puede correr varias veces. El producto se inserta por `key`
 * y si ya existe sólo se actualizan sus datos y precios. Ojo con el orden: la
 * lista de abajo es el orden de la vitrina completo, así que re-correrlo
 * deshace los cambios de posición hechos a mano en el panel.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/add-chocomani.ts
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const product = {
  key: "chocomani",
  name: "Chocomaní",
  tagline: "Maní y cacao, sin azúcar agregada.",
  description:
    "Nuestra mantequilla de maní con cacao, molida igual de despacio: maní tostado y cacao, sin azúcar agregada.",
  // La foto del frasco sobre el fondo azul es la del producto: llena la
  // tarjeta entera, así que no es un recorte. La de los dos frascos es la de
  // ambiente, y es la misma que abre el carrusel.
  image: "/products/chocomani.jpg",
  imageCutout: false,
  heroImage: "/hero/chocomani.jpg",
  bgClass: "bg-neutro-a-bg",
  accentHex: "#D8C9A8",
  badges: ["100% natural", "Hecho a mano", "Sin azúcar agregada"],
  sizes: [
    { grams: 230, price: "8.50" },
    { grams: 350, price: "10.00" },
  ],
};

/** El orden de la vitrina: primero los sabores sueltos, después los dúos. */
const VITRINA = [
  "mani",
  "pistacho",
  "almendras",
  "merey",
  "chocomani",
  "duo-mani",
  "duo-merey-mani",
  "duo-almendras-merey",
  "duo-pistacho-almendras",
];

async function main() {
  // La columna separa el catálogo de la vitrina. Va aquí y no en una migración
  // de drizzle-kit para que este script quede autosuficiente, igual que
  // `add-combo-products.ts`. El default `true` deja los productos existentes
  // en la tienda tal como estaban.
  await sql`alter table products add column if not exists in_store boolean not null default true`;
  // La marca de recorte la crea `migrate-image-cutout.ts`; acá se agrega por si
  // este script corre primero en una base recién levantada.
  await sql`alter table products add column if not exists image_cutout boolean not null default true`;

  const [row] = await sql`
    insert into products
      (key, name, kind, tagline, description, image, image_cutout, hero_image,
       bg_class, accent_hex, badges, in_store, sort_order)
    values
      (${product.key}, ${product.name}, 'single', ${product.tagline},
       ${product.description}, ${product.image}, ${product.imageCutout},
       ${product.heroImage}, ${product.bgClass}, ${product.accentHex},
       ${JSON.stringify(product.badges)}::jsonb,
       true, ${VITRINA.indexOf(product.key)})
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

  for (const size of product.sizes) {
    // El insert condicional deja intacto el `stock_quantity` si el tamaño ya
    // existía; el update de después es el que corrige el precio.
    await sql`
      insert into product_sizes (product_id, grams, price)
      select ${row.id}, ${size.grams}, ${size.price}
      where not exists (
        select 1 from product_sizes
        where product_id = ${row.id} and grams = ${size.grams}
      )`;
    await sql`
      update product_sizes set price = ${size.price}
      where product_id = ${row.id} and grams = ${size.grams}`;

    console.log(`${product.key} ${size.grams}g -> $${size.price}`);
  }

  // El orden se escribe entero y no como "córrele uno a los combos", que
  // aplicado dos veces los correría dos veces.
  for (const [position, key] of VITRINA.entries()) {
    await sql`update products set sort_order = ${position} where key = ${key}`;
  }

  console.log(`\nListo. Chocomaní va ${VITRINA.indexOf(product.key) + 1}º en la vitrina.`);
}

main();
