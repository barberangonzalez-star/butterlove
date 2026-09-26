import { foldText } from "./customers";
import { productTitle } from "./products";
import type { AdminProduct } from "./products-data";

/**
 * El sabor que quiso decir quien cotiza.
 *
 * El nombre llega como se habla —"maní", "dúo maní", "mantequilla de
 * pistacho"—, así que no alcanza con buscar el primero que contenga la
 * palabra: "dúo maní" contiene "maní", y a la primera coincidencia le tocaría
 * el frasco suelto en vez del dúo. Se puntúan todos y gana el más específico.
 */
export function matchProduct(name: string | undefined, catalog: AdminProduct[]) {
  const term = foldText(name ?? "").trim();
  if (!term) return undefined;

  const scored = catalog
    .map((row) => {
      const title = foldText(productTitle(row));
      const plain = foldText(row.name);

      // Un nombre exacto gana siempre. Después, que el título contenga lo
      // pedido. Y de último que lo pedido contenga el nombre del producto, que
      // es la más floja: ahí gana el nombre más largo, o sea el más específico.
      const score =
        title === term || plain === term
          ? 100
          : title.includes(term)
            ? 60 + term.length
            : term.includes(plain)
              ? 20 + plain.length
              : plain.includes(term)
                ? 10 + term.length
                : 0;

      return { row, score, length: plain.length };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.length - a.length);

  return scored[0]?.row;
}
