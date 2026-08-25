/**
 * Migración: separar "es un combo" de "la foto trae su propio fondo".
 *
 * La vitrina dibuja dos clases de foto. El recorte del frasco no trae fondo y
 * flota sobre el color del sabor, con las burbujas detrás; la foto de estudio
 * trae el suyo y llena la tarjeta entera. Hasta ahora eso se deducía de
 * `kind`: los sabores sueltos eran recortes y los combos fotos. Dejó de ser
 * cierto en cuanto un sabor suelto llegó fotografiado con su fondo, y encogerlo
 * sobre el color de al lado lo deja como un cuadro mal pegado.
 *
 * `image_cutout` lo dice derecho. Arranca en `true`, que es lo que eran todos
 * los sabores sueltos, y se apaga para los combos, que es lo que `kind` decía
 * hasta hoy: la vitrina queda igual que antes de correr esto.
 *
 * Es aditiva: no borra ni reescribe fotos.
 *
 * Uso:
 *   npx dotenv -e .env.local -- npx tsx scripts/migrate-image-cutout.ts
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL en el entorno.");

const sql = neon(url);

async function main() {
  await sql`alter table products add column if not exists image_cutout boolean not null default true`;

  const rows = await sql`
    update products set image_cutout = false
    where kind = 'combo' and image_cutout
    returning key`;

  for (const row of rows) console.log(`${row.key} -> foto con su propio fondo`);
  console.log(`\nListo. ${rows.length} combo/s marcados.`);
}

main();
