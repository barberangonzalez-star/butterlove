import type { Metadata } from "next";
import Image from "next/image";
import {
  CandyOff,
  Check,
  Clock4,
  Dumbbell,
  Flame,
  Sprout,
  X,
} from "lucide-react";
import { getProductsByKeys } from "@/lib/products-data";
import {
  WHATSAPP_LINK,
  PAYMENT_METHODS,
  DELIVERY_METHODS,
  NATIONAL_COURIERS,
  DELIVERY_ZONES,
  LANDING_FREE_DELIVERY,
} from "@/lib/config";
import PromoVideo from "./_components/PromoVideo";
import PromoBuy from "./_components/PromoBuy";
import PromoCountdown from "./_components/PromoCountdown";
import ReviewList from "@/components/ReviewList";
import StarRating from "@/components/StarRating";
import { getProductReviews } from "@/lib/reviews-data";
import { formatRating, reviewCountLabel } from "@/lib/reviews";
import { buildPacks, buildUpsells, LANDING_KEYS, UNIT_KEY } from "./packs";

export const metadata: Metadata = {
  title: "Promo mantequilla de maní",
  description:
    "Mantequilla de maní 100% natural, un solo ingrediente. Combos de 2, 3 y 6 frascos con descuento, solo por este enlace.",
  // La promo se reparte por anuncio y por link, no por buscador: indexarla
  // competiría con la ficha del producto por la misma búsqueda y pondría un
  // precio de campaña en los resultados mucho después de que la campaña
  // terminó. `nofollow` evita además que el enlace de WhatsApp se rastree.
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

/**
 * Por qué comprarla, en cinco renglones.
 *
 * Antes esto eran dos bloques —"beneficios" y "si estás cuidando lo que comes"—
 * de seis puntos cada uno, con un párrafo debajo de cada título, y a mitad de
 * camino se repetían: los dos hablaban de proteína, de saciedad y de azúcar.
 * Doce argumentos no convencen más que cinco; cansan, y el que se cansa no
 * vuelve al precio. Cada uno cabe ahora en un renglón, que es lo que alguien
 * de verdad lee entre un anuncio y un botón.
 */
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

/**
 * Cada manera lleva el color de un sabor de la casa, en el orden de la
 * vitrina: las franjas se leen como una sola familia y no como cuatro avisos
 * sueltos.
 */
const uses = [
  { emoji: "🥣", text: "En la avena de la mañana", bg: "bg-mani-bg" },
  { emoji: "🍞", text: "Sobre la tostada, con banana", bg: "bg-pistacho-bg" },
  { emoji: "🥤", text: "En el batido pre-entreno", bg: "bg-almendras-bg" },
  { emoji: "🍎", text: "Con manzana, de merienda", bg: "bg-merey-bg" },
];

const steps = [
  {
    title: "Elige tu combo",
    text: "1, 2, 3 o 6 frascos. El descuento se aplica solo.",
  },
  {
    title: "Confirma por WhatsApp",
    text: "El pedido se arma solo en un mensaje. Tú solo lo envías.",
  },
  {
    title: "Recíbelo",
    text: `${DELIVERY_METHODS.join(", ")}. Pagas con ${PAYMENT_METHODS.join(", ")}.`,
  },
];

const faqs = [
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
    q: "¿Cuánto cuesta el delivery?",
    a: `Pidiendo desde esta promo es gratis en ${new Intl.ListFormat("es", { type: "conjunction" }).format(LANDING_FREE_DELIVERY.zones)}. En el resto de Caracas va desde $${Math.min(...DELIVERY_ZONES.map((z) => z.price)).toFixed(2)} según tu zona, y el pickup no cuesta nada.`,
  },
  {
    q: "¿Hacen envíos fuera de Caracas?",
    a: `Sí, por encomienda: ${NATIONAL_COURIERS.join(", ")}. En Caracas hay delivery por zona y punto de encuentro.`,
  },
  {
    q: "¿Cómo pago?",
    a: `${PAYMENT_METHODS.join(", ")}. Los datos te llegan por WhatsApp al confirmar el pedido.`,
  },
];

export default async function LandingPromoMani() {
  const [products, reviews] = await Promise.all([
    getProductsByKeys(LANDING_KEYS),
    getProductReviews(UNIT_KEY),
  ]);
  const packs = buildPacks(products);
  const upsells = buildUpsells(products);
  // El pack que más plata ahorra, sacado de los precios reales: es el que
  // firma el botón del argumento y el que cierra la página.
  const topSaver = packs.reduce<(typeof packs)[number] | undefined>(
    (best, p) => (p.saved > (best?.saved ?? 0) ? p : best),
    undefined,
  );

  return (
    // El espacio de abajo es del botón flotante: sin él, tapa el cierre.
    <div className="mx-auto max-w-xl pb-32">
      <PromoCountdown />
      {/* Abre con la pieza del precio: dice el antes y el después del frasco
          en números grandes, que es lo primero que alguien quiere saber cuando
          llega desde un anuncio de descuento. Va en 4:5 —su proporción real—
          para que no se recorte ninguna letra.

          Ojo al mantenerla: los números de la imagen están escritos a mano
          adentro y los de la página salen de la base de datos. Hoy coinciden
          —$5.00 el frasco llevando seis, contra $6.99 suelto—, pero si cambia
          un precio en el panel la página se actualiza sola y la imagen no.
          Cualquier cambio de precio obliga a rehacer esta pieza. */}
      <section className="px-3 pt-3">
        <div className="relative overflow-hidden torn-card aspect-[4/5]">
          <Image
            src="/hero/promo-mani-precio-28.jpg"
            alt="28% de descuento en mantequilla de maní Butter Love: antes $7, ahora $5 el frasco por la compra de seis unidades"
            fill
            priority
            sizes="(max-width: 640px) 100vw, 576px"
            className="object-cover"
          />
        </div>
      </section>

      {/* La frase y el botón, y nada más. El titular, el párrafo y el precio
          que había acá se fueron: la imagen de arriba ya los dice, y repetirlos
          debajo era leer dos veces lo mismo antes de llegar al botón.

          Va de `h1` aunque sea corta. Es el único titular que queda en la
          página, y sin él quien navega con lector de pantalla se encuentra un
          documento que empieza sin nombre. */}
      <section className="px-4 pt-7 text-center">
        <h1 className="font-display font-700 text-3xl sm:text-4xl text-ink">
          Sin azúcar 100% maní
        </h1>

        <a
          href="#combos"
          className="mt-5 block rounded-full bg-ink text-cream px-6 py-4 font-bold hover:opacity-85 transition-opacity"
        >
          Ver Combos
        </a>
      </section>

      {/* Lo que la marca promete, en cuatro palabras que se leen sin bajar.
          Eran cuatro píldoras con fondo y se acomodaban tres arriba y una
          suelta abajo, que es la fila que se ve rota. Ahora es una franja entre
          dos líneas finas, con la letra pequeña y espaciada de una etiqueta de
          producto: nada encerrado.

          Dos columnas en todos los anchos, no cuatro: la página nunca pasa de
          576px, así que cuatro columnas quedan apretadas hasta en el
          escritorio y "sin azúcar agregada" se parte en dos renglones. De dos
          en dos siempre entran de corrido y las cuatro pesan igual. */}
      <ul className="mx-4 mt-7 grid grid-cols-2 gap-x-3 gap-y-3 border-y border-ink/10 py-4 text-center text-[11px] font-bold uppercase tracking-widest text-ink-soft">
        {[
          "1 solo ingrediente",
          "Sin azúcar agregada",
          "Hecha a mano",
          "100% natural",
        ].map((claim) => (
          <li key={claim} className="leading-snug">
            {claim}
          </li>
        ))}
      </ul>

      {/* Los combos, arriba del todo: la oferta se cierra antes de pedirle a
          nadie que siga leyendo. Lo que sigue es la prueba de por qué vale la
          pena, para quien todavía no ha decidido. */}
      <PromoBuy packs={packs} upsells={upsells} />

      {/* El video, justo después del precio. Acá estaba la foto de los frascos
          sobre la tabla, que es la misma toma con la que está armado el anuncio
          de arriba: enseñarla otra vez a media página era repetir la portada.
          El video sí aporta algo que ninguna foto de la página tiene, que es
          ver la crema caer, y llega en el momento en que el cliente acaba de
          ver el precio y todavía está decidiendo. */}
      <section className="px-3">
        <PromoVideo />
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
          {/* La lista de al lado tiene cinco renglones y la de acá dos: esa
              desproporción es el argumento, así que el aire que sobra queda a
              la vista en vez de repartirse. */}
          <div className="rounded-3xl bg-mani-bg p-5 flex flex-col">
            {/* "Lo que sí" y no "Lleva": abajo hay un ingrediente y un
                proceso, y "lleva" los cuenta a los dos como si fueran cosas
                metidas en el frasco. Eso pelearía con el renglón de arriba,
                que es el argumento más fuerte de la página: esta tiene uno. */}
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

      {/* El argumento central de la página, en el color del maní. Es el
          único panel de color entero entre la portada y el cierre, y por eso
          se nota: cada razón va en su propio renglón blanco con un ícono, que
          se lee de un vistazo bajando con el pulgar. El aviso de salud queda
          afuera del panel, en letra chica, porque no es parte de la venta. */}
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

          {/* El que leyó hasta acá ya se convenció: el camino de vuelta a los
              combos no puede ser desandar la página. */}
          <a
            href="#combos"
            className="mt-7 block rounded-full bg-ink text-cream px-6 py-4 text-center font-bold hover:opacity-85 transition-opacity"
          >
            {topSaver && topSaver.jars > 1
              ? `Quiero mi combo · ahorra $${topSaver.saved.toFixed(2)}`
              : "Quiero el mío"}
          </a>
        </div>

        <p className="mt-4 px-1 text-xs leading-relaxed text-ink-soft/80">
          Una porción es una cucharada: es maní puro y rinde muchísimo. Es un
          alimento, no un tratamiento, y no sustituye la orientación de un
          profesional de la salud. Contiene maní.
        </p>
      </section>

      {/* Lo que dicen los que ya la compraron, justo cuando el argumento
          termina: después de leer por qué conviene, la duda que queda es si
          es verdad. Son las reseñas publicadas del frasco de maní, las mismas
          de su ficha, y si todavía no llegan al mínimo el bloque no sale. */}
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

      {/* La segunda pieza de la campaña, donde termina el argumento y empieza
          el uso diario: quien bajó leyendo se reencuentra con la promo justo
          antes del último tramo, sin tener que volver arriba a recordarla.

          Va en 4:5, su proporción, y sin `priority`: está muy por debajo del
          pliegue y cargarla de urgencia le quitaría ancho de banda a la de
          arriba, que sí es lo primero que se ve. */}
      <section className="px-3 pb-14">
        <div className="relative overflow-hidden torn-card aspect-[4/5]">
          <Image
            src="/hero/promo-mani-28.jpg"
            alt="Promo mantequilla de maní Butter Love: ahorra hasta 28% en tu compra"
            fill
            sizes="(max-width: 640px) 100vw, 576px"
            className="object-cover"
          />
        </div>
      </section>

      {/* Cuatro franjas, una por manera, cada una del color de un sabor. Van
          apenas ladeadas, alternando, como etiquetas pegadas a mano: es la
          parte juguetona de la página, y un renglón entero por idea deja que
          el texto entre sin partirse en el teléfono. */}
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

      {/* `details` en vez de acordeón propio: abre sin JavaScript, el buscador
          del teléfono encuentra el texto adentro y pesa cero. */}
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

      {/* El frasco a la izquierda y el texto alineado contra él. Es el mismo
          recorte que usan las tarjetas de combo, y no otra foto: al venir
          justo debajo de una fotografía de dos frascos, una tercera fotografía
          sería la misma imagen dos veces, mientras que el recorte se lee como
          parte del recuadro y no como una imagen aparte.

          Alineado a la izquierda, no centrado: los cuatro renglones arrancan
          todos en la misma vertical, que es la que sigue el ojo al bajar. */}
      <section className="px-3 pb-10">
        {/* El margen interno de la izquierda es casi nada: el frasco arranca
            pegado al borde y crece hacia adentro del recuadro en vez de
            comerse la columna del texto. Así entra más grande de lo que
            entraría respetando el margen, y al texto le queda el mismo ancho
            que tenía con el frasco chico. */}
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
              {topSaver && topSaver.jars > 1
                ? `Por eso el combo de ${topSaver.jars} te ahorra $${topSaver.saved.toFixed(2)}.`
                : "Llévate el tuyo antes de que se acabe la tanda."}
            </p>
            <a
              href="#combos"
              className="mt-5 inline-block rounded-full bg-ink text-cream px-7 py-3.5 font-bold hover:opacity-85 transition-opacity"
            >
              Elegir mi combo
            </a>
            {/* "¿Dudas?" y no "¿Dudas antes de pedir?": las tres palabras que
                sobran eran justo las que partían el renglón en dos y obligaban
                a dejar el frasco chico. */}
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
