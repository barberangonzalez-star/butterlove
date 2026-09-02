"use server";

import { verifySession } from "@/lib/admin-session";
import {
  deletePushSubscription,
  savePushSubscription,
} from "@/lib/push-data";

/**
 * Registra este navegador para recibir los avisos de pedidos.
 *
 * Lo que llega es lo que produjo el navegador al suscribirse: la URL del
 * servicio de push del fabricante y las dos llaves con las que se cifra el
 * mensaje. Va detrás de la sesión del panel: sólo quien entra al admin puede
 * pedir que le avisen de las ventas.
 */
export async function subscribeToPushAction(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}) {
  await verifySession();

  if (!subscription.endpoint || !subscription.p256dh || !subscription.auth) {
    throw new Error("La suscripción llegó incompleta.");
  }

  await savePushSubscription({
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    userAgent: subscription.userAgent?.slice(0, 300) ?? null,
  });
}

/** Deja de avisarle a este navegador. */
export async function unsubscribeFromPushAction(endpoint: string) {
  await verifySession();
  await deletePushSubscription(endpoint);
}
