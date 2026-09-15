"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Search, X } from "lucide-react";

const SEARCH_DELAY_MS = 300;

/**
 * El buscador de Reseñas. Busca en el servidor y no filtrando lo que ya está
 * en pantalla: la lista de compras sólo trae los últimos meses, y a un cliente
 * de hace un año hay que poder encontrarlo igual. La búsqueda vive en la URL
 * (`?q=`), así que sobrevive a cambiar de pestaña y a recargar.
 */
export default function ReviewSearch({
  tab,
  initialQuery,
  placeholder,
}: {
  tab: string;
  initialQuery: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const navigate = (query: string) => {
    clearTimeout(timer.current);
    const params = new URLSearchParams({ tab });
    if (query.trim()) params.set("q", query.trim());
    startTransition(() => {
      router.replace(`/admin/resenas?${params}`, { scroll: false });
    });
  };

  const change = (query: string) => {
    setValue(query);
    clearTimeout(timer.current);
    // Se espera a que deje de escribir: una consulta por letra sería lenta
    // y haría saltar la lista en cada tecla.
    timer.current = setTimeout(() => navigate(query), SEARCH_DELAY_MS);
  };

  const clear = () => {
    setValue("");
    navigate("");
  };

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        navigate(value);
        // En el teléfono, "Buscar" en el teclado lo cierra para ver resultados.
        (document.activeElement as HTMLElement | null)?.blur();
      }}
      className="relative mb-4"
    >
      {isPending ? (
        <LoaderCircle
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#787774] animate-spin pointer-events-none"
          aria-hidden="true"
        />
      ) : (
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#787774] pointer-events-none"
          aria-hidden="true"
        />
      )}
      <input
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => change(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        className="w-full h-10 rounded-md border border-black/15 bg-white pl-9 pr-10 text-sm outline-none focus:border-[#37352f] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Borrar búsqueda"
          className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-[#787774] hover:bg-black/5"
        >
          <X size={15} />
        </button>
      )}
    </form>
  );
}
