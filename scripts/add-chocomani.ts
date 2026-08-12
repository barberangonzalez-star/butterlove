/**
 * Agrega Chocomaní al catálogo como producto de sólo encargo: aparece en el
 * registro de ventas y en inventario, pero no en la vitrina.
 *
 * Idempotente: se puede correr varias veces. El producto se inserta por `key`
 * y si ya existe sólo se actualizan sus datos y precios.
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
    "Nuestra mantequilla de maní con cacao, molida igual de despacio. Disponible por encargo.",
  bgClass: "bg-neutro-a-bg",
  accentHex: "#D8C9A8",
  badges: ["100% natural", "Hecho a mano", "Sin azúcar agregada"],
  sortOrder: 8,
  sizes: [
    { grams: 230, price: "8.50" },
    { grams: 350, price: "10.00" },
  ],
};

async function main() {
  // La columna separa el catálogo de la vitrina. Va aquí y no en una migración
  // de drizzle-kit para que este script quede autosuficiente, igual que
  // `add-combo-products.ts`. El default `true` deja los productos existentes
  // en la tienda tal como estaban.
  await sql`alter table products add column if not exists in_store boolean not null default true`;

  // Sin fotos: el producto no se muestra en la tienda, y los campos son
  // notNull, así que van vacíos en vez de apuntar a un archivo que no existe.
  const [row] = await sql`
    insert into products
      (key, name, kind, tagline, description, image, hero_image, bg_class,
       accent_hex, badges, in_store, sort_order)
    values
      (${product.key}, ${product.name}, 'single', ${product.tagline},
       ${product.description}, '', '', ${product.bgClass},
       ${product.accentHex}, ${JSON.stringify(product.badges)}::jsonb,
       false, ${product.sortOrder})
    on conflict (key) do update set
      name = excluded.name,
      kind = excluded.kind,
      tagline = excluded.tagline,
      description = excluded.description,
      bg_class = excluded.bg_class,
      accent_hex = excluded.accent_hex,
      badges = excluded.badges,
      in_store = excluded.in_store,
      sort_order = excluded.sort_order,
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

  console.log("\nListo. Chocomaní queda fuera de la tienda.");
}

main();
