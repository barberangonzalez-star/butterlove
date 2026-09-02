import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { pushSubscriptions } from "./db/schema";

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}

export async function getPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  const db = getDb();
  return db.select().from(pushSubscriptions);
}

/**
 * Guarda —o actualiza— la suscripción de un navegador.
 *
 * El endpoint es la identidad: el mismo teléfono que vuelve a activar las
 * notificaciones trae el mismo endpoint con llaves nuevas, y pisarlas es lo
 * correcto. Insertar una fila más dejaría dos suscripciones vivas para un solo
 * teléfono, y el aviso llegaría por duplicado.
 */
export async function savePushSubscription(input: PushSubscriptionInput) {
  const db = getDb();
  await db
    .insert(pushSubscriptions)
    .values(input)
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
      },
    });
}

export async function deletePushSubscription(endpoint: string) {
  const db = getDb();
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}
