import "server-only";
import { cache } from "react";
import { getSales, type Sale } from "./sales-data";
import { getExpenses, getReplacementRate } from "./expenses-data";
import { getAdminProducts } from "./products-data";
import { getSizeCosts } from "./costs-data";
import { makeUnitCostResolver, type UnitCostResolver } from "./unit-cost";
import { BS_PAYMENT_METHODS } from "./config";

/**
 * El catálogo y sus costos, una sola vez por request. Lo piden el reporte del
 * mes y el detalle por producto, que casi siempre se dibujan en la misma
 * pantalla.
 */
export const getUnitCostResolver = cache(async function getUnitCostResolver() {
  const [products, sizeCosts] = await Promise.all([
    getAdminProducts(),
    getSizeCosts(),
  ]);
  return makeUnitCostResolver(products, sizeCosts);
});

/** Cuánto dejó cada producto, por tamaño. */
export interface ProductMargin {
  productName: string;
  grams: number;
  quantity: number;
  revenue: number;
  cost: number;
  margin: number;
  /** False si a alguna venta de este producto no se le pudo poner costo. */
  costKnown: boolean;
  /**
   * True si parte del costo salió del catálogo de hoy y no del que se congeló
   * al vender. Es una estimación razonable, pero no es el número histórico.
   */
  costEstimated: boolean;
}

export interface ExpenseTotal {
  category: string;
  amount: number;
  /**
   * Cuánto de ese total no se resta de la ganancia. Se guarda como monto y no
   * como etiqueta porque una misma categoría puede tener gastos de los dos
   * tipos: quien registra decide gasto por gasto.
   */
  notDeducted: number;
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
  /** Frascos vendidos sin costo cargado o completo: de esos no se sabe. */
  jarsWithoutCost: number;
  /** Frascos cuyo costo se estimó con el catálogo de hoy, no con el de la venta. */
  jarsEstimatedCost: number;
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
}

/**
 * Lo que se vendió en un rango, producto por producto. Sirve igual para un día
 * que para un año: sólo cambian las fechas con las que se pide.
 */
export interface ProductSales {
  from: string;
  to: string;
  orders: number;
  jars: number;
  jarsWithoutCost: number;
  jarsEstimatedCost: number;
  /** La suma de las líneas de venta, sin delivery. */
  revenue: number;
  cost: number;
  margin: number;
  byProduct: ProductMargin[];
}

interface ProductTotals {
  jars: number;
  jarsWithoutCost: number;
  jarsEstimatedCost: number;
  revenue: number;
  cogs: number;
  byProduct: ProductMargin[];
}

/**
 * Recorre las líneas de un puñado de ventas y las agrupa por producto y tamaño.
 *
 * El costo de una línea se busca en dos lugares, en este orden. Primero el que
 * se congeló al vender, que es el histórico y el que manda. Si esa venta se
 * registró antes de que hubiera un costo cargado quedó en `null`, y entonces
 * se cae al costo que el catálogo tiene hoy: es una estimación, pero decir
 * "$1.97 aproximado" es más útil que un guion, y las ventas viejas dejaban la
 * columna vacía para siempre aunque el costo ya se supiera. Los frascos que
 * pasan por ahí se cuentan en `jarsEstimatedCost` para poder avisarlo.
 *
 * Lo que sigue sin saberse de ninguna de las dos maneras se cuenta aparte en
 * vez de asumirle cero: un costo inventado infla la ganancia y nadie se entera.
 */
function accumulateProducts(
  sales: Sale[],
  resolveCost: UnitCostResolver,
): ProductTotals {
  const byProduct = new Map<string, ProductMargin>();
  let jars = 0;
  let jarsWithoutCost = 0;
  let jarsEstimatedCost = 0;
  let revenue = 0;
  let cogs = 0;

  for (const sale of sales) {
    for (const item of sale.items) {
      const quantity = item.quantity;
      const lineRevenue = Number(item.unitPriceUsd) * quantity;

      const frozen = item.unitCostUsd === null ? null : Number(item.unitCostUsd);
      const fallback =
        frozen === null
          ? resolveCost(item.productId, item.grams, item.productName)
          : null;
      const estimated = fallback !== null && fallback.known;
      const unitCost = frozen ?? (estimated ? fallback!.total : null);
      const cost = unitCost === null ? 0 : unitCost * quantity;

      jars += quantity;
      revenue += lineRevenue;
      if (unitCost === null) jarsWithoutCost += quantity;
      else cogs += cost;
      if (estimated) jarsEstimatedCost += quantity;

      const key = `${item.productName}·${item.grams}`;
      const entry = byProduct.get(key);
      if (entry) {
        entry.quantity += quantity;
        entry.revenue += lineRevenue;
        entry.cost += cost;
        entry.margin = entry.revenue - entry.cost;
        entry.costKnown &&= unitCost !== null;
        entry.costEstimated ||= estimated;
      } else {
        byProduct.set(key, {
          productName: item.productName,
          grams: item.grams,
          quantity,
          revenue: lineRevenue,
          cost,
          margin: lineRevenue - cost,
          costKnown: unitCost !== null,
          costEstimated: estimated,
        });
      }
    }
  }

  return {
    jars,
    jarsWithoutCost,
    jarsEstimatedCost,
    revenue,
    cogs,
    byProduct: [...byProduct.values()].sort((a, b) => b.quantity - a.quantity),
  };
}

/** Lo vendido entre dos fechas, ambas incluidas. */
export async function getProductSales(
  from: string,
  to: string,
): Promise<ProductSales> {
  const [sales, resolveCost] = await Promise.all([
    getSales({ from, to }),
    getUnitCostResolver(),
  ]);
  const totals = accumulateProducts(sales, resolveCost);

  return {
    from,
    to,
    orders: sales.length,
    jars: totals.jars,
    jarsWithoutCost: totals.jarsWithoutCost,
    jarsEstimatedCost: totals.jarsEstimatedCost,
    revenue: totals.revenue,
    cost: totals.cogs,
    margin: totals.revenue - totals.cogs,
    byProduct: totals.byProduct,
  };
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

  const [sales, expenses, replacementRate, resolveCost] = await Promise.all([
    getSales({ from, to }),
    getExpenses(from, to),
    getReplacementRate(month),
    getUnitCostResolver(),
  ]);

  let grossRevenue = 0;
  let deliveryCharged = 0;
  let deliveryCost = 0;
  let bsRevenueUsd = 0;
  let bsAmount = 0;

  // La cabecera de la venta y sus líneas responden cosas distintas: el monto
  // cobrado y el delivery viven arriba, lo que se despachó vive abajo.
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
  }

  const { jars, jarsWithoutCost, jarsEstimatedCost, cogs } =
    accumulateProducts(sales, resolveCost);

  const byCategory = new Map<string, ExpenseTotal>();
  let operatingExpenses = 0;
  let inventoryExpenses = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amountUsd);
    const deducts = expense.kind !== "inventario";
    if (deducts) operatingExpenses += amount;
    else inventoryExpenses += amount;

    const entry = byCategory.get(expense.category);
    if (entry) {
      entry.amount += amount;
      if (!deducts) entry.notDeducted += amount;
    } else {
      byCategory.set(expense.category, {
        category: expense.category,
        amount,
        notDeducted: deducts ? 0 : amount,
      });
    }
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
    jarsEstimatedCost,
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
  };
}
