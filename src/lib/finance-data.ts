import "server-only";
import { getSales } from "./sales-data";
import { getExpenses, getReplacementRate } from "./expenses-data";
import { BS_PAYMENT_METHODS } from "./config";

/** Cuánto dejó cada producto, por tamaño. */
export interface ProductMargin {
  productName: string;
  grams: number;
  quantity: number;
  revenue: number;
  cost: number;
  margin: number;
  /** False si alguna venta de este producto no tenía costo conocido. */
  costKnown: boolean;
}

export interface ExpenseTotal {
  category: string;
  kind: string;
  amount: number;
}

export interface MonthReport {
  month: string;
  orders: number;
  jars: number;

  /** Todo lo cobrado, incluido el delivery que se le sumó al cliente. */
  grossRevenue: number;
  deliveryCharged: number;
  /** Lo que entró por vender mantequilla, que es lo que se compara con el costo. */
  productRevenue: number;

  cogs: number;
  /** Frascos vendidos sin receta completa: el costo de esos no se sabe. */
  jarsWithoutCost: number;
  grossMargin: number;

  deliveryCost: number;
  deliveryResult: number;

  operatingExpenses: number;
  inventoryExpenses: number;
  expensesByCategory: ExpenseTotal[];

  netProfit: number;

  /** Caja: lo que entró y salió del bolsillo, sin importar a qué mes pertenece. */
  cashIn: number;
  cashOut: number;
  cashFlow: number;

  /** Ventas cobradas en bolívares, para medir la pérdida por tasa. */
  bsRevenueUsd: number;
  bsAmount: number;
  replacementRate: number | null;
  /** Dólares que faltan al reponer lo cobrado en Bs. Null sin tasa cargada. */
  rateLoss: number | null;

  byProduct: ProductMargin[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Primer y último día de un mes "YYYY-MM", en fechas ISO. */
export function monthBounds(month: string) {
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${pad(lastDay)}` };
}

/**
 * El mes entero en un solo objeto: qué entró, qué costó y qué quedó.
 *
 * Dos cuentas distintas a propósito. La **ganancia** compara lo que se vendió
 * con lo que costó hacerlo más los gastos de operar; comprar materia prima no
 * entra ahí porque ya se cuenta frasco a frasco al venderla. La **caja** es lo
 * que entró y salió del bolsillo este mes, materia prima incluida. Un mes
 * puede ser bueno en ganancia y malo en caja si se compró inventario para
 * adelante — y eso es información, no un error.
 */
export async function getMonthReport(month: string): Promise<MonthReport> {
  const { from, to } = monthBounds(month);

  const [sales, expenses, replacementRate] = await Promise.all([
    getSales({ from, to }),
    getExpenses(from, to),
    getReplacementRate(month),
  ]);

  let grossRevenue = 0;
  let deliveryCharged = 0;
  let deliveryCost = 0;
  let cogs = 0;
  let jars = 0;
  let jarsWithoutCost = 0;
  let bsRevenueUsd = 0;
  let bsAmount = 0;

  const products = new Map<string, ProductMargin>();

  for (const sale of sales) {
    grossRevenue += Number(sale.amountUsd);
    deliveryCharged += Number(sale.deliveryFeeUsd ?? 0);
    deliveryCost += Number(sale.deliveryCostUsd ?? 0);

    if (
      sale.paymentMethod &&
      BS_PAYMENT_METHODS.includes(sale.paymentMethod) &&
      sale.amountBs
    ) {
      bsRevenueUsd += Number(sale.amountUsd);
      bsAmount += Number(sale.amountBs);
    }

    for (const item of sale.items) {
      const quantity = item.quantity;
      const revenue = Number(item.unitPriceUsd) * quantity;
      const unitCost = item.unitCostUsd === null ? null : Number(item.unitCostUsd);
      const cost = unitCost === null ? 0 : unitCost * quantity;

      jars += quantity;
      if (unitCost === null) jarsWithoutCost += quantity;
      else cogs += cost;

      const key = `${item.productName}·${item.grams}`;
      const entry = products.get(key);
      if (entry) {
        entry.quantity += quantity;
        entry.revenue += revenue;
        entry.cost += cost;
        entry.margin = entry.revenue - entry.cost;
        entry.costKnown &&= unitCost !== null;
      } else {
        products.set(key, {
          productName: item.productName,
          grams: item.grams,
          quantity,
          revenue,
          cost,
          margin: revenue - cost,
          costKnown: unitCost !== null,
        });
      }
    }
  }

  const byCategory = new Map<string, ExpenseTotal>();
  let operatingExpenses = 0;
  let inventoryExpenses = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amountUsd);
    if (expense.kind === "inventario") inventoryExpenses += amount;
    else operatingExpenses += amount;

    const entry = byCategory.get(expense.category);
    if (entry) entry.amount += amount;
    else
      byCategory.set(expense.category, {
        category: expense.category,
        kind: expense.kind,
        amount,
      });
  }

  const productRevenue = grossRevenue - deliveryCharged;
  const grossMargin = productRevenue - cogs;
  const deliveryResult = deliveryCharged - deliveryCost;
  const netProfit = grossMargin + deliveryResult - operatingExpenses;

  // El costo del delivery sale del bolsillo aunque se registre en la venta y
  // no como gasto, así que en la caja va igual.
  const cashOut = operatingExpenses + inventoryExpenses + deliveryCost;

  // Lo cobrado en Bs se convirtió a tasa BCV; reponer esos dólares cuesta la
  // tasa real. La diferencia es plata que se fue sin aparecer en ninguna venta.
  const rateLoss =
    replacementRate && replacementRate > 0
      ? bsRevenueUsd - bsAmount / replacementRate
      : null;

  return {
    month,
    orders: sales.length,
    jars,
    grossRevenue,
    deliveryCharged,
    productRevenue,
    cogs,
    jarsWithoutCost,
    grossMargin,
    deliveryCost,
    deliveryResult,
    operatingExpenses,
    inventoryExpenses,
    expensesByCategory: [...byCategory.values()].sort(
      (a, b) => b.amount - a.amount,
    ),
    netProfit,
    cashIn: grossRevenue,
    cashOut,
    cashFlow: grossRevenue - cashOut,
    bsRevenueUsd,
    bsAmount,
    replacementRate,
    rateLoss,
    byProduct: [...products.values()].sort((a, b) => b.margin - a.margin),
  };
}
