// Utilidades para las imágenes que se generan con `next/og` (ImageResponse).
//
// Son las que se ven al pegar un enlace en WhatsApp, Instagram o Facebook. El
// formato 1200x630 es el que esas plataformas recortan menos.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

export const OG_SIZE = { width: 1200, height: 630 };

// Colores de la marca (los mismos de globals.css).
export const CREAM = "#f4efda";
export const INK = "#1e4356";

// El renderizador de `next/og` (Satori) sólo sabe decodificar estos formatos;
// un WebP como `<img>` le rompe el build con un error críptico ("u2 is not
// iterable"). Como el resto del sitio sí sirve WebP para pesar menos, acá se
// reconvierte a PNG antes de incrustarlo.
const SATORI_SAFE_EXT = new Set(["jpg", "jpeg", "png", "gif"]);

/**
 * Convierte una ruta de /public en un data URI para poder incrustarla en la
 * imagen. El renderizador de `next/og` no resuelve rutas relativas: necesita
 * los bytes o una URL absoluta.
 *
 * Devuelve `null` si el archivo no existe, para que la imagen se genere igual
 * sin el envase en vez de romper el build.
 */
export async function ogImageSource(path: string): Promise<string | null> {
  // Las imágenes del producto vienen de la base de datos y podrían apuntar a un
  // CDN externo; en ese caso se pasan tal cual y las descarga el renderizador.
  if (/^https?:\/\//.test(path)) return path;

  const relative = path.replace(/^\/+/, "");
  if (relative.includes("..")) return null;

  try {
    const file = join(process.cwd(), "public", relative);
    const ext = relative.split(".").pop()?.toLowerCase() ?? "";

    if (SATORI_SAFE_EXT.has(ext)) {
      const data = await readFile(file, "base64");
      const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
      return `data:${mime};base64,${data}`;
    }

    const png = await sharp(file).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
