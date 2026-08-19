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
 */
export const PRODUCT_VIDEOS: Record<string, string> = {
  mani: "/videos/mani.mp4",
  // "pistacho": "/videos/pistacho.mp4",
};

/**
 * Mientras un producto no tenga video, la ficha reserva el espacio con la misma
 * proporción 16:9 y avisa que viene en camino. Así el día que llegue el archivo
 * no se mueve nada de sitio. Poner esto en `false` esconde el aviso y deja la
 * sección fuera de las fichas que todavía no tienen video.
 */
export const SHOW_VIDEO_PLACEHOLDER = true;

export function productVideo(key: string): string | undefined {
  return PRODUCT_VIDEOS[key];
}
