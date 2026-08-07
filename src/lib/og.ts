// Utilidades para las imágenes que se generan con `next/og` (ImageResponse).
//
// Son las que se ven al pegar un enlace en WhatsApp, Instagram o Facebook. El
// formato 1200x630 es el que esas plataformas recortan menos.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

// Colores de la marca (los mismos de globals.css).
export const CREAM = "#f4efda";
export const INK = "#1e4356";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

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
    const data = await readFile(join(process.cwd(), "public", relative), "base64");
    const ext = relative.split(".").pop()?.toLowerCase() ?? "";
    return `data:${MIME_BY_EXT[ext] ?? "image/png"};base64,${data}`;
  } catch {
    return null;
  }
}
