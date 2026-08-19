import type { Metadata } from "next";
import Image from "next/image";
import { Check, X } from "lucide-react";
import { getProductsByKeys } from "@/lib/products-data";
import {
  WHATSAPP_LINK,
  PAYMENT_METHODS,
  DELIVERY_METHODS,
  NATIONAL_COURIERS,
} from "@/lib/config";
import HeroVideo from "./_components/HeroVideo";
import PromoBuy from "./_components/PromoBuy";
import { buildPacks, PACK_KEYS } from "./packs";

export const metadata: Metadata = {
  title: "Promo mantequilla de maní",
  description:
    "Mantequilla de maní 100% natural, un solo ingrediente. Combos de 2 y 3 frascos con descuento, solo por este enlace.",
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
  { title: "Corta el antojo de las 4 pm", text: "Dos cucharadas y se apaga." },
  {
    title: "Sacia con proteína vegetal",
    text: "Un desayuno que te sostiene hasta el almuerzo.",
  },
  { title: "Sin azúcar agregada", text: "Ni subidón, ni caída." },
  {
    title: "Encaja en keto y low carb",
    text: "Grasas y proteína, pocos carbohidratos.",
  },
  {
    title: "Pre y post entreno",
    text: "Energía antes, proteína después.",
  },
];

const uses = [
  { emoji: "🥣", text: "En la avena de la mañana" },
  { emoji: "🍞", text: "Sobre la tostada, con banana" },
  { emoji: "🥤", text: "En el batido pre-entreno" },
  { emoji: "🍎", text: "Con manzana, de merienda" },
];

const steps = [
  {
    title: "Elige tu combo",
    text: "1, 2 o 3 frascos. El descuento se aplica solo.",
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
    q: "¿Hacen envíos fuera de Caracas?",
    a: `Sí, por encomienda: ${NATIONAL_COURIERS.join(", ")}. En Caracas hay delivery por zona y punto de encuentro.`,
  },
  {
    q: "¿Cómo pago?",
    a: `${PAYMENT_METHODS.join(", ")}. Los datos te llegan por WhatsApp al confirmar el pedido.`,
  },
];

export default async function LandingPromoMani() {
  const products = await getProductsByKeys(PACK_KEYS);
  const packs = buildPacks(products);
  const unitPack = packs.find((p) => p.jars === 1);
  // Dos maneras de ser el mejor pack, y no siempre las gana el mismo: el que
  // deja el frasco más barato titula el precio, y el que más plata ahorra
  // cierra la página. Los dos salen de los precios reales.
  const bestPack = packs.reduce<(typeof packs)[number] | undefined>(
    (best, p) => (!best || p.perJar < best.perJar ? p : best),
    undefined,
  );
  const topSaver = packs.reduce<(typeof packs)[number] | undefined>(
    (best, p) => (p.saved > (best?.saved ?? 0) ? p : best),
    undefined,
  );

  return (
    // El espacio de abajo es del botón flotante: sin él, tapa el cierre.
    <div className="mx-auto max-w-xl pb-32">
      {/* El video va solo: nada de texto encima. El titular y la oferta van
          justo debajo, sobre fondo propio, para que ni la letra compita con el
          frasco ni el frasco se lea peor por el degradado. En 16:9 no se
          recorta ningún cuadro, y de paso el precio entra en la primera
          pantalla del teléfono. */}
      <section className="px-3 pt-3">
        <HeroVideo />
      </section>

      {/* La oferta arranca aquí, no después de los beneficios: precio,
          ahorro y llamado a la acción van en el primer scroll. */}
      <section className="px-4 pt-7">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
          Precio especial por este enlace
        </p>
        <h1 className="font-display font-700 text-4xl sm:text-5xl text-ink mt-2">
          Mantequilla de maní que solo lleva maní
        </h1>
        <p className="mt-3 text-ink-soft leading-relaxed">
          Tostado y molido despacio hasta quedar cremoso. Un ingrediente, cero
          azúcar agregada, hecha a mano en tandas pequeñas.
        </p>

        {/* El precio tachado es el del frasco suelto: sólo tiene sentido
            enseñarlo si de verdad hay un combo que lo baja. */}
        {bestPack && (
          <p className="mt-4 text-ink font-display font-700 text-lg">
            Desde ${bestPack.perJar.toFixed(2)} el frasco de 230g{" "}
            {unitPack && bestPack.jars > 1 && (
              <span className="font-body font-400 text-sm text-ink-soft line-through">
                ${unitPack.price.toFixed(2)}
              </span>
            )}
          </p>
        )}
        {topSaver && topSaver.jars > 1 && (
          <p className="mt-1 text-sm font-semibold text-ink-soft">
            Llévate {topSaver.jars} y ahorra ${topSaver.saved.toFixed(2)} frente
            a comprarlos sueltos.
          </p>
        )}

        <a
          href="#combos"
          className="mt-5 block rounded-full bg-ink text-cream px-6 py-4 text-center font-bold hover:opacity-85 transition-opacity"
        >
          Ver combos y precios
        </a>

        {/* Las dudas que frenan una compra por anuncio —cómo pago, cómo me
            llega— contestadas junto al botón y no doce pantallas más abajo,
            que es donde estaban. */}
        <p className="mt-3 text-center text-sm text-ink-soft leading-relaxed">
          Pides por WhatsApp y pagas al confirmar con{" "}
          {PAYMENT_METHODS.join(", ")}. Delivery en Caracas y envío a todo el
          país.
        </p>
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
      <PromoBuy packs={packs} />

      {/* Justo después del precio: lo que se acaba de elegir, en la mesa. El
          hueco que quedaba entre el botón y el título siguiente era espacio
          muerto, y esta foto lo aprovecha para volver a enseñar el producto
          cuando el cliente todavía está decidiendo. */}
      <section className="px-3">
        <div className="relative overflow-hidden torn-card aspect-square">
          <Image
            src="/hero/duo-mani-tabla.jpg"
            alt="Dos frascos de mantequilla de maní Butter Love sobre una tabla de madera"
            fill
            sizes="(max-width: 640px) 100vw, 576px"
            className="object-cover"
          />
        </div>
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
            <p className="font-display font-700 text-ink">Lleva</p>
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

      {/* Sin panel de color y sin recuadros: cinco renglones sobre el fondo de
          la página. El argumento se sostiene con la negrita del primer trozo de
          cada frase, y lo que antes hacía el fondo azul —separar esta parte del
          resto— lo hace ahora el aire de arriba y abajo. */}
      <section className="px-4 pb-14">
        <h2 className="font-display font-700 text-3xl text-ink">
          La mantequilla de maní juega a tu favor
        </h2>
        <p className="mt-3 text-ink-soft leading-relaxed">
          Lo que arruina una dieta no es la comida: es el antojo de media tarde.
        </p>

        <ul className="mt-6 space-y-3">
          {reasons.map((r) => (
            <li key={r.title} className="text-ink-soft leading-relaxed">
              <span className="font-semibold text-ink">{r.title}.</span>{" "}
              {r.text}
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

        <p className="mt-6 text-xs leading-relaxed text-ink-soft/80">
          Una porción es una cucharada: es maní puro y rinde muchísimo. Es un
          alimento, no un tratamiento, y no sustituye la orientación de un
          profesional de la salud. Contiene maní.
        </p>
      </section>

      {/* Cuatro maneras, sin cuatro tarjetas: el emoji ya separa un renglón
          del otro sin que haga falta pintarle un fondo detrás. */}
      <section className="px-4 pb-14">
        <h2 className="font-display font-700 text-3xl text-ink">
          Cuatro maneras de acabártela
        </h2>
        <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
          {uses.map((u) => (
            <li key={u.text} className="flex flex-col gap-1.5">
              <span className="text-3xl" aria-hidden="true">
                {u.emoji}
              </span>
              <span className="text-sm font-semibold text-ink leading-snug">
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

      {/* La última imagen antes de la última pregunta. Va pegada al cierre a
          propósito: el que llegó hasta acá ya leyó todos los argumentos, y lo
          que falta no es un dato más sino volver a ver el frasco. Los maníes
          sueltos alrededor cuentan solos lo que la etiqueta dice con letras. */}
      <section className="px-3 pb-4">
        <div className="relative overflow-hidden torn-card aspect-square">
          <Image
            src="/hero/duo-mani-azul.jpg"
            alt="Dos frascos de mantequilla de maní Butter Love rodeados de maníes"
            fill
            sizes="(max-width: 640px) 100vw, 576px"
            className="object-cover"
          />
        </div>
      </section>

      <section className="px-3 pb-10">
        <div className="rounded-[34px] bg-mani-bg px-6 py-12 text-center">
          <h2 className="font-display font-700 text-3xl text-ink">
            Un frasco no dura lo que crees
          </h2>
          <p className="mt-3 text-ink/75 leading-relaxed">
            {topSaver && topSaver.jars > 1
              ? `Por eso el combo de ${topSaver.jars} te ahorra $${topSaver.saved.toFixed(2)}.`
              : "Llévate el tuyo antes de que se acabe la tanda."}
          </p>
          <a
            href="#combos"
            className="mt-6 inline-block rounded-full bg-ink text-cream px-8 py-4 font-bold hover:opacity-85 transition-opacity"
          >
            Elegir mi combo
          </a>
          <p className="mt-5 text-sm text-ink/70">
            ¿Dudas antes de pedir?{" "}
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
      </section>

      <footer className="px-4 pb-10 text-center text-xs text-ink-soft">
        Butter Love · Mantequillas hechas a mano · Caracas
      </footer>
    </div>
  );
}
