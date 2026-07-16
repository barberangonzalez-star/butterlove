import { deepseek } from "@ai-sdk/deepseek";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { products } from "@/lib/products";
import { PAYMENT_METHODS, PAGO_MOVIL, WHATSAPP_NUMBER } from "@/lib/config";

export const maxDuration = 30;

const catalog = products
  .map((p) => {
    const prices = p.sizes.map((s) => `${s.grams}g: $${s.price}`).join(", ");
    return `- ${p.name} (${p.tagline}): ${p.description} Precios: ${prices}.`;
  })
  .join("\n");

const systemPrompt = `Eres el asistente virtual de Butter Love, una marca venezolana de mantequillas artesanales de maní, pistacho, almendras y merey, 100% naturales y sin azúcar agregada.

Catálogo:
${catalog}

Métodos de pago aceptados: ${PAYMENT_METHODS.join(", ")}.
Datos de Pago Móvil: Banco ${PAGO_MOVIL.bank}, Teléfono ${PAGO_MOVIL.phone}, Cédula/RIF ${PAGO_MOVIL.id}.
Para coordinar pedidos y entregas, remite al cliente al WhatsApp +${WHATSAPP_NUMBER}.

Responde siempre en español, de forma breve, cálida y cercana. Si no sabes algo con certeza, sugiere contactar por WhatsApp en lugar de inventar información.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: deepseek("deepseek-chat"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
