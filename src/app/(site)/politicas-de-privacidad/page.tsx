import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/seo";
import {
  WHATSAPP_LINK,
  PAYMENT_METHODS,
  DELIVERY_METHODS,
  DELIVERY_PROVIDERS,
  NATIONAL_COURIERS,
} from "@/lib/config";

export const metadata: Metadata = {
  title: "Políticas y privacidad",
  description:
    "Qué datos pide Butter Love para procesar un pedido, para qué se usan, con quién se comparten y cómo pedir que se corrijan o se borren.",
  alternates: { canonical: "/politicas-de-privacidad" },
};

/**
 * Última vez que se revisó el texto, no la fecha del deploy. Se actualiza a
 * mano cuando cambia el contenido, no con cada commit del sitio.
 */
const LAST_UPDATED = "11 de septiembre de 2026";

const sections = [
  {
    heading: "Qué datos pedimos",
    paragraphs: [
      "Para armar un pedido pedimos nombre, teléfono, y la dirección o zona de entrega. Si el envío es por encomienda, además pedimos cédula, porque la empresa de encomienda la exige para entregar el paquete.",
      "Si eliges delivery en Caracas, te pedimos que envíes tu ubicación por WhatsApp: es la forma en que el repartidor llega sin dar vueltas. Si pagas por Pago Móvil, Binance o cualquier método que pida comprobante, ese comprobante, una foto o una captura, también se manda por WhatsApp.",
      "Nada de esto se escribe en un formulario del sitio que lo guarde: el carrito arma un mensaje con estos datos y tú lo envías por tu WhatsApp al nuestro. Quien recibe y responde ese mensaje es Butter Love.",
    ],
  },
  {
    heading: "Para qué los usamos",
    paragraphs: [
      "Para confirmar el pedido, coordinar la entrega o el retiro, y resolver cualquier duda sobre esa compra puntual. No los usamos para nada que no tenga que ver con tu pedido.",
      "No vendemos ni cedemos tus datos a terceros con fines comerciales.",
    ],
  },
  {
    heading: "Con quién se comparten",
    paragraphs: [
      `Solo con quien necesita saberlo para que el pedido llegue: la persona que hace el delivery (${DELIVERY_PROVIDERS.join(", ")}) o la empresa de encomienda que elijas (${NATIONAL_COURIERS.join(", ")}). Reciben lo mínimo para entregar (nombre, dirección o agencia, teléfono y, en encomienda, cédula) y nada más.`,
    ],
  },
  {
    heading: "Cómo pagas",
    paragraphs: [
      `Aceptamos ${PAYMENT_METHODS.join(", ")}. El sitio no procesa pagos ni guarda datos de tarjetas o cuentas bancarias: los datos para pagar (número de Pago Móvil, correo de Binance) te los mostramos nosotros, y el comprobante de que ya pagaste lo confirmas por WhatsApp.`,
    ],
  },
  {
    heading: "Cookies y analítica",
    paragraphs: [
      "El sitio usa Google Analytics y el pixel de Meta (Facebook/Instagram) para saber qué páginas se visitan y qué tan bien funciona un anuncio. Miden visitas y clics, no leen tus mensajes de WhatsApp ni tienen acceso a tu pedido.",
      "Puedes bloquear estas cookies desde la configuración de tu navegador, o desactivar los anuncios personalizados de Meta desde tus propias preferencias de anuncios en Facebook o Instagram; el sitio funciona igual sin ellas, solo que nosotros vemos menos de qué sirvió.",
    ],
  },
  {
    heading: "El asistente del sitio",
    paragraphs: [
      "El chat que responde preguntas sobre sabores, precios y envíos usa lo que escribes ahí solo para responderte en el momento: no queda ligado a tu nombre ni se cruza con tus pedidos.",
    ],
  },
  {
    heading: "Cuánto tiempo se guardan",
    paragraphs: [
      "Lo que llega por WhatsApp queda en esa conversación, como cualquier chat. Lo usamos mientras dure el pedido y, para clientes que vuelven a comprar, para no volver a pedirte los mismos datos cada vez. Si prefieres que borremos tu historial, escríbenos y lo hacemos.",
    ],
  },
  {
    heading: "Tus datos, tus reglas",
    paragraphs: [
      "Puedes pedirnos en cualquier momento que te digamos qué datos tuyos tenemos, que los corrijamos si están mal, o que los borremos. Basta un mensaje por WhatsApp.",
    ],
  },
  {
    heading: "Condiciones de compra",
    paragraphs: [
      "Los precios están en dólares y pueden cambiar sin aviso previo; el que vale es el que confirmamos contigo al armar el pedido, no uno visto antes en una captura vieja.",
      `La disponibilidad depende del stock del día: si un sabor o un tamaño se agotó entre que lo viste y que escribiste, te lo decimos por WhatsApp antes de cobrar nada. La entrega es por ${DELIVERY_METHODS.join(", ").toLowerCase()}, según lo que elijas al pedir.`,
      "Si algo llega en mal estado o no es lo que pediste, escríbenos por WhatsApp con una foto: lo resolvemos caso por caso, porque cada producto y cada envío son distintos.",
    ],
  },
  {
    heading: "Menores de edad",
    paragraphs: [
      "El sitio no está dirigido a menores de edad, y no pedimos ni buscamos datos de menores a propósito.",
    ],
  },
  {
    heading: "Cambios a esta política",
    paragraphs: [
      "Si cambia algo de fondo, qué datos pedimos o para qué los usamos, lo actualizamos aquí mismo y cambiamos la fecha de abajo.",
    ],
  },
];

export default function PoliticasDePrivacidadPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 sm:px-8 py-12 sm:py-16">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          { name: "Políticas y privacidad", path: "/politicas-de-privacidad" },
        ])}
      />

      <h1 className="font-display font-700 text-3xl sm:text-4xl text-ink mb-3">
        Políticas y privacidad
      </h1>
      <p className="text-sm text-ink-soft mb-10">
        Última actualización: {LAST_UPDATED}
      </p>

      <p className="text-lg text-ink leading-relaxed mb-8">
        Butter Love es un emprendimiento artesanal, en proceso de
        formalización. Esto explica qué información pedimos para procesar un
        pedido, para qué la usamos y qué puedes pedirnos sobre ella. Si algo
        acá no queda claro, pregúntanos directo por{" "}
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2"
        >
          WhatsApp
        </a>
        .
      </p>

      <div className="text-ink leading-relaxed">
        {sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="font-display font-700 text-xl text-ink mb-2">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="mb-3 text-ink-soft">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-ink/10">
        <p className="text-ink-soft text-sm">
          ¿Dudas sobre tus datos o tu pedido?{" "}
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-2"
          >
            Escríbenos por WhatsApp
          </a>
          .
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-ink-soft hover:text-ink"
        >
          ← Volver al inicio
        </Link>
      </div>
    </article>
  );
}
