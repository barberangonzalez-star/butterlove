import type { Metadata } from "next";
import { Boxes, HandCoins, Truck } from "lucide-react";
import { getWholesaleCatalog } from "@/lib/wholesale-data";
import { BOX_UNITS, TARGET_DISCOUNT } from "@/lib/wholesale";
import {
  PAYMENT_METHODS,
  DELIVERY_METHODS,
  NATIONAL_COURIERS,
  WHATSAPP_LINK,
} from "@/lib/config";
import WholesaleOrder from "./_components/WholesaleOrder";

/**
 * La lista se rehace cada hora por su cuenta.
 *
 * Cambiar un precio en Productos ya empuja esta página, porque esa acción
 * revalida `/` con toda su capa. Los costos no: se editan en Finanzas, que
 * sólo revalida lo suyo, y el precio al mayor depende del costo tanto como del
 * PVP. Sin esto, corregir el costo del pistacho dejaría la caja cotizada con
 * el costo viejo hasta el próximo deploy.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Venta al mayor",
  description:
    "Precios por caja de 12 frascos para revendedores de Butter Love.",
  // La lista al mayor se reparte por enlace, a quien ya se le va a vender. No
  // se indexa por dos razones: en un buscador competiría con la ficha del
  // producto por la misma búsqueda, y pondría el precio al mayor delante de un
  // cliente de detal, que es la manera más rápida de quedarse sin los dos
  // precios. `nofollow` evita además que el WhatsApp se rastree.
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

/**
 * La lista de precios al mayor.
 *
 * Los precios no se escriben acá: salen del PVP y del costo del frasco que ya
 * están cargados en el panel, cruzados por `wholesalePrice`. Subir un precio en
 * Productos o corregir un costo en Finanzas mueve esta página sola, que es lo
 * que evita que la lista del mayorista y la de la tienda cuenten cosas
 * distintas.
 */
export default async function VentasAlMayorPage() {
  const items = await getWholesaleCatalog();
  const discount = Math.round(TARGET_DISCOUNT * 100);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
      <section className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
          Lista de precios · {BOX_UNITS} unidades por caja
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold mt-3 leading-tight">
          Vende Butter Love en tu tienda
        </h1>
        <p className="text-ink-soft mt-4 text-lg">
          Mantequillas 100% naturales, sin azúcar agregada y de un solo
          ingrediente. Compras por caja de {BOX_UNITS} frascos, revendes al
          precio de nuestra tienda y te quedas con la diferencia.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3 mt-10">
        {[
          {
            icon: Boxes,
            title: `Caja de ${BOX_UNITS} frascos`,
            text: "Un solo sabor por caja. Puedes combinar cajas de sabores distintos en el mismo pedido.",
          },
          {
            icon: HandCoins,
            title: `Hasta ${discount}% bajo el PVP`,
            text: "El margen va en cada sabor, calculado sobre el precio que ya tiene la tienda.",
          },
          {
            icon: Truck,
            title: "Entrega coordinada",
            text: `${DELIVERY_METHODS.join(", ")} — al interior por ${NATIONAL_COURIERS.join(", ")}.`,
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-3xl bg-surface p-5">
            <Icon className="w-6 h-6 text-ink" />
            <h2 className="font-display font-semibold mt-3">{title}</h2>
            <p className="text-sm text-ink-soft mt-1">{text}</p>
          </div>
        ))}
      </section>

      <div className="mt-12">
        {items.length > 0 ? (
          <WholesaleOrder items={items} />
        ) : (
          // Sin costos cargados no hay precio al mayor que mostrar, y un
          // catálogo vacío se explica mejor que una página en blanco.
          <p className="rounded-3xl bg-surface p-6 text-ink-soft">
            La lista se está actualizando. Escríbenos por{" "}
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink underline"
            >
              WhatsApp
            </a>{" "}
            y te la pasamos.
          </p>
        )}
      </div>

      <section className="mt-14 rounded-3xl border border-ink/10 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold">Cómo funciona</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "1",
              title: "Arma tu pedido",
              text: "Elige cuántas cajas de cada sabor. El total se calcula solo.",
            },
            {
              n: "2",
              title: "Confírmalo por WhatsApp",
              text: `Coordinamos entrega y fecha. Pagas con ${PAYMENT_METHODS.join(", ")}.`,
            },
            {
              n: "3",
              title: "Recíbelo y vende",
              text: "Los frascos van etiquetados y listos para estante.",
            },
          ].map((step) => (
            <li key={step.n}>
              <span className="inline-flex w-8 h-8 rounded-full bg-ink text-white font-display font-bold items-center justify-center">
                {step.n}
              </span>
              <h3 className="font-display font-semibold mt-3">{step.title}</h3>
              <p className="text-sm text-ink-soft mt-1">{step.text}</p>
            </li>
          ))}
        </ol>

        <p className="text-sm text-ink-soft mt-6 pt-6 border-t border-ink/10">
          Los precios son en dólares y por caja completa. El PVP sugerido es el
          precio de nuestra tienda: respetarlo mantiene el margen parejo para
          todos los que revenden.
        </p>
      </section>
    </div>
  );
}
