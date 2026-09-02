import "server-only";
import webpush from "web-push";
import { SITE_URL, VAPID_PUBLIC_KEY } from "./config";
import { deletePushSubscription, getPushSubscriptions } from "./push-data";

/**
 * Lo que ve el teléfono en la notificación. El service worker (`admin-sw.js`)
 * lee justo estos campos.
 */
export interface PushPayload {
  title: string;
  body: string;
  /** A dónde lleva al tocarla. */
  url: string;
  /**
   * Agrupa: dos avisos con el mismo tag se pisan en vez de apilarse. Los
   * pedidos llevan tag distinto —cada uno es un pedido distinto que atender—.
   */
  tag?: string;
}

let configured = false;

/**
 * Deja `web-push` listo para firmar, o devuelve false si no hay llave privada.
 *
 * Sin llave no se lanza: que falte una variable de entorno no puede tumbar el
 * checkout de un cliente. El pedido se guarda igual y lo que se pierde es el
 * aviso, que es lo recuperable de los dos.
 */
function configure() {
  if (configured) return true;

  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) return false;

  // El "subject" es a quién contactar si el servicio de push tiene un problema
  // con estos envíos. Va el sitio y no un correo personal.
  webpush.setVapidDetails(SITE_URL, VAPID_PUBLIC_KEY, privateKey);
  configured = true;
  return true;
}

/**
 * Manda la notificación a todos los teléfonos suscritos.
 *
 * Nunca lanza: un aviso que no salió no puede hacer fallar lo que lo disparó.
 * Las suscripciones muertas —404 o 410, o sea app desinstalada o permiso
 * revocado— se borran solas, porque reintentarlas cada venta es gastar una
 * petición en un teléfono que ya no existe.
 */
export async function sendAdminPush(payload: PushPayload) {
  if (!configure()) {
    console.warn("VAPID_PRIVATE_KEY no está configurado: no se envió el push.");
    return { sent: 0, removed: 0 };
  }

  const subscriptions = await getPushSubscriptions();
  if (subscriptions.length === 0) return { sent: 0, removed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
          // Media hora de vida: un aviso de venta que llega al día siguiente ya
          // no es un aviso, es ruido.
          { TTL: 1800 },
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await deletePushSubscription(subscription.endpoint);
          removed += 1;
          return;
        }
        console.error("No se pudo enviar el push", status, error);
      }
    }),
  );

  return { sent, removed };
}
