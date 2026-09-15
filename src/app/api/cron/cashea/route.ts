import {
  getCasheaPurchaseById,
  getInstallmentsToNotify,
  markInstallmentNotified,
} from "@/lib/cashea-data";
import { sendAdminPush } from "@/lib/push";

export const dynamic = "force-dynamic";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

/** El día de calendario en Venezuela, no en la zona del servidor. */
function caracasDate(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(date);
}

/**
 * Cron diario: avisa por push las cuotas Cashea que vencen mañana, para que
 * Gabriel tenga el efectivo listo. El gasto en sí NO se crea solo — Gabriel
 * confirma el pago a mano desde /admin/gastos, porque puede pagarla un día
 * distinto al anotado. Vercel la llama con `Authorization: Bearer
 * $CRON_SECRET`; sin ese secreto configurado, se rechaza cualquier llamada
 * para que nadie dispare pushes desde afuera.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tomorrow = caracasDate(1);

  const toNotify = await getInstallmentsToNotify(tomorrow);
  let notified = 0;
  for (const installment of toNotify) {
    const purchase = await getCasheaPurchaseById(installment.purchaseId);
    await sendAdminPush({
      title: `Mañana toca cuota Cashea: ${fmtUsd(Number(installment.amountUsd))}`,
      body: purchase?.description
        ? `Cuota ${installment.installmentNumber}/${purchase.installmentCount} · ${purchase.description}`
        : `Cuota ${installment.installmentNumber}`,
      url: "/admin/gastos",
      tag: `cashea-${installment.id}`,
    });
    await markInstallmentNotified(installment.id);
    notified += 1;
  }

  return Response.json({ tomorrow, notified });
}
