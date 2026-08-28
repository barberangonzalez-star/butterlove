import "server-only";
import { getSales, type Sale } from "./sales-data";
import { getUnitCostResolver } from "./finance-data";
import type { UnitCostResolver } from "./unit-cost";
import { BOX_UNITS } from "./wholesale";
import { today } from "./period";
import type { SaleChannel } from "./config";

/**
 * El parte del canal mayorista.
 *
 * Responde tres preguntas que la lista de ventas no puede responder aunque
 * tenga los mismos datos: si el mayoreo suma o canibaliza el detal, quién
 * compra y hace cuánto que no vuelve, y qué sabores mueve el canal.
 *
 * La segunda es la que más pesa. Un mayorista que compró una vez y no volvió
 * es la señal más importante del negocio, y en un listado cronológico es
 * exactamente lo que no se ve: no aparece. Por eso la recompra se mide contra
 * todo el historial y no contra el período elegido.
 */

/** Lo que dejó un canal en el período. */
export interface ChannelTotals {
  channel: SaleChannel;
  orders: number;
  jars: number;
  /** Los mismos frascos contados en cajas, que es como se piensa el mayoreo. */
  boxes: number;
  /** Lo cobrado por mantequilla, sin el delivery que se le sumó al cliente. */
  revenue: number;
  cogs: number;
  margin: number;
  /** Margen sobre lo vendido. Null si no se vendió nada. */
  marginPct: number | null;
  /** Frascos sin costo conocido: de esos la ganancia no se sabe. */
  jarsWithoutCost: number;
}

/** Un mayorista y su recompra, medida contra todo el historial. */
export interface ResellerRow {
  customerId: number | null;
  name: string;
  phone: string | null;
  orders: number;
  jars: number;
  boxes: number;
  revenue: number;
  margin: number;
  /** El día de su última compra al mayor. */
  lastPurchase: string;
  /** Cuántos días lleva sin comprar. Es la columna que hay que mirar. */
  daysSince: number;
}

/** Qué se llevó el canal, sabor por sabor. */
export interface WholesaleFlavor {
  productName: string;
  grams: number;
  jars: number;
  boxes: number;
  revenue: number;
  margin: number;
  costKnown: boolean;
}

export interface WholesaleReport {
  byChannel: ChannelTotals[];
  /** Todos los mayoristas del historial, del que hace más que no vuelve al que menos. */
  resellers: ResellerRow[];
  flavors: WholesaleFlavor[];
}

function emptyTotals(channel: SaleChannel): ChannelTotals {
  return {
    channel,
    orders: 0,
    jars: 0,
    boxes: 0,
    revenue: 0,
    cogs: 0,
    margin: 0,
    marginPct: null,
    jarsWithoutCost: 0,
  };
}

/**
 * El costo de una línea: manda el que se congeló al vender, y si no hay se cae
 * al del catálogo de hoy. Es la misma regla que usa el reporte del mes, para
 * que los dos cuenten la misma ganancia sobre las mismas ventas.
 */
function lineCost(
  item: Sale["items"][number],
  resolve: UnitCostResolver,
): number | null {
  const frozen = item.unitCostUsd === null ? null : Number(item.unitCostUsd);
  if (frozen !== null) return frozen;
  const fallback = resolve(item.productId, item.grams, item.productName);
  return fallback.known ? fallback.total : null;
}

/** Días entre dos fechas de calendario "YYYY-MM-DD", en UTC. */
function daysBetween(from: string, to: string): number {
  const parse = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

function accumulate(
  totals: ChannelTotals,
  sale: Sale,
  resolve: UnitCostResolver,
) {
  totals.orders += 1;
  for (const item of sale.items) {
    const cost = lineCost(item, resolve);
    totals.jars += item.quantity;
    totals.revenue += Number(item.unitPriceUsd) * item.quantity;
    if (cost === null) totals.jarsWithoutCost += item.quantity;
    else totals.cogs += cost * item.quantity;
  }
}

function finish(totals: ChannelTotals): ChannelTotals {
  totals.boxes = totals.jars / BOX_UNITS;
  totals.margin = totals.revenue - totals.cogs;
  totals.marginPct =
    totals.revenue > 0 ? (totals.margin / totals.revenue) * 100 : null;
  return totals;
}

/**
 * El parte completo.
 *
 * El corte por canal y los sabores miran el período que se pidió; la recompra
 * mira todo el historial, porque un mayorista que no compró *en* el período es
 * justamente el que hay que ver.
 */
export async function getWholesaleReport(
  from: string,
  to: string,
): Promise<WholesaleReport> {
  const [periodSales, allWholesale, resolve] = await Promise.all([
    getSales({ from, to }),
    getSales({ channel: "mayor" }),
    getUnitCostResolver(),
  ]);

  // --- El período, partido por canal ---
  const detal = emptyTotals("detal");
  const mayor = emptyTotals("mayor");
  for (const sale of periodSales) {
    accumulate(sale.channel === "mayor" ? mayor : detal, sale, resolve);
  }

  // --- Qué sabores movió el mayoreo en el período ---
  const byFlavor = new Map<string, WholesaleFlavor>();
  for (const sale of periodSales) {
    if (sale.channel !== "mayor") continue;
    for (const item of sale.items) {
      const cost = lineCost(item, resolve);
      const revenue = Number(item.unitPriceUsd) * item.quantity;
      const margin = revenue - (cost ?? 0) * item.quantity;

      const key = `${item.productName}·${item.grams}`;
      const entry = byFlavor.get(key);
      if (entry) {
        entry.jars += item.quantity;
        entry.revenue += revenue;
        entry.margin += margin;
        entry.costKnown &&= cost !== null;
      } else {
        byFlavor.set(key, {
          productName: item.productName,
          grams: item.grams,
          jars: item.quantity,
          boxes: 0,
          revenue,
          margin,
          costKnown: cost !== null,
        });
      }
    }
  }
  const flavors = [...byFlavor.values()]
    .map((f) => ({ ...f, boxes: f.jars / BOX_UNITS }))
    .sort((a, b) => b.margin - a.margin);

  // --- La recompra, contra todo el historial ---
  const now = today();
  const byReseller = new Map<string, ResellerRow>();
  for (const sale of allWholesale) {
    // Se agrupa por ficha cuando la hay; si la venta se registró suelta, por
    // el nombre con que se anotó. Sin ninguno de los dos no hay a quién
    // seguirle la recompra, y la venta cuenta igual en el corte por canal.
    const key =
      sale.customerId !== null
        ? `id:${sale.customerId}`
        : sale.customerName
          ? `name:${sale.customerName.toLowerCase()}`
          : null;
    if (!key) continue;

    let revenue = 0;
    let margin = 0;
    let jars = 0;
    for (const item of sale.items) {
      const cost = lineCost(item, resolve);
      const lineRevenue = Number(item.unitPriceUsd) * item.quantity;
      jars += item.quantity;
      revenue += lineRevenue;
      margin += lineRevenue - (cost ?? 0) * item.quantity;
    }

    const entry = byReseller.get(key);
    if (entry) {
      entry.orders += 1;
      entry.jars += jars;
      entry.revenue += revenue;
      entry.margin += margin;
      // `getSales` viene de la más nueva a la más vieja, pero no se confía en
      // el orden para un dato que se muestra como "hace N días".
      if (sale.saleDate > entry.lastPurchase) entry.lastPurchase = sale.saleDate;
    } else {
      byReseller.set(key, {
        customerId: sale.customerId,
        name: sale.customerName ?? "Sin nombre",
        phone: sale.customerPhone,
        orders: 1,
        jars,
        boxes: 0,
        revenue,
        margin,
        lastPurchase: sale.saleDate,
        daysSince: 0,
      });
    }
  }

  const resellers = [...byReseller.values()]
    .map((r) => ({
      ...r,
      boxes: r.jars / BOX_UNITS,
      daysSince: daysBetween(r.lastPurchase, now),
    }))
    // El que hace más que no vuelve, primero: es a quien hay que llamar.
    .sort((a, b) => b.daysSince - a.daysSince);

  return {
    byChannel: [finish(detal), finish(mayor)],
    resellers,
    flavors,
  };
}
