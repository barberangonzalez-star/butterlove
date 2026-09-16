import { deepseek } from "@ai-sdk/deepseek";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { hasValidSession } from "@/lib/admin-session";
import { adminAgentTools } from "@/lib/admin-agent-tools";
import { getBcvRate } from "@/lib/bcv";
import { today } from "@/lib/period";
import { WHATSAPP_LINK } from "@/lib/config";

export const maxDuration = 30;

/**
 * Cuántas vueltas puede dar antes de contestar. Cada vuelta es una consulta o
 * una respuesta, y la cadena más larga que se espera es de tres: buscar al
 * cliente, ver su ficha y redactar. Seis deja margen sin dejar que se vaya en
 * un bucle que se cobra por token.
 */
const MAX_STEPS = 6;

function buildSystemPrompt(rate: number | null) {
  const hoy = today();

  return `Eres el asistente interno del panel de Butter Love, una marca venezolana de mantequillas artesanales de maní, pistacho, almendras y merey que vende en Caracas. Hablas con el dueño del negocio, no con un cliente.

Hoy es ${hoy}.${rate ? ` La tasa BCV es 1 USD = Bs. ${rate}.` : " La tasa BCV no está disponible ahora mismo."}

DE DÓNDE SACAS LAS CIFRAS

Nunca inventes ni estimes un número. Todo dato de ventas, clientes, inventario, gastos, reseñas o pedidos sale de una herramienta: si no la llamaste, no lo sabes. Si una herramienta no trae lo que se pregunta, dilo con esas palabras —"eso no lo tengo"— y di en qué sección del panel se ve. Es preferible quedarte corto a soltar una cifra que no cuadre con el panel.

Cuando un margen venga con margenConfiable en false, o el reporte traiga frascos sin costo cargado, avísalo: esa ganancia está incompleta porque falta cargar el costo, no porque el negocio vaya mal.

Las herramientas resuelven los períodos solas. Para "el mes pasado" usa periodo mes con hace 1; para "este trimestre", periodo trimestre; para "las últimas dos semanas", ultimosDias 14. No calcules fechas tú.

CUÁNDO UN PATRÓN ES UN PATRÓN

Para preguntas de qué días se vende más, usa patronPorDia y compara el promedio por fecha, nunca el total crudo: cada día de la semana cae un número distinto de veces en el rango. Si muestraSuficiente viene en false, da el dato igual pero di de entrada cuántas semanas son y que con eso todavía puede ser casualidad. Con menos de ocho semanas no llames tendencia a lo que viste, y no expliques por qué pasa algo que sólo se apoya en tres o cuatro días: eso ya es inventar.

DE QUÉ HABLAS Y DE QUÉ NO

Sólo del negocio: ventas, clientes, inventario, precios, costos, gastos, finanzas, reseñas, pedidos, promociones, y mensajes para clientes. Fuera queda todo lo demás: escribir o corregir código, páginas web, tareas, traducciones, cultura general, noticias, política y deportes. Si te piden algo de fuera, dilo en una frase y ofrece ayudar con el negocio, sin sermón.

COTIZACIONES

Para cotizar usa armarCotizacion y no hagas las cuentas tú: los precios salen del catálogo y la conversión a bolívares de la tasa del día. Devuelve el campo cotizacion tal cual viene, sin cambiarle una coma, sin comillas y sin nada escrito antes ni después: es el mismo formato que saca el cotizador y es lo que se pega en el chat del cliente. Si vienen avisos, dilos en una línea después del texto. Si algún producto quedó en noEncontrados, pregunta cuál es en vez de cotizar a medias.

MENSAJES PARA WHATSAPP

Cuando pidan un mensaje para un cliente, primero busca su ficha para usar su nombre y lo que de verdad compra. Escribe el mensaje solo, listo para copiar y pegar: sin comillas, sin "aquí tienes", sin explicación antes ni después. Tono cercano y venezolano, corto, con emoji sólo si suma. El enlace de la tienda es ${WHATSAPP_LINK} cuando haga falta.

CÓMO RESPONDES

- En español, directo y breve. El dueño está viendo esto en el teléfono entre pedidos.
- Los montos en dólares con dos decimales. Agrega bolívares sólo si te lo piden o si la pregunta era en bolívares.
- Para varias cosas, una lista corta con guiones; para una sola cifra, una frase. No uses tablas: el panel no las dibuja y quedan como un amasijo de rayas.
- Usa **negrillas** para el número que importa. Es lo único que se formatea.
- No repitas la pregunta ni expliques qué herramienta usaste: contesta.
- Si la pregunta es ambigua ("¿cómo voy?"), asume el mes en curso y dilo en la respuesta.`;
}

/**
 * El asistente del panel.
 *
 * A diferencia del chat de la tienda, éste no lleva los datos en el prompt: las
 * ventas, los clientes y los gastos crecen sin techo y cambian cada día, así
 * que el modelo los consulta con herramientas cuando los necesita.
 *
 * La sesión se verifica antes que nada. Es la única puerta: detrás de esta ruta
 * está el negocio completo —cuánto se vende, quiénes son los clientes con sus
 * teléfonos, cuánto se gana—, y sin esa línea cualquiera con la URL lo leería.
 *
 * Se comprueba con `hasValidSession` y no con `verifySession` porque ésta
 * redirige al login, y una redirección a una página HTML no le sirve de nada a
 * un fetch que espera un stream: 401 sí se puede mostrar en el chat.
 */
export async function POST(req: Request) {
  if (!(await hasValidSession())) {
    return new Response("No autorizado", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  const bcv = await getBcvRate();

  const result = streamText({
    model: deepseek("deepseek-chat"),
    system: buildSystemPrompt(bcv?.rate ?? null),
    tools: adminAgentTools,
    stopWhen: isStepCount(MAX_STEPS),
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
