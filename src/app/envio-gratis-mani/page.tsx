import type { Metadata } from "next";
import Image from "next/image";
import {
  CandyOff,
  Check,
  Clock4,
  Dumbbell,
  Flame,
  PackageCheck,
  Sprout,
  Truck,
  X,
} from "lucide-react";
import { getProductsByKeys } from "@/lib/products-data";
import {
  WHATSAPP_LINK,
  PAYMENT_METHODS,
  NATIONAL_COURIERS,
} from "@/lib/config";
import PromoVideo from "@/app/promomani/_components/PromoVideo";
import PromoBuy from "@/app/promomani/_components/PromoBuy";
import PromoCountdown from "@/app/promomani/_components/PromoCountdown";
import ReviewList from "@/components/ReviewList";
import StarRating from "@/components/StarRating";
import { getProductReviews } from "@/lib/reviews-data";
import { formatRating, reviewCountLabel } from "@/lib/reviews";
import {
  buildPacks,
  buildUpsells,
  LANDING_KEYS,
  SHIPPING_PACKS,
  UNIT_KEY,
} from "@/app/promomani/packs";

export const metadata: Metadata = {
  title: "2 frascos de mantequilla de maní con envío gratis",
  description:
    "Mantequilla de maní 100% natural, un solo ingrediente. Dos frascos de 230g con el envío gratis a toda Venezuela, solo por este enlace.",
  // Igual que /promomani: se reparte por anuncio y por link, y un precio de
  // campaña no tiene que quedar en el buscador cuando la campaña termine.
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

/**
 * La hora de esta landing corre aparte de la de /promomani: quien ya agotó
 * aquella no tiene por qué llegar acá con la promo vencida.
 */
const CLOCK_KEY = "butterlove-promo-envio-inicio";

/** "MRW, Zoom, Domesa o Tealca": se lee como opciones, no como una lista. */
const COURIERS = new Intl.ListFormat("es", { type: "disjunction" }).format(
  NATIONAL_COURIERS,
);

/** Las mismas cinco razones de /promomani, una por renglón. */
const reasons = [
  {
    icon: Clock4,
    title: "Corta el antojo de las 4 pm",
    text: "Dos cucharadas y se apaga.",
  },
  {
    icon: Sprout,
    title: "Sacia con proteína vegetal",
    text: "Un desayuno que te sostiene hasta el almuerzo.",
  },
  { icon: CandyOff, title: "Sin azúcar agregada", text: "Ni subidón, ni caída." },
  {
    icon: Flame,
    title: "Encaja en keto y low carb",
    text: "Grasas y proteína, pocos carbohidratos.",
  },
  {
    icon: Dumbbell,
    title: "Pre y post entreno",
    text: "Energía antes, proteína después.",
  },
];

const uses = [
  { emoji: "🥣", text: "En la avena de la mañana", bg: "bg-mani-bg" },
  { emoji: "🍞", text: "Sobre la tostada, con banana", bg: "bg-pistacho-bg" },
  { emoji: "🥤", text: "En el batido pre-entreno", bg: "bg-almendras-bg" },
  { emoji: "🍎", text: "Con manzana, de merienda", bg: "bg-merey-bg" },
];

/**
 * Cómo llega, en el orden en que pasa. Es lo que esta landing vende además
 * del maní, así que se cuenta entero y no en una línea de la FAQ: quien vive
 * lejos de Caracas pregunta antes que nada si de verdad le llega y cuánto le
 * cuesta retirarlo.
 */
const shipping = [
  {
    icon: PackageCheck,
    title: "Lo despachamos pagado",
    text: `Por ${COURIERS}, a la agencia que elijas. No pagas nada al retirar.`,
  },
  {
    icon: Truck,
    title: "En Caracas, delivery gratis",
    text: "Te lo llevamos a tu zona sin costo. O lo buscas en un punto de encuentro.",
  },
];

const steps = [
  {
    title: "Agrega tu combo",
    text: "Dos frascos de 230g. El envío ya va incluido.",
  },
  {
    title: "Confirma por WhatsApp",
    text: "El pedido se arma solo en un mensaje. Tú solo lo envías.",
  },
  {
    title: "Recíbelo",
    text: `Por encomienda a todo el país, o delivery en Caracas. Pagas con ${PAYMENT_METHODS.join(", ")}.`,
  },
];

const faqs = [
  {
    q: "¿El envío es gratis de verdad?",
    a: `Sí. Fuera de Caracas lo mandamos por ${COURIERS} con el flete pagado, y en la agencia no pagas nada. En Caracas el delivery también va por nuestra cuenta, en cualquier zona.`,
  },
  {
    q: "¿Qué datos necesito para el envío?",
    a: "Nombre completo y cédula de quien retira, un celular y la agencia de destino. Si no sabes cuál te queda cerca, escribe tu ciudad y la buscamos contigo.",
  },
  {
    q: "¿Qué lleva además del maní?",
    a: "Nada. Maní tostado y molido despacio hasta quedar cremoso. Sin azúcar, sin aceites añadidos, sin leche en polvo, sin conservantes.",
  },
  {
    q: "¿Por qué se le separa el aceite?",
    a: "Porque es maní de verdad. Las cremas industriales no se separan porque llevan aceites que las estabilizan; esta se revuelve con una cuchara y queda lista.",
  },
  {
    q: "¿Cómo la guardo y cuánto dura?",
    a: "En un lugar fresco y seco, tapada. Al no llevar conservantes, lo mejor es consumirla dentro de los tres meses. En la nevera se pone más firme y dura más.",
  },
  {
    q: "¿Es vegana? ¿Tiene gluten?",
    a: "Es vegana, y el maní no tiene gluten. Contiene maní: si eres alérgico a los frutos secos o al maní, esta no es para ti.",
  },
  {
    q: "¿Cómo pago?",
    a: `${PAYMENT_METHODS.join(", ")}. Los datos te llegan por WhatsApp al confirmar el pedido.`,
  },
];

/**
 * La landing del combo de dos frascos con el envío pagado.
 *
 * Es /promomani con otra oferta: la misma estructura, los mismos argumentos y
 * los mismos componentes de compra. Lo que cambia es lo que se vende —un pack
 * solo, que no ahorra sobre los frascos sueltos sino el flete— y por eso la
 * página cuenta el envío donde aquella contaba el descuento.
 *
 * A diferencia de aquella, la portada no es una pieza con el precio escrito
 * adentro: es la foto de los dos frascos con el precio encima en texto, sacado
 * de la base de datos. Así cambiar el precio en el panel no obliga a rehacer
 * ninguna imagen.
 */
export default async function LandingEnvioGratisMani() {
  const [products, reviews] = await Promise.all([
    getProductsByKeys(LANDING_KEYS),
    getProductReviews(UNIT_KEY),
  ]);
  const packs = buildPacks(products, SHIPPING_PACKS);
  const upsells = buildUpsells(products);
  const pack = packs[0];

  return (
    // El espacio de abajo es del botón flotante: sin él, tapa el cierre.
    <div className="mx-auto max-w-xl pb-32">
      <PromoCountdown clockKey={CLOCK_KEY} />

      {/* La oferta entera en la portada: los dos frascos, el precio y el
          envío. El sello va sobre la foto, en la esquina donde la foto sólo
          tiene pared, para no tapar ninguna etiqueta. */}
      <section className="px-3 pt-3">
        <div className="relative overflow-hidden torn-card aspect-square bg-surface">
          <Image
            src="/hero/duo-mani.webp"
            alt="Dos frascos de mantequilla de maní Butter Love"
            fill
            priority
            sizes="(max-width: 640px) 100vw, 576px"
            className="object-cover"
          />
          <span className="absolute top-5 right-5 w-28 h-28 sm:w-32 sm:h-32 rotate-6 rounded-full bg-mani-bg shadow-lg flex flex-col items-center justify-center text-center text-ink leading-none">
            <span className="text-[11px] font-bold uppercase tracking-widest">
              Envío
            </span>
            <span className="font-display font-700 text-2xl sm:text-3xl">
              GRATIS
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide leading-tight">
              a toda
              <br />
              Venezuela
            </span>
          </span>
        </div>
      </section>

      {/* El titular dice la oferta en palabras, con el precio de la base de
          datos. Va de `h1`: es el nombre de la página. */}
      <section className="px-4 pt-7 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
          Mantequilla de maní · 2 frascos de 230g
        </p>
        <h1 className="mt-2 font-display font-700 text-3xl sm:text-4xl text-ink">
          {pack
            ? `2 frascos por $${pack.price.toFixed(2)}, con envío gratis`
            : "2 frascos con envío gratis"}
        </h1>
        <p className="mt-3 text-ink-soft leading-relaxed">
          A cualquier parte del país. Sin azúcar, 100% maní.
        </p>

        <a
          href="#combos"
          className="mt-5 block rounded-full bg-ink text-cream px-6 py-4 font-bold hover:opacity-85 transition-opacity"
        >
          Lo quiero
        </a>
      </section>

      <ul className="mx-4 mt-7 grid grid-cols-2 gap-x-3 gap-y-3 border-y border-ink/10 py-4 text-center text-[11px] font-bold uppercase tracking-widest text-ink-soft">
        {[
          "1 solo ingrediente",
          "Sin azúcar agregada",
          "Hecha a mano",
          "Envío gratis",
        ].map((claim) => (
          <li key={claim} className="leading-snug">
            {claim}
          </li>
        ))}
      </ul>

      <PromoBuy
        packs={packs}
        upsells={upsells}
        clockKey={CLOCK_KEY}
        // El envío lo da el combo, no una marca en el carrito.
        promo={null}
        kicker="Tu combo"
        title="Dos frascos, y el envío corre por nuestra cuenta"
        perk={{
          title: "Envío gratis a toda Venezuela",
          text: (
            <>
              Encomienda pagada por{" "}
              <span className="font-semibold">{COURIERS}</span>, o delivery
              gratis en Caracas.
            </>
          ),
        }}
      />

      <section className="px-3">
        <PromoVideo />
      </section>

      {/* El envío, contado. En /promomani acá va la etiqueta; en esta landing
          la duda que frena la compra es otra —si llega y cuánto cuesta
          retirarlo—, así que se contesta primero. */}
      <section className="px-4 pt-14">
        <h2 className="font-display font-700 text-3xl text-ink">
          Te llega a donde estés
        </h2>
        <ul className="mt-6 space-y-3">
          {shipping.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="flex items-start gap-3 rounded-3xl bg-surface p-4"
            >
              <span className="shrink-0 w-10 h-10 rounded-full bg-mani-bg text-ink flex items-center justify-center">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 leading-snug">
                <span className="block font-display font-700 text-ink">
                  {title}
                </span>
                <span className="block text-sm text-ink-soft mt-0.5">
                  {text}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-4 py-14">
        <h2 className="font-display font-700 text-3xl text-ink">
          Lee la etiqueta. Te va a tomar un segundo.
        </h2>
        <p className="mt-3 text-ink-soft leading-relaxed">
          La mayoría de las cremas de maní del supermercado tienen entre cinco y
          nueve ingredientes. Esta tiene uno.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-mani-bg p-5 flex flex-col">
            <p className="font-display font-700 text-ink">Lo que sí</p>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-ink">
              {["Maní premium seleccionado", "Proceso de extracción dedicado"].map(
                (item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check
                      className="w-4 h-4 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ),
              )}
            </ul>
            <p className="mt-auto pt-6 text-sm text-ink/70">
              Y ya. Eso es todo.
            </p>
          </div>

          <div className="rounded-3xl bg-surface p-5">
            <p className="font-display font-700 text-ink">No lleva</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              {[
                "Azúcar agregada",
                "Aceite de palma",
                "Leche en polvo",
                "Conservantes",
                "Saborizantes",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <X className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-3 pb-14">
        <div className="torn-card bg-mani-bg px-4 py-8 sm:px-6">
          <h2 className="px-1 font-display font-700 text-3xl text-ink">
            La mantequilla de maní juega a tu favor
          </h2>
          <p className="mt-3 px-1 text-ink/75 leading-relaxed">
            Lo que arruina una dieta no es la comida: es el antojo de media
            tarde.
          </p>

          <ul className="mt-6 space-y-2.5">
            {reasons.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="flex items-center gap-3 rounded-2xl bg-white/75 p-3"
              >
                <span className="shrink-0 w-10 h-10 rounded-full bg-ink text-mani-bg flex items-center justify-center">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 leading-snug">
                  <span className="block font-display font-700 text-ink">
                    {title}
                  </span>
                  <span className="block text-sm text-ink-soft">{text}</span>
                </span>
              </li>
            ))}
          </ul>

          <a
            href="#combos"
            className="mt-7 block rounded-full bg-ink text-cream px-6 py-4 text-center font-bold hover:opacity-85 transition-opacity"
          >
            Quiero mis 2 frascos · envío gratis
          </a>
        </div>

        <p className="mt-4 px-1 text-xs leading-relaxed text-ink-soft/80">
          Una porción es una cucharada: es maní puro y rinde muchísimo. Es un
          alimento, no un tratamiento, y no sustituye la orientación de un
          profesional de la salud. Contiene maní.
        </p>
      </section>

      {reviews && (
        <section id="resenas" className="px-4 pb-14 scroll-mt-4">
          <h2 className="font-display font-700 text-3xl text-ink">
            Lo que dicen
          </h2>
          <div className="mt-3 mb-6 flex items-center gap-3">
            <StarRating value={reviews.summary.average} size={18} />
            <p className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">
                {formatRating(reviews.summary.average)}
              </span>{" "}
              · {reviewCountLabel(reviews.summary.count)}
            </p>
          </div>
          <ReviewList reviews={reviews.reviews} />
        </section>
      )}

      <section className="px-4 pb-14">
        <h2 className="font-display font-700 text-3xl text-ink">
          Cuatro maneras de acabártela
        </h2>
        <ul className="mt-6 space-y-3">
          {uses.map((u, i) => (
            <li
              key={u.text}
              className={`${u.bg} flex items-center gap-4 rounded-full px-5 py-3.5 shadow-sm ${
                i % 2 === 0 ? "-rotate-1" : "rotate-1"
              }`}
            >
              <span
                className="shrink-0 w-11 h-11 rounded-full bg-white/70 flex items-center justify-center text-2xl"
                aria-hidden="true"
              >
                {u.emoji}
              </span>
              <span className="font-display font-700 text-lg text-ink leading-tight">
                {u.text}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-4 pb-14">
        <h2 className="font-display font-700 text-3xl text-ink">Cómo pedir</h2>
        <ol className="mt-6 space-y-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="shrink-0 w-9 h-9 rounded-full bg-mani-bg font-display font-700 text-ink flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <h3 className="font-display font-700 text-lg text-ink">
                  {s.title}
                </h3>
                <p className="text-ink-soft leading-relaxed">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-4 pb-14">
        <h2 className="font-display font-700 text-3xl text-ink">Preguntas</h2>
        <div className="mt-5 divide-y divide-ink/10 border-y border-ink/10">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold text-ink">
                {f.q}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-xl leading-none text-ink-soft transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-2 text-ink-soft leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-3 pb-10">
        <div className="rounded-[34px] bg-mani-bg py-6 pl-2 pr-6 sm:py-8 sm:pl-3 sm:pr-8 flex items-center gap-3 sm:gap-4">
          <Image
            src="/products/mani.webp"
            alt=""
            aria-hidden="true"
            width={384}
            height={384}
            className="shrink-0 w-24 sm:w-44 h-auto drop-shadow-lg"
          />

          <div className="min-w-0">
            <h2 className="font-display font-700 text-2xl sm:text-3xl text-ink">
              Un frasco no dura lo que crees
            </h2>
            <p className="mt-2 text-sm sm:text-base text-ink/75 leading-relaxed">
              {pack
                ? `Llévate dos por $${pack.price.toFixed(2)}, con el envío pagado hasta tu ciudad.`
                : "Llévate dos, con el envío pagado hasta tu ciudad."}
            </p>
            <a
              href="#combos"
              className="mt-5 inline-block rounded-full bg-ink text-cream px-7 py-3.5 font-bold hover:opacity-85 transition-opacity"
            >
              Pedir mi combo
            </a>
            <p className="mt-4 text-sm text-ink/70 leading-relaxed">
              ¿Dudas?{" "}
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                Escríbenos por WhatsApp
              </a>
            </p>
          </div>
        </div>
      </section>

      <footer className="px-4 pb-10 text-center text-xs text-ink-soft">
        Butter Love · Mantequillas hechas a mano · Caracas
      </footer>
    </div>
  );
}
