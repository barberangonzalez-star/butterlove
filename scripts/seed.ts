import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const seedProducts = [
  {
    key: "mani",
    name: "Maní",
    tagline: "La clásica que no falla",
    description:
      "Maní tostado y molido despacio hasta lograr una textura cremosa. La receta original de Butter Love: solo maní, nada más.",
    image: "/products/mani.png",
    heroImage: "/hero/mani.png",
    bgClass: "bg-mani-bg",
    accentHex: "#F3B94D",
    badges: ["100% natural", "Hecho a mano", "Sin azúcar agregada"],
    sortOrder: 0,
    sizes: [
      { grams: 230, price: "6.00" },
      { grams: 350, price: "8.00" },
    ],
  },
  {
    key: "pistacho",
    name: "Pistacho",
    tagline: "Para repostería con carácter",
    description:
      "Pistachos seleccionados, molidos hasta lograr un verde intenso y un sabor delicado. Ideal para untar o para tus postres favoritos.",
    image: "/products/pistacho.png",
    heroImage: "/hero/pistacho.png",
    bgClass: "bg-pistacho-bg",
    accentHex: "#B7D96B",
    badges: ["100% natural", "Hecho a mano", "Sin azúcar agregada"],
    sortOrder: 1,
    sizes: [
      { grams: 230, price: "20.00" },
      { grams: 350, price: "32.00" },
    ],
  },
  {
    key: "almendras",
    name: "Almendras",
    tagline: "Bienestar en cada cucharada",
    description:
      "Almendras molidas lentamente para conservar sus nutrientes. Aliada de tu piel y tu energía diaria.",
    image: "/products/almendras.png",
    heroImage: "/hero/almendras.png",
    bgClass: "bg-almendras-bg",
    accentHex: "#F5A8C4",
    badges: ["100% natural", "Hecho a mano", "Sin azúcar agregada"],
    sortOrder: 2,
    sizes: [
      { grams: 230, price: "10.00" },
      { grams: 350, price: "15.00" },
    ],
  },
  {
    key: "merey",
    name: "Merey",
    tagline: "Cremosidad venezolana",
    description:
      "Merey (cashew) 100% venezolano, molido hasta una crema suave y ligeramente dulce de forma natural.",
    image: "/products/merey.png",
    heroImage: "/hero/merey.png",
    bgClass: "bg-merey-bg",
    accentHex: "#A9DCE8",
    badges: ["100% natural", "Hecho a mano", "Sin azúcar agregada"],
    sortOrder: 3,
    sizes: [
      { grams: 230, price: "10.00" },
      { grams: 350, price: "15.00" },
    ],
  },
];

const seedPromotions = [
  {
    title: "Combo 2 maní 230g",
    description: "2 mantequillas de maní de 230g por $10.",
    active: true,
  },
];

async function main() {
  const existing = await db.select({ key: schema.products.key }).from(schema.products);
  if (existing.length > 0) {
    console.log(`Ya hay ${existing.length} producto(s) en la base de datos, no se hace seed.`);
    return;
  }

  for (const { sizes, ...product } of seedProducts) {
    const [inserted] = await db.insert(schema.products).values(product).returning({ id: schema.products.id });
    await db.insert(schema.productSizes).values(
      sizes.map((s) => ({ productId: inserted.id, grams: s.grams, price: s.price }))
    );
  }

  await db.insert(schema.promotions).values(seedPromotions);

  console.log(`Sembrados ${seedProducts.length} productos y ${seedPromotions.length} promoción(es).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
