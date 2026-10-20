import Image from "next/image";
import { ChevronDown, Info, Sprout, Truck, Wallet } from "lucide-react";
import { isCombo, productTitle, type Product } from "@/lib/products";
import {
  DELIVERY_METHODS,
  DELIVERY_ZONES,
  NATIONAL_COURIERS,
  PAYMENT_METHODS,
} from "@/lib/config";

/**
 * Lo que va debajo de la descripción en el teléfono: lo que trae el frasco,
 * una cinta con lo que nos distingue, la foto grande y las preguntas de
 * siempre plegadas.
 *
 * Antes todo esto era texto corrido —los detalles en una tabla, la entrega y
 * el pago debajo del botón— y en una pantalla angosta se leía como una
 * planilla. Plegado, cada cosa es un renglón que se abre si interesa, y lo que
 * no interesa no estorba.
 *
 * Sólo en el teléfono y la tablet. En pantalla ancha la ficha ya tiene su
 * tabla de detalles y su columna de compra con la entrega y el pago, y
 * repetirlos ahí sería decir todo dos veces.
 */

/** Lo que vale para todos los frascos. Son las mismas promesas que hace la historia de la home. */
const MARQUEE = [
  "Sin azúcar",
  "Hecho a mano",
  "Tandas pequeñas",
  "Sin rellenos",
  "Frutos venezolanos",
];

const MIN_DELIVERY = Math.min(...DELIVERY_ZONES.map((z) => z.price));

export default function ProductMoreInfo({
  product,
  details,
}: {
  product: Product;
  details: [string, string][];
}) {
  const title = productTitle(product);

  return (
    <div className="lg:hidden space-y-10">
      {product.badges.length > 0 && (
        <section
          className={`torn-card ${isCombo(product) ? "bg-surface" : product.bgClass} px-6 py-8`}
        >
          <h2 className="font-display font-700 text-lg text-ink">
            Lo que trae cada frasco
          </h2>
          <ul className="mt-3 space-y-1.5">
            {product.badges.map((badge) => (
              <li key={badge} className="text-2xl text-ink leading-snug">
                {badge}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* La cinta va de borde a borde, saliéndose del margen de la página:
          contenida en la columna parecía un botón ancho. */}
      <div
        className="-mx-5 sm:-mx-8 overflow-hidden py-4"
        style={{ backgroundColor: product.accentHex }}
      >
        <div className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1}
              className="flex shrink-0 items-center"
            >
              {MARQUEE.map((item) => (
                <li
                  key={item}
                  className="flex items-center font-display font-700 text-3xl text-ink whitespace-nowrap"
                >
                  <span className="px-5">{item}</span>
                  <span aria-hidden="true" className="text-xl">
                    ✦
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      <section>
        {/* La foto de ambiente es apaisada y los frascos caen a la derecha:
            recortada al cuadrado se conservan ellos y se va el fondo vacío. */}
        <div className="torn-card relative aspect-square overflow-hidden bg-surface">
          <Image
            src={product.heroImage}
            alt={`${title} Butter Love`}
            fill
            sizes="(max-width: 1024px) 92vw, 1px"
            className="object-cover object-[80%_center]"
          />
        </div>

        <h2 className="mt-8 font-display font-700 text-4xl text-ink leading-tight">
          De la finca al frasco, sin atajos.
        </h2>

        {/* `<details>` y no un acordeón con estado: se abre y se cierra sin
            JavaScript, funciona con el teclado y el buscador de la página
            encuentra lo que está plegado. */}
        <div className="mt-6 border-t border-ink/10">
          <Fold icon={<Sprout className="w-5 h-5" aria-hidden="true" />} title="Lo bueno empieza simple">
            <p>
              Cada frasco de Butter Love empieza en manos de productores
              venezolanos de maní, pistacho, almendras y merey. Sin rellenos,
              sin aceites raros, sin azúcar agregada.
            </p>
            <p className="mt-3">
              Tostamos y molemos en tandas pequeñas, despacio, hasta lograr la
              cremosidad justa. Lo que dice el frasco es lo que hay dentro.
            </p>
          </Fold>

          <Fold icon={<Info className="w-5 h-5" aria-hidden="true" />} title="Detalles del producto">
            <dl>
              {details.map(([label, value]) => (
                <div key={label} className="flex gap-4 py-1">
                  <dt className="w-28 shrink-0">{label}</dt>
                  <dd className="text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Fold>

          <Fold icon={<Truck className="w-5 h-5" aria-hidden="true" />} title="Entrega">
            <p>{DELIVERY_METHODS.join(" · ")}.</p>
            <p className="mt-2">
              Delivery en Caracas desde ${MIN_DELIVERY.toFixed(2)} según tu
              zona. El pickup no cuesta nada.
            </p>
            <p className="mt-2">
              Al resto del país va por encomienda ({NATIONAL_COURIERS.join(", ")}),
              y el flete se paga al retirar.
            </p>
          </Fold>

          <Fold icon={<Wallet className="w-5 h-5" aria-hidden="true" />} title="Pago">
            <p>{PAYMENT_METHODS.join(" · ")}.</p>
            <p className="mt-2">
              Se confirma por WhatsApp: allí se acuerda la entrega y se envían
              los datos de pago. No se paga nada en el sitio.
            </p>
          </Fold>
        </div>
      </section>
    </div>
  );
}

function Fold({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-b border-ink/10">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-4 text-ink [&::-webkit-details-marker]:hidden">
        <span className="text-ink-soft">{icon}</span>
        <span className="flex-1 font-display font-700 text-lg">{title}</span>
        <ChevronDown
          className="w-5 h-5 text-ink-soft transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="pb-5 pl-8 text-base text-ink-soft leading-relaxed">
        {children}
      </div>
    </details>
  );
}
