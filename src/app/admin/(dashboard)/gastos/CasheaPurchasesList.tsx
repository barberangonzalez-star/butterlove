import type { CasheaPurchaseWithInstallments } from "@/lib/cashea-data";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/**
 * Estado de cada compra Cashea: la inicial ya está pagada (se registró al
 * crear la compra), y cada cuota se ve pendiente hasta que el cron diario la
 * registra como gasto en su fecha.
 */
export default function CasheaPurchasesList({
  purchases,
}: {
  purchases: CasheaPurchaseWithInstallments[];
}) {
  if (purchases.length === 0) return null;

  return (
    <div className="border border-black/10 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-black/10">
        <p className="text-xs font-medium text-[#787774] uppercase tracking-wide">
          Compras Cashea
        </p>
      </div>
      <ul className="divide-y divide-black/5">
        {purchases.map((purchase) => (
          <li key={purchase.id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">
                {purchase.description ?? "Compra Cashea"}
              </p>
              <span className="text-sm tabular-nums shrink-0">
                {fmtUsd(Number(purchase.totalUsd))}
              </span>
            </div>
            <p className="text-xs text-[#787774] mt-0.5">
              {shortDate(purchase.purchaseDate)} · inicial{" "}
              {fmtUsd(Number(purchase.initialUsd))} pagada
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {purchase.installments.map((installment) => {
                const paid = installment.expenseId !== null;
                return (
                  <span
                    key={installment.id}
                    title={`Cuota ${installment.installmentNumber} · ${fmtUsd(Number(installment.amountUsd))}`}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      paid
                        ? "border-black/15 text-[#5f5e5b]"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {shortDate(installment.dueDate)} ·{" "}
                    {fmtUsd(Number(installment.amountUsd))}
                    {paid ? " · pagada" : " · pendiente"}
                  </span>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
