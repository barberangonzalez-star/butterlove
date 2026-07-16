import { deepseek } from "@ai-sdk/deepseek";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { products } from "@/lib/products";
import { posts } from "@/lib/posts";
import {
  PAYMENT_METHODS,
  PAGO_MOVIL,
  PROMOTIONS,
  WHATSAPP_LINK,
} from "@/lib/config";
import { getBcvRate } from "@/lib/bcv";

export const maxDuration = 30;

const vesFormatter = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function buildSystemPrompt(bcv: Awaited<ReturnType<typeof getBcvRate>>) {
  const toVes = (usd: number) =>
    bcv ? `Bs. ${vesFormatter.format(usd * bcv.rate)}` : null;

  const catalog = products
    .map((p) => {
      const prices = p.sizes
        .map((s) => {
          const ves = toVes(s.price);
          return `${s.grams}g: $${s.price}${ves ? ` (${ves})` : ""}`;
        })
        .join(", ");
      return `- ${p.name} — "${p.tagline}". ${p.description} Precios: ${prices}.`;
    })
    .join("\n");

  const benefits = posts
    .filter((p) => p.category === "beneficios")
    .map((p) => `- ${p.title}: ${p.body.join(" ")}`)
    .join("\n");

  const recipes = posts
    .filter((p) => p.category === "recetas")
    .map((p) => {
      const r = p.recipe;
      const ingredients = r ? ` Ingredientes: ${r.ingredients.join(", ")}. Pasos: ${r.steps.join(" ")}` : "";
      return `- ${p.title} (${p.readTime}): ${p.excerpt}${ingredients}`;
    })
    .join("\n");

  const rateLine = bcv
    ? `1 USD = ${toVes(1)} (tasa oficial BCV, actualizada ${new Date(bcv.updatedAt).toLocaleString("es-VE")}).`
    : "La tasa BCV no está disponible en este momento: menciona los precios solo en USD y aclara que la conversión a bolívares no se pudo calcular ahora mismo.";

  const pagoMovil = `${PAGO_MOVIL.bank} - ${PAGO_MOVIL.id} - ${PAGO_MOVIL.phone.replace(/-/g, "")}`;

  const promos = PROMOTIONS.map((promo) => `- ${promo.title}: ${promo.description}`).join("\n");

  return `Eres el asistente virtual de Butter Love, marca venezolana de mantequillas artesanales de maní, pistacho, almendras y merey.

Identidad de marca (repítelo cuando aplique, es el corazón del negocio): todos los productos son 100% naturales, hechos a mano en tandas pequeñas y sin azúcar agregada. "De la finca al frasco, sin atajos." Son "positivamente adictivas": sin rellenos, sin aceites raros, sin atajos.

Catálogo y precios (USD y equivalente en bolívares a la tasa BCV oficial):
${catalog}

Promoción activa:
${promos}

Tasa de cambio:
${rateLine}

Beneficios nutricionales por sabor:
${benefits}

Recetas con nuestras mantequillas:
${recipes}

Cómo pedir:
1. El cliente elige sabor y tamaño (230g o 350g).
2. Confirma el pedido por WhatsApp: ${WHATSAPP_LINK}.
3. Paga como prefiera: ${PAYMENT_METHODS.join(", ")}.
4. Coordinan la entrega o punto de encuentro por WhatsApp.

Datos de Pago Móvil: ${pagoMovil}

Enlace directo de WhatsApp: ${WHATSAPP_LINK}

Instrucciones de estilo:
- Responde siempre en español, breve, cálido y cercano, como si fueras parte del equipo de Butter Love.
- Usa **negrillas** (con doble asterisco) para resaltar lo importante, como precios o el enlace de WhatsApp.
- Cuando menciones WhatsApp, incluye siempre el enlace ${WHATSAPP_LINK} tal cual (no lo reemplaces por el número solo).
- Usa emojis con moderación cuando aporten calidez (🥜🍯😊), sin abusar.
- Si preguntan el precio en bolívares y no mencionan bolívares tú, aclara que es un estimado según la tasa BCV del momento.
- Si no sabes algo con certeza, no inventes: sugiere contactar por WhatsApp.`;
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const bcv = await getBcvRate();

  const result = streamText({
    model: deepseek("deepseek-chat"),
    system: buildSystemPrompt(bcv),
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
