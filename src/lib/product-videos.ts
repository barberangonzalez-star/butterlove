/**
 * El video de cada producto, buscado por su `key`.
 *
 * Vive en código y no en la base de datos por la misma razón que los posts del
 * blog: hoy es un archivo suelto por sabor, y agregarlo son dos pasos —dejar el
 * archivo en `public/videos/` y escribir una línea acá—. Si algún día hay que
 * cambiarlos seguido, el paso siguiente es una columna en `products` y un campo
 * en el panel.
 *
 * Antes de dejar el archivo, pásalo por faststart:
 *
 *     ffmpeg -i original.mp4 -c copy -movflags +faststart public/videos/x.mp4
 *
 * Los videos que salen del teléfono guardan el índice al final del archivo, y
 * eso obliga al navegador a bajarlo entero antes de poder mostrar el primer
 * cuadro. `-c copy` no recomprime: sólo mueve el índice al principio.
 *
 * Y saca el póster del propio video, con el mismo nombre y `-poster.jpg`:
 *
 *     ffmpeg -ss 0.4 -i public/videos/x.mp4 -frames:v 1 -q:v 4 \
 *       public/videos/x-poster.jpg
 *
 * La galería no descarga el video hasta que alguien llega a esa diapositiva,
 * así que hasta entonces lo único que se ve es el póster. Sin él, el hueco
 * queda negro.
 */
export const PRODUCT_VIDEOS: Record<string, string> = {
  mani: "/videos/mani.mp4",
  almendras: "/videos/almendras.mp4",
  pistacho: "/videos/pistacho.mp4",
  merey: "/videos/merey.mp4",
};

export function productVideo(key: string): string | undefined {
  return PRODUCT_VIDEOS[key];
}

/**
 * El primer cuadro del video, guardado al lado con el mismo nombre. Se deduce
 * en vez de listarlo aparte: son dos archivos que se dejan juntos y una lista
 * más sería una lista más que se olvida de actualizar.
 */
export function productVideoPoster(key: string): string | undefined {
  const src = PRODUCT_VIDEOS[key];
  return src?.replace(/\.mp4$/, "-poster.jpg");
}
