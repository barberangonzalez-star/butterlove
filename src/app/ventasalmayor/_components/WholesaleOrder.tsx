"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { WHATSAPP_LINK } from "@/lib/config";
import { BOX_UNITS, fmtPrice } from "@/lib/wholesale";
import type { WholesaleItem } from "@/lib/wholesale-data";

/**
 * El catálogo al mayor y el pedido, en un mismo componente.
 *
 * Van juntos por lo mismo que en la landing: comparten una sola cosa —cuántas
 * cajas lleva de cada sabor— y meter un contexto para eso sería más cañería
 * que provecho. El pedido no se guarda ni se cobra acá; se arma y se manda por
 * WhatsApp, que es donde de verdad se cierra una venta al mayor: hay que
 * acordar entrega, pago y fecha, y ningún checkout hace eso.
 */
export default function WholesaleOrder({ items }: { items: WholesaleItem[] }) {
  const [boxes, setBoxes] = useState<Record<string, number>>({});

  const setCount = (key: string, next: number) =>
    setBoxes((prev) => ({ ...prev, [key]: Math.max(0, next) }));

  const lines = useMemo(
    () =>
      items
        .map((item) => ({ item, count: boxes[item.key] ?? 0 }))
        .filter((line) => line.count > 0),
    [items, boxes],
  );

  const totalBoxes = lines.reduce((sum, l) => sum + l.count, 0);
  const totalUsd = lines.reduce((sum, l) => sum + l.count * l.item.boxPrice, 0);
  // Lo que el mayorista se lleva de ganancia si revende todo al PVP. Es el
  // número que cierra el trato, así que se muestra sumado y no sólo por caja.
  const totalGain = lines.reduce(
    (sum, l) => sum + l.count * l.item.resellerProfitPerBox,
    0,
  );

  const message = useMemo(() => {
    if (lines.length === 0) return "";
    const detail = lines
      .map(
        (l) =>
          `• ${l.count} ${l.count === 1 ? "caja" : "cajas"} de ${l.item.title} (${BOX_UNITS} × ${l.item.grams}g) — ${fmtPrice(l.count * l.item.boxPrice)}`,
      )
      .join("\n");
    return `Hola, quiero hacer un pedido al mayor:\n\n${detail}\n\nTotal: ${fmtPrice(totalUsd)}`;
  }, [lines, totalUsd]);

  return (
    <>
      <section id="catalogo" className="scroll-mt-4">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const count = boxes[item.key] ?? 0;
            return (
              <article
                key={item.key}
                className="rounded-3xl border border-ink/10 bg-white overflow-hidden flex flex-col"
              >
                {/* Igual que en la vitrina: los recortes sin fondo flotan
                    sobre el color del sabor con aire alrededor, y las fotos
                    que traen el suyo llenan el cuadro enteras. */}
                <div
                  className={`relative ${item.bgClass} aspect-square overflow-hidden`}
                >
                  {item.imageCutout ? (
                    <div className="absolute inset-6">
                      <Image
                        src={item.image}
                        alt={`${item.title} ${item.grams}g`}
                        fill
                        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                        className="object-contain drop-shadow-xl"
                      />
                    </div>
                  ) : (
                    <Image
                      src={item.image}
                      alt={`${item.title} ${item.grams}g`}
                      fill
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div>
                    <h3 className="font-display font-semibold text-lg leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-sm text-ink-soft">
                      Caja de {BOX_UNITS} frascos de {item.grams}g
                    </p>
                  </div>

                  <div>
                    <p className="font-display text-3xl font-bold">
                      {fmtPrice(item.boxPrice)}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {fmtPrice(item.unitPrice)} por frasco
                    </p>
                  </div>

                  {/* Lo que el mayorista gana si revende al PVP. Es el motivo
                      por el que compra la caja, y va con el PVP al lado para
                      que la cuenta se pueda comprobar en el momento. */}
                  <dl className="rounded-2xl bg-surface px-4 py-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-soft">PVP sugerido</dt>
                      <dd className="font-semibold">
                        {fmtPrice(item.retailPrice)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 mt-1">
                      <dt className="text-ink-soft">Tu ganancia por caja</dt>
                      <dd className="font-bold text-ink">
                        {fmtPrice(item.resellerProfitPerBox)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="text-sm text-ink-soft">Cajas</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCount(item.key, count - 1)}
                        disabled={count === 0}
                        aria-label={`Quitar una caja de ${item.title}`}
                        className="w-9 h-9 rounded-full border border-ink/15 flex items-center justify-center disabled:opacity-30 hover:bg-surface transition"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span
                        aria-live="polite"
                        className="w-8 text-center font-display font-bold text-lg tabular-nums"
                      >
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCount(item.key, count + 1)}
                        aria-label={`Agregar una caja de ${item.title}`}
                        className="w-9 h-9 rounded-full border border-ink/15 flex items-center justify-center hover:bg-surface transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* La barra sólo aparece cuando hay algo que pedir: vacía sería un botón
          que no lleva a ninguna parte tapando el catálogo. */}
      {totalBoxes > 0 && (
        <div className="sticky bottom-0 z-30 -mx-4 mt-8 px-4 pb-4 pt-3 bg-page/95 backdrop-blur border-t border-ink/10">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-bold leading-none">
                {fmtPrice(totalUsd)}
              </p>
              <p className="text-sm text-ink-soft mt-1">
                {totalBoxes} {totalBoxes === 1 ? "caja" : "cajas"} ·{" "}
                {totalBoxes * BOX_UNITS} frascos · ganas{" "}
                <strong className="text-ink">{fmtPrice(totalGain)}</strong> al
                revender
              </p>
            </div>
            <a
              href={`${WHATSAPP_LINK}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-ink text-white font-semibold px-6 py-3 hover:opacity-90 transition"
            >
              <ShoppingBag className="w-5 h-5" />
              Pedir por WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}
