"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Heart, Star } from "lucide-react";
import { submitReviewsAction } from "./actions";
import {
  RATING_LABELS,
  REVIEW_COMMENT_MAX,
  REVIEW_NAME_MAX,
  type ReviewableProduct,
} from "@/lib/reviews";

/**
 * Cinco estrellas grandes, pensadas para el dedo: cada una ocupa 44px. Por
 * debajo son radios de verdad, así que con teclado se eligen con las flechas
 * y un lector de pantalla las anuncia como una sola pregunta.
 */
function StarPicker({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            onMouseEnter={() => setHover(n)}
            className="w-11 h-11 flex items-center justify-center rounded-full cursor-pointer transition-transform active:scale-90 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink"
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <Star
              size={34}
              strokeWidth={1.5}
              fill={n <= shown ? "currentColor" : "none"}
              className={n <= shown ? "text-star" : "text-ink/25"}
              aria-hidden="true"
            />
            <span className="sr-only">
              {n} estrella{n === 1 ? "" : "s"}
            </span>
          </label>
        ))}
      </div>
      <p className="mt-1 min-h-5 text-sm font-medium text-ink" aria-live="polite">
        {shown ? RATING_LABELS[shown] : ""}
      </p>
    </fieldset>
  );
}

function ProductThumb({
  product,
  className,
}: {
  product: ReviewableProduct;
  className: string;
}) {
  return (
    <span className={`relative shrink-0 overflow-hidden ${product.bgClass} ${className}`}>
      <Image
        src={product.image}
        alt=""
        fill
        sizes="64px"
        className={product.imageCutout ? "object-contain p-1" : "object-cover"}
      />
    </span>
  );
}

function Closing({ title, text }: { title: string; text: string }) {
  return (
    <div className="pt-6 text-center">
      <span className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-mani-bg">
        <Heart size={28} fill="currentColor" className="text-ink" aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-display font-700 text-3xl text-ink leading-tight">
        {title}
      </h1>
      <p className="mt-3 text-base text-ink-soft leading-relaxed">{text}</p>
      <Link
        href="/#productos"
        className="mt-8 inline-flex h-12 items-center rounded-full bg-ink px-7 text-base font-semibold text-cream hover:opacity-90 transition-opacity"
      >
        Ver la tienda
      </Link>
    </div>
  );
}

export default function ReviewForm({
  token,
  firstName,
  defaultAuthorName,
  products,
  choose,
}: {
  token: string;
  firstName: string | null;
  defaultAuthorName: string;
  products: ReviewableProduct[];
  /** Si primero tiene que marcar qué productos probó. */
  choose: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const open = products.filter((p) => !p.reviewed);
  // Con productos elegidos de antemano se muestran todos, incluidos los ya
  // reseñados; cuando la persona elige, sólo los que marcó.
  const cards = choose ? open.filter((p) => selected.has(p.id)) : products;
  const rated = cards.filter((p) => !p.reviewed && ratings[p.id]);

  if (sent) {
    return (
      <Closing
        title={`¡Gracias${firstName ? `, ${firstName}` : ""}!`}
        text="Recibimos tu opinión. La publicamos en la tienda en cuanto la leamos."
      />
    );
  }

  if (products.length === 0) {
    return (
      <Closing
        title="No hay nada que reseñar"
        text="Los productos de este enlace ya no están en nuestro catálogo. ¡Gracias igual por escribirnos!"
      />
    );
  }

  if (open.length === 0) {
    return (
      <Closing
        title="Ya tenemos tu opinión"
        text="Ya dejaste tu reseña con este enlace. ¡Gracias por tomarte el tiempo!"
      />
    );
  }

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (rated.length === 0) {
      setError(
        choose && selected.size === 0
          ? "Marca los productos que probaste."
          : "Elige las estrellas de al menos un producto.",
      );
      return;
    }
    if (!authorName.trim()) {
      setError("Escribe el nombre con el que quieres aparecer.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await submitReviewsAction(token, {
          authorName,
          entries: rated.map((p) => ({
            productId: p.id,
            rating: ratings[p.id],
            comment: comments[p.id] ?? "",
          })),
        });
        if (result.ok) {
          setSent(true);
          window.scrollTo({ top: 0 });
        } else {
          setError(result.error);
        }
      } catch {
        setError("No pudimos enviar tu reseña. Revisa tu conexión e intenta de nuevo.");
      }
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="font-display font-700 text-3xl sm:text-4xl text-ink leading-tight">
        {firstName ? `¡Hola, ${firstName}!` : "¡Hola!"} ¿Qué tal tu Butter Love?
      </h1>
      <p className="mt-3 text-base text-ink-soft leading-relaxed">
        Tu opinión ayuda a otras personas a elegir su sabor, y a nosotros a
        hacerlo cada vez mejor. Toma menos de un minuto.
      </p>

      {/* Sin productos elegidos de antemano, primero se marcan los que se
          probaron: con todo el catálogo en tarjetas de estrellas serían diez
          pantallas en el teléfono. */}
      {choose && (
        <fieldset className="mt-8">
          <legend className="font-display font-700 text-xl text-ink">
            ¿Cuáles probaste?
          </legend>
          <p className="mt-1 text-sm text-ink-soft">
            Marca los que quieras reseñar.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {products.map((product) => {
              const on = selected.has(product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggle(product.id)}
                  disabled={product.reviewed}
                  aria-pressed={on}
                  className={`relative flex min-h-14 items-center gap-2 rounded-2xl border p-2 pr-7 text-left transition-colors disabled:opacity-60 ${
                    on
                      ? "border-ink bg-surface"
                      : "border-ink/15 bg-page hover:bg-surface"
                  }`}
                >
                  <ProductThumb product={product} className="w-11 h-11 rounded-xl" />
                  <span className="min-w-0 text-sm font-medium text-ink leading-tight line-clamp-2">
                    {product.title}
                    {product.reviewed && <span className="sr-only"> (ya opinaste)</span>}
                  </span>
                  {(on || product.reviewed) && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-ink text-cream">
                      <Check size={12} aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {cards.length > 0 && (
        <ul className={`${choose ? "mt-6" : "mt-8"} space-y-4`}>
          {cards.map((product) => {
            const rating = ratings[product.id] ?? 0;
            return (
              <li key={product.id} className="rounded-3xl bg-surface p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <ProductThumb product={product} className="w-16 h-16 rounded-2xl" />
                  <div className="min-w-0">
                    <p className="font-display font-700 text-lg text-ink leading-tight">
                      {product.title}
                    </p>
                    {product.reviewed && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-ink-soft">
                        <Check size={14} aria-hidden="true" /> Ya dejaste tu opinión
                      </p>
                    )}
                  </div>
                </div>

                {!product.reviewed && (
                  <div className="mt-3">
                    <StarPicker
                      name={`rating-${product.id}`}
                      label={`¿Cuántas estrellas le das a ${product.title}?`}
                      value={rating}
                      onChange={(value) =>
                        setRatings((prev) => ({ ...prev, [product.id]: value }))
                      }
                    />

                    {/* El comentario aparece después de elegir estrellas: de
                        entrada el formulario pide una sola cosa, y así se ve
                        tan corto como es. */}
                    {rating > 0 && (
                      <label className="mt-2 block">
                        <span className="block text-sm text-ink-soft mb-1.5">
                          ¿Qué te gustó? (opcional)
                        </span>
                        <textarea
                          rows={3}
                          maxLength={REVIEW_COMMENT_MAX}
                          value={comments[product.id] ?? ""}
                          onChange={(e) =>
                            setComments((prev) => ({
                              ...prev,
                              [product.id]: e.target.value,
                            }))
                          }
                          placeholder="Con qué la comes, qué la hace distinta…"
                          className="w-full min-h-24 resize-y rounded-2xl border border-ink/15 bg-page px-4 py-3 text-base text-ink placeholder:text-ink-soft/60 outline-none focus:border-ink"
                        />
                      </label>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <label className="mt-6 block">
        <span className="block text-sm font-semibold text-ink mb-1.5">
          Tu nombre como aparecerá
        </span>
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={REVIEW_NAME_MAX}
          autoComplete="name"
          placeholder="María G."
          className="w-full h-12 rounded-full border border-ink/15 bg-page px-5 text-base text-ink placeholder:text-ink-soft/60 outline-none focus:border-ink"
        />
        <span className="mt-1.5 block text-xs text-ink-soft leading-relaxed">
          Tu teléfono no se muestra. Publicamos la reseña después de leerla.
        </span>
      </label>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 w-full h-12 rounded-full bg-ink text-cream text-base font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        {isPending
          ? "Enviando…"
          : rated.length > 1
            ? `Enviar ${rated.length} reseñas`
            : "Enviar reseña"}
      </button>
    </form>
  );
}
