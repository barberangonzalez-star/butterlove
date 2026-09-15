import Link from "next/link";
import { monthBounds } from "@/lib/finance-data";
import { getExpenseMonths, getExpenses } from "@/lib/expenses-data";
import { getCasheaPurchases } from "@/lib/cashea-data";
import { today } from "@/lib/period";
import { getBcvRate } from "@/lib/bcv";
import MonthPicker, { type MonthOption } from "../finanzas/MonthPicker";
import BcvConverterWidget from "../_components/BcvConverterWidget";
import GastosClient from "./GastosClient";
import CasheaPurchaseForm from "./CasheaPurchaseForm";
import CasheaPurchasesList from "./CasheaPurchasesList";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const pad = (n: number) => String(n).padStart(2, "0");

function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("es-VE", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Anotar gastos, que es lo que se hace a diario, sin pasar por el reporte.
 * Son los mismos gastos que lee Finanzas: acá se cargan y allá se leen ya
 * mezclados con las ventas del mes.
 */
export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const month =
    monthParam && MONTH_RE.test(monthParam) ? monthParam : currentMonth;

  const { from, to } = monthBounds(month);
  const [expenses, expenseMonths, bcvRate, casheaPurchases] = await Promise.all([
    getExpenses(from, to),
    getExpenseMonths(),
    getBcvRate(),
    getCasheaPurchases(),
  ]);

  const months: MonthOption[] = [
    ...new Set([currentMonth, month, ...expenseMonths]),
  ]
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({ value, label: monthLabel(value) }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold">Gastos</h1>
          <p className="text-sm text-[#787774] mt-0.5">
            Lo que sale del bolsillo.{" "}
            <Link
              href={`/admin/finanzas?month=${month}`}
              className="underline underline-offset-2 hover:text-[#37352f]"
            >
              Se ve en Finanzas
            </Link>{" "}
            junto a las ventas del mes.
          </p>
        </div>
        <MonthPicker month={month} months={months} />
      </div>

      <div className="grid 2xl:grid-cols-[1fr_260px] gap-6 items-start">
        <div className="min-w-0">
          {/* Anotar un gasto viejo es lo raro: si el mes que se está viendo es
              el de hoy, el formulario arranca en hoy; si no, en su primer
              día. */}
          <GastosClient
            expenses={expenses}
            defaultDate={month === currentMonth ? today() : from}
            bcvRate={bcvRate?.rate ?? null}
          />

          <div className="mt-6 space-y-4">
            <CasheaPurchaseForm
              defaultDate={month === currentMonth ? today() : from}
              bcvRate={bcvRate?.rate ?? null}
            />
            <CasheaPurchasesList purchases={casheaPurchases} />
          </div>
        </div>

        <BcvConverterWidget />
      </div>
    </div>
  );
}
