/**
 * Regenera las piezas de /assets/og que arma el banner de opengraph-image.
 *
 * Las fotos de /public pesan más de 1 MB cada una porque son las que se ven en
 * el sitio a tamaño completo; en el banner los frascos se dibujan a 232px, así
 * que aquí se recortan y se reducen. Correr esto cuando cambie una foto de
 * producto o el logo, si no el enlace compartido sigue mostrando la anterior.
 *
 * Las tipografías (.ttf) no las toca este script: se bajaron una vez de Google
 * Fonts porque `next/font` sólo deja .woff2 dentro de .next y Satori no lo lee.
 *
 *   npx tsx scripts/og-assets.ts
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const OUT = join(process.cwd(), "assets", "og");
const FLAVORS = ["mani", "pistacho", "almendras", "merey"];

async function main() {
  await mkdir(OUT, { recursive: true });

  for (const key of FLAVORS) {
    // `trim` quita el margen transparente de la foto cuadrada: sin eso los
    // frascos quedan de tamaños distintos dentro de su panel de color.
    // La paleta baja el peso de ~500 KB a ~80 KB sin que se note en pantalla.
    const info = await sharp(join(process.cwd(), "public", "products", `${key}.png`))
      .trim({ threshold: 1 })
      .resize({ height: 460, fit: "inside" })
      .png({ compressionLevel: 9, palette: true, colors: 200, dither: 0.6 })
      .toFile(join(OUT, `jar-${key}.png`));
    console.log(`jar-${key}.png`, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} KB`);
  }

  const logo = await sharp(join(process.cwd(), "public", "logo-navbar.png"))
    .trim({ threshold: 1 })
    .resize({ height: 170, fit: "inside" })
    .png({ compressionLevel: 9, palette: true })
    .toFile(join(OUT, "wordmark.png"));
  console.log("wordmark.png", `${logo.width}x${logo.height}`, `${Math.round(logo.size / 1024)} KB`);
}

main();
