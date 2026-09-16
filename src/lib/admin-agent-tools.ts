import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { getRangeSummary, getSales } from "./sales-data";
import { getProductSales, getRangeReport } from "./finance-data";
import { getCustomers } from "./customers-data";
import { foldText } from "./customers";
import { getAdminProducts, type AdminProduct } from "./products-data";
import { getSupplyItems } from "./inventory-data";
import { getWholesaleCatalog } from "./wholesale-data";
import { getPendingOrders } from "./pending-orders-data";
import { getExpenses } from "./expenses-data";
import { getPromotions } from "./promotions-data";
import { getCasheaPurchases } from "./cashea-data";
import { countReviewsByStatus, getAdminReviews } from "./reviews-data";
import { isIsoDate, isPeriodKind, resolvePeriod, shiftPeriod, today } from "./period";
import { getBcvRate } from "./bcv";
import { PAGO_MOVIL, deliveryPriceForZone } from "./config";
import { buildQuote, fmtUsd, quoteAccount, type QuoteLine } from "./quote";
import { productTitle, sizeLabel } from "./products";

/**
 * Lo que el asistente del panel puede consultar.
 *
 * Todas leen; ninguna escribe. Es a propósito: un modelo que entiende mal una
 * frase devuelve una respuesta equivocada, que se nota y se corrige, en vez de
 * mover una venta o un inventario, que no se nota hasta que cuadran mal las
 * cuentas del mes.
 *
 * Cada una envuelve una función que ya usa alguna pantalla del panel, así que
 * las cifras del asistente son las mismas que las de esa pantalla. Lo que se
 * agrega acá es recortar y redondear: al modelo se le cobra por token, y una
 * fila cruda de la base trae veinte campos que no le sirven para contestar.
 */

/** Dos decimales, que es como se habla de dólares. */
const usd = (n: number) => Math.round(n * 100) / 100;

// ── Períodos ────────────────────────────────────────────────────────────────

/**
 * Las preguntas vienen en lenguaje natural ("este mes", "el trimestre pasado"),
 * así que el rango lo arma `resolvePeriod` —la misma función del dashboard— en
 * vez de pedirle al modelo que calcule fechas, que es justo lo que hace mal.
 */
const periodShape = {
  periodo: z
    .enum(["dia", "semana", "mes", "trimestre", "semestre", "anio"])
    .optional()
    .describe("Qué tan ancho es el rango. Por defecto el mes."),
  hace: z
    .number()
    .int()
    .optional()
    .describe(
      "Cuántos períodos hacia atrás. 0 es el actual (por defecto) y 1 el anterior: con periodo 'mes' y hace 1, el mes pasado.",
    ),
  ultimosDias: z
    .number()
    .int()
    .optional()
    .describe(
      "Los últimos N días contando hoy, sin cortar por calendario. Para 'las últimas dos semanas' o para juntar muestra al buscar patrones.",
    ),
  desde: z
    .string()
    .optional()
    .describe(
      "Fecha inicial YYYY-MM-DD. Sólo para un rango a medida; si viene, se ignoran periodo y hace.",
    ),
  hasta: z.string().optional().describe("Fecha final YYYY-MM-DD del rango a medida."),
};

interface PeriodInput {
  periodo?: "dia" | "semana" | "mes" | "trimestre" | "semestre" | "anio";
  hace?: number;
  ultimosDias?: number;
  desde?: string;
  hasta?: string;
}

/** Un día de calendario en UTC, que es como se guardan las fechas de venta. */
const parseDay = (iso: string) => new Date(`${iso}T00:00:00Z`);
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

function resolveRange(input: PeriodInput, fallbackDays?: number) {
  if (isIsoDate(input.desde)) {
    const period = resolvePeriod(
      "rango",
      input.desde,
      isIsoDate(input.hasta) ? input.hasta : input.desde,
    );
    return { from: period.from, to: period.to, label: period.label };
  }

  // "Los últimos N días" no es un período de calendario: es una ventana móvil
  // que termina hoy. Sirve para juntar muestra sin que el corte de mes la parta
  // en dos.
  const days =
    Number.isInteger(input.ultimosDias) && (input.ultimosDias as number) > 0
      ? (input.ultimosDias as number)
      : !input.periodo && fallbackDays
        ? fallbackDays
        : null;

  if (days) {
    const to = today();
    const from = isoDay(new Date(parseDay(to).getTime() - (days - 1) * 86_400_000));
    return { from, to, label: `últimos ${days} días` };
  }

  const kind = isPeriodKind(input.periodo) ? input.periodo : "mes";
  const current = resolvePeriod(kind, today());
  // `hace` cuenta hacia atrás, así que 1 es el período anterior.
  const back = Number.isInteger(input.hace) ? Math.abs(input.hace as number) : 0;
  const period = back === 0 ? current : shiftPeriod(current, -back);
  return { from: period.from, to: period.to, label: period.label };
}

// ── Ventas y dinero ─────────────────────────────────────────────────────────

const ventasDelPeriodo = tool({
  description:
    "Cuánto se vendió en un período y qué se vendió más, producto por producto, con su margen. Para cuánto vendí, cuál es el sabor más vendido, qué deja más ganancia.",
  inputSchema: z.object(periodShape),
  execute: async (input) => {
    const { from, to, label } = resolveRange(input);
    const [summary, products] = await Promise.all([
      getRangeSummary(from, to),
      getProductSales(from, to),
    ]);

    return {
      periodo: label,
      desde: from,
      hasta: to,
      totalUsd: usd(summary.totalUsd),
      totalBs: usd(summary.totalBs),
      pedidos: summary.count,
      frascos: products.jars,
      ticketPromedioUsd: summary.count > 0 ? usd(summary.totalUsd / summary.count) : 0,
      margenUsd: usd(products.margin),
      productos: products.byProduct.map((p) => ({
        producto: p.productName,
        gramos: p.grams,
        frascos: p.quantity,
        ventasUsd: usd(p.revenue),
        margenUsd: usd(p.margin),
        // Sin costo cargado el margen no significa nada, y decirlo evita que el
        // asistente presente un número a medias como si fuera firme.
        margenConfiable: p.costKnown,
      })),
    };
  },
});

const reporteFinanciero = tool({
  description:
    "El reporte completo de un período: ingresos, costo de lo vendido, gastos, ganancia neta y caja. Para cuánto gané, el reporte del mes, cómo me fue.",
  inputSchema: z.object(periodShape),
  execute: async (input) => {
    const { from, to, label } = resolveRange(input);
    const report = await getRangeReport(from, to);

    return {
      periodo: label,
      desde: from,
      hasta: to,
      pedidos: report.orders,
      frascos: report.jars,
      ingresoTotalUsd: usd(report.grossRevenue),
      ingresoPorProductoUsd: usd(report.productRevenue),
      deliveryCobradoUsd: usd(report.deliveryCharged),
      costoDeLoVendidoUsd: usd(report.cogs),
      margenBrutoUsd: usd(report.grossMargin),
      gastosOperativosUsd: usd(report.operatingExpenses),
      gastosDeInventarioUsd: usd(report.inventoryExpenses),
      gananciaNetaUsd: usd(report.netProfit),
      caja: {
        entroUsd: usd(report.cashIn),
        salioUsd: usd(report.cashOut),
        netoUsd: usd(report.cashFlow),
      },
      gastosPorCategoria: report.expensesByCategory.map((e) => ({
        categoria: e.category,
        montoUsd: usd(e.amount),
        // Parte de una categoría puede ser inventario, que no resta de la
        // ganancia aunque sí haya salido de la caja.
        noRestaDeLaGananciaUsd: usd(e.notDeducted),
      })),
      cobradoEnBs: {
        montoBs: usd(report.bsAmount),
        equivaleUsd: usd(report.bsRevenueUsd),
      },
      perdidaPorTasaUsd: report.rateLoss === null ? null : usd(report.rateLoss),
      frascosSinCostoCargado: report.jarsWithoutCost,
    };
  },
});

const listarVentas = tool({
  description:
    "Las ventas una por una en un período, con cliente y productos. Sólo para preguntas de detalle como qué vendí ayer o quién compró esta semana; para totales usa ventasDelPeriodo.",
  inputSchema: z.object({
    ...periodShape,
    canal: z
      .enum(["detal", "mayor"])
      .optional()
      .describe("Detal o mayor. Sin esto vienen los dos."),
  }),
  execute: async (input) => {
    const { from, to, label } = resolveRange(input);
    const sales = await getSales({ from, to, channel: input.canal });
    // Tope duro: un año de ventas no cabe en el contexto, y para contar totales
    // ya está ventasDelPeriodo.
    const shown = sales.slice(0, 50);

    return {
      periodo: label,
      total: sales.length,
      mostradas: shown.length,
      ventas: shown.map((sale) => ({
        numero: sale.saleNumber,
        fecha: sale.saleDate,
        cliente: sale.customerName,
        canal: sale.channel,
        montoUsd: usd(Number(sale.amountUsd)),
        pago: sale.paymentMethod,
        entrega: sale.deliveryMethod,
        productos: sale.items.map(
          (item) => `${item.quantity}x ${item.productName} ${item.grams}g`,
        ),
      })),
    };
  },
});

/** Lunes primero, que es como se piensa una semana de trabajo. */
const WEEKDAYS = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

/** Índice 0 = lunes. `getUTCDay()` da 0 el domingo, así que se corre uno. */
const weekdayIndex = (iso: string) => (parseDay(iso).getUTCDay() + 6) % 7;

/** Cuántos días tiene el rango, contando las dos puntas. */
const daysBetween = (from: string, to: string) =>
  Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000) + 1;

const patronPorDia = tool({
  description:
    "Qué días se vende más. Agrupa las ventas por día de la semana y devuelve además el día a día. Para qué día vendo más, cuál es mi mejor día, en qué días conviene publicar o hacer delivery. Por defecto mira los últimos 90 días, que es lo mínimo para que el patrón signifique algo.",
  inputSchema: z.object({
    ...periodShape,
    canal: z
      .enum(["detal", "mayor"])
      .optional()
      .describe(
        "Para un patrón de la tienda conviene 'detal': una venta al mayor es grande y esporádica, y sola tuerce el día en que cayó. Sin esto vienen los dos.",
      ),
  }),
  execute: async (input) => {
    // Sin período pedido, 90 días: con un mes solo hay cuatro lunes, y cuatro
    // datos no son un patrón.
    const { from, to, label } = resolveRange(input, 90);
    const sales = await getSales({ from, to, channel: input.canal });

    // Cuántas veces cae cada día de la semana en el rango. Sin esto, un mes con
    // cinco lunes haría ver el lunes mejor de lo que es.
    const occurrences = [0, 0, 0, 0, 0, 0, 0];
    const totalDays = daysBetween(from, to);
    for (let i = 0; i < totalDays; i += 1) {
      const day = isoDay(new Date(parseDay(from).getTime() + i * 86_400_000));
      occurrences[weekdayIndex(day)] += 1;
    }

    const byWeekday = WEEKDAYS.map((dia, i) => ({
      dia,
      vecesEnElRango: occurrences[i],
      pedidos: 0,
      totalUsd: 0,
    }));
    const byDate = new Map<string, { pedidos: number; totalUsd: number }>();

    for (const sale of sales) {
      const amount = Number(sale.amountUsd);
      const weekday = byWeekday[weekdayIndex(sale.saleDate)];
      weekday.pedidos += 1;
      weekday.totalUsd += amount;

      const day = byDate.get(sale.saleDate) ?? { pedidos: 0, totalUsd: 0 };
      day.pedidos += 1;
      day.totalUsd += amount;
      byDate.set(sale.saleDate, day);
    }

    // El promedio por ocurrencia es lo comparable entre días; el total crudo no,
    // porque cada día de la semana cae un número distinto de veces.
    const dias = byWeekday.map((row) => ({
      dia: row.dia,
      vecesEnElRango: row.vecesEnElRango,
      pedidos: row.pedidos,
      totalUsd: usd(row.totalUsd),
      promedioPorFechaUsd: row.vecesEnElRango > 0 ? usd(row.totalUsd / row.vecesEnElRango) : 0,
      pedidosPorFecha:
        row.vecesEnElRango > 0
          ? Math.round((row.pedidos / row.vecesEnElRango) * 10) / 10
          : 0,
    }));

    const ranked = [...dias].sort((a, b) => b.promedioPorFechaUsd - a.promedioPorFechaUsd);
    const semanas = Math.round((totalDays / 7) * 10) / 10;

    return {
      periodo: label,
      desde: from,
      hasta: to,
      canal: input.canal ?? "detal y mayor",
      // Con pocas semanas cada día tiene tres o cuatro datos y el orden lo
      // decide el ruido. El asistente tiene que decirlo en vez de presentarlo
      // como un hallazgo.
      semanasDeMuestra: semanas,
      muestraSuficiente: semanas >= 8,
      totalPedidos: sales.length,
      mejorDia: ranked[0]?.dia ?? null,
      peorDia: ranked.at(-1)?.dia ?? null,
      diasSinVentas: dias.filter((d) => d.pedidos === 0).map((d) => d.dia),
      porDiaDeLaSemana: dias,
      // El día a día sólo si cabe: un año son 365 renglones que no ayudan a ver
      // un patrón y sí llenan el contexto.
      diaADia:
        totalDays <= 62
          ? [...byDate.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([fecha, row]) => ({
                fecha,
                dia: WEEKDAYS[weekdayIndex(fecha)],
                pedidos: row.pedidos,
                totalUsd: usd(row.totalUsd),
              }))
          : null,
    };
  },
});

// ── Clientes ────────────────────────────────────────────────────────────────

const cliente = tool({
  description:
    "Busca un cliente por nombre y devuelve su ficha: teléfono, zona, cuánto ha comprado, qué se lleva y cuándo fue la última vez. Úsala antes de redactarle un mensaje.",
  inputSchema: z.object({
    nombre: z.string().describe("Nombre o parte del nombre del cliente."),
  }),
  execute: async ({ nombre }) => {
    const term = foldText(nombre ?? "").trim();
    if (!term) return { encontrados: 0, clientes: [] };

    const matches = (await getCustomers()).filter((row) =>
      foldText(row.name).includes(term),
    );

    return {
      encontrados: matches.length,
      // Con varias coincidencias el modelo tiene que preguntar cuál, no adivinar.
      clientes: matches.slice(0, 8).map((row) => ({
        id: row.id,
        nombre: row.name,
        telefono: row.phone,
        instagram: row.instagram,
        zona: row.deliveryZone,
        ciudad: row.city,
        estado: row.state,
        notas: row.notes,
        pedidos: row.stats.orders,
        frascos: row.stats.jars,
        totalCompradoUsd: usd(row.stats.totalUsd),
        primeraCompra: row.stats.firstPurchase,
        ultimaCompra: row.stats.lastPurchase,
        saborFavorito: row.stats.favoriteProduct,
        loQueCompra: row.stats.byProduct.slice(0, 5).map((p) => ({
          producto: p.productName,
          frascos: p.quantity,
        })),
      })),
    };
  },
});

const mejoresClientes = tool({
  description:
    "El ranking de clientes por cuánto han comprado. Para quién me compra más, quiénes son mis mejores clientes, a quién no le vendo hace rato.",
  inputSchema: z.object({
    cuantos: z
      .number()
      .int()
      .optional()
      .describe("Cuántos devolver. Por defecto 10, tope 30."),
    ordenarPor: z
      .enum(["total", "pedidos", "ultimaCompra"])
      .optional()
      .describe(
        "total es cuánto gastó (por defecto); ultimaCompra pone primero al que hace más tiempo que no compra.",
      ),
  }),
  execute: async ({ cuantos, ordenarPor }) => {
    const all = (await getCustomers()).filter((row) => row.stats.orders > 0);
    const limit = Math.min(Math.max(cuantos ?? 10, 1), 30);

    const sorted = [...all].sort((a, b) => {
      if (ordenarPor === "pedidos") return b.stats.orders - a.stats.orders;
      if (ordenarPor === "ultimaCompra") {
        return (a.stats.lastPurchase ?? "").localeCompare(b.stats.lastPurchase ?? "");
      }
      return b.stats.totalUsd - a.stats.totalUsd;
    });

    return {
      clientesConCompras: all.length,
      clientes: sorted.slice(0, limit).map((row) => ({
        id: row.id,
        nombre: row.name,
        telefono: row.phone,
        zona: row.deliveryZone,
        pedidos: row.stats.orders,
        totalCompradoUsd: usd(row.stats.totalUsd),
        ultimaCompra: row.stats.lastPurchase,
        saborFavorito: row.stats.favoriteProduct,
      })),
    };
  },
});

// ── Inventario y precios ────────────────────────────────────────────────────

const inventarioYPrecios = tool({
  description:
    "Qué hay en existencia: frascos por sabor y tamaño, materia prima, y los precios de detal y de mayor. Para de qué me queda poco, cuánto cuesta algo, qué tengo en inventario.",
  inputSchema: z.object({}),
  execute: async () => {
    const [products, supplies, wholesale] = await Promise.all([
      getAdminProducts(),
      getSupplyItems(),
      getWholesaleCatalog(),
    ]);

    const wholesaleByTitle = new Map(wholesale.map((item) => [item.title, item]));

    return {
      productos: products.map((product) => {
        const title = productTitle(product);
        const mayor = wholesaleByTitle.get(title);
        return {
          producto: title,
          enVitrina: product.inStore,
          tamanos: product.sizes.map((size) => ({
            gramos: size.grams,
            precioUsd: usd(size.price),
            frascosEnStock: size.stockQuantity,
          })),
          precioAlMayorUsd: mayor ? usd(mayor.unitPrice) : null,
          precioCajaAlMayorUsd: mayor ? usd(mayor.boxPrice) : null,
        };
      }),
      materiaPrima: supplies.map((item) => {
        const quantity = Number(item.quantity);
        const threshold =
          item.lowStockThreshold === null ? null : Number(item.lowStockThreshold);
        return {
          insumo: item.name,
          cantidad: quantity,
          unidad: item.unit,
          avisarPorDebajoDe: threshold,
          // Se compara acá para que el modelo no tenga que hacer la cuenta.
          bajo: threshold !== null && quantity <= threshold,
        };
      }),
    };
  },
});

// ── Cotizaciones ────────────────────────────────────────────────────────────

/**
 * El sabor que quiso decir quien cotiza.
 *
 * El nombre llega como se habla —"maní", "dúo maní", "mantequilla de
 * pistacho"—, así que no alcanza con buscar el primero que contenga la
 * palabra: "dúo maní" contiene "maní", y a la primera coincidencia le tocaría
 * el frasco suelto en vez del dúo. Se puntúan todos y gana el más específico.
 */
function matchProduct(name: string | undefined, catalog: AdminProduct[]) {
  const term = foldText(name ?? "").trim();
  if (!term) return undefined;

  const scored = catalog
    .map((row) => {
      const title = foldText(productTitle(row));
      const plain = foldText(row.name);

      // Un nombre exacto gana siempre. Después, que el título contenga lo
      // pedido. Y de último que lo pedido contenga el nombre del producto, que
      // es la más floja: ahí gana el nombre más largo, o sea el más específico.
      const score =
        title === term || plain === term
          ? 100
          : title.includes(term)
            ? 60 + term.length
            : term.includes(plain)
              ? 20 + plain.length
              : plain.includes(term)
                ? 10 + term.length
                : 0;

      return { row, score, length: plain.length };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.length - a.length);

  return scored[0]?.row;
}

const armarCotizacion = tool({
  description:
    "Arma una cotización lista para pegarle al cliente: líneas con precios, delivery, total en dólares y bolívares, y los datos de Pago Móvil. Los precios los pone el catálogo, no hay que dárselos. Para cotízame tantos de tal sabor, cuánto le sale a alguien tal pedido.",
  inputSchema: z.object({
    productos: z
      .array(
        z.object({
          producto: z
            .string()
            .describe("Nombre del sabor como lo dijo la persona: maní, pistacho, dúo maní."),
          gramos: z
            .number()
            .int()
            .optional()
            .describe("230 o 350. Sin esto se usa el tamaño más chico que exista."),
          cantidad: z.number().int().describe("Cuántos frascos."),
          precioUnitario: z
            .number()
            .optional()
            .describe(
              "Sólo si se acordó un precio distinto al de catálogo. Si no viene, manda el catálogo.",
            ),
        }),
      )
      .describe("Lo que lleva el pedido."),
    entrega: z
      .string()
      .optional()
      .describe(
        "La zona de Caracas ('Altamira'), o 'pickup' para retiro en tienda, o 'nacional' para encomienda. Sin esto la cotización no menciona entrega.",
      ),
    costoEntrega: z
      .number()
      .optional()
      .describe("Para cobrar un monto distinto al de la lista de zonas."),
    cuenta: z
      .string()
      .optional()
      .describe("Banco de Pago Móvil a mostrar. Por defecto el que cobra la tienda."),
  }),
  execute: async ({ productos, entrega, costoEntrega, cuenta }) => {
    const [catalog, bcv] = await Promise.all([getAdminProducts(), getBcvRate()]);

    const lines: QuoteLine[] = [];
    const noEncontrados: string[] = [];
    const avisos: string[] = [];

    for (const item of productos ?? []) {
      const product = matchProduct(item.producto, catalog);

      if (!product) {
        noEncontrados.push(item.producto);
        continue;
      }

      const size =
        (item.gramos ? product.sizes.find((s) => s.grams === item.gramos) : undefined) ??
        product.sizes[0];
      if (!size) {
        noEncontrados.push(item.producto);
        continue;
      }
      if (item.gramos && size.grams !== item.gramos) {
        avisos.push(
          `${productTitle(product)} no viene en ${item.gramos}g; se cotizó en ${size.grams}g.`,
        );
      }

      const quantity = Math.max(1, Math.round(item.cantidad ?? 1));
      const unitPrice =
        typeof item.precioUnitario === "number" && item.precioUnitario >= 0
          ? item.precioUnitario
          : size.price;
      if (unitPrice !== size.price) {
        avisos.push(
          `${productTitle(product)} ${sizeLabel(product, size)} va a ${fmtUsd(unitPrice)} en vez de ${fmtUsd(size.price)} de catálogo.`,
        );
      }

      lines.push({
        label: productTitle(product),
        size: sizeLabel(product, size),
        quantity,
        unitPrice,
      });
    }

    if (lines.length === 0) {
      return {
        cotizacion: null,
        noEncontrados,
        error:
          "No reconocí ninguno de esos productos. Pregunta cuál es, o consulta el catálogo con inventarioYPrecios.",
      };
    }

    const standalone = entrega === "pickup" || entrega === "nacional";
    const delivery = entrega
      ? {
          label: standalone
            ? entrega === "pickup"
              ? "Retiro en tienda"
              : "Envío nacional"
            : entrega,
          // La lista de precios sólo cubre unas zonas; en las demás el monto va
          // "a coordinar" en vez de inventado.
          price:
            typeof costoEntrega === "number"
              ? costoEntrega
              : entrega === "pickup"
                ? 0
                : entrega === "nacional"
                  ? null
                  : deliveryPriceForZone(entrega),
          standalone,
        }
      : null;

    if (delivery && !standalone && delivery.price === null) {
      avisos.push(
        `No hay tarifa publicada para ${entrega}, así que el delivery quedó "a coordinar".`,
      );
    }

    const quote = buildQuote({
      lines,
      delivery,
      bcvRate: bcv?.rate ?? null,
      account: quoteAccount(cuenta ?? PAGO_MOVIL.bank),
    });

    return {
      // El texto se manda tal cual, sin retocar: es el mismo formato que saca
      // el cotizador a clics.
      cotizacion: quote.text,
      subtotalUsd: usd(quote.subtotal),
      deliveryUsd: quote.deliveryPrice === null ? null : usd(quote.deliveryPrice),
      totalUsd: usd(quote.total),
      tasaBcv: bcv?.rate ?? null,
      noEncontrados,
      avisos,
    };
  },
});

// ── Lo que está esperando ───────────────────────────────────────────────────

const pendientes = tool({
  description:
    "Lo que espera atención ahora mismo: pedidos de la tienda sin confirmar, reseñas por aprobar y cuotas de Cashea por pagar. Para qué tengo pendiente, hay pedidos nuevos.",
  inputSchema: z.object({}),
  execute: async () => {
    const [orders, reviewCounts, purchases] = await Promise.all([
      getPendingOrders(),
      countReviewsByStatus(),
      getCasheaPurchases(),
    ]);

    const hoy = today();
    // Una cuota sin gasto asociado es una que todavía no se ha pagado.
    const cuotas = purchases
      .flatMap((purchase) =>
        purchase.installments
          .filter((row) => row.expenseId === null)
          .map((row) => ({
            compra: purchase.description,
            cuota: row.installmentNumber,
            vence: row.dueDate,
            montoUsd: usd(Number(row.amountUsd)),
            vencida: row.dueDate < hoy,
          })),
      )
      .sort((a, b) => a.vence.localeCompare(b.vence));

    return {
      pedidosSinConfirmar: orders.map((order) => ({
        fecha: order.createdAt.toISOString().slice(0, 10),
        cliente: order.customerName,
        telefono: order.customerPhone,
        montoUsd: usd(Number(order.amountUsd)),
        pago: order.paymentMethod,
        diceQuePago: order.paymentClaimed,
        entrega: order.deliveryMethod,
        zona: order.deliveryZone,
      })),
      resenasPorAprobar: reviewCounts.pendiente,
      cuotasCasheaPorPagar: cuotas.slice(0, 15),
    };
  },
});

const gastosDelPeriodo = tool({
  description:
    "En qué se fue la plata en un período, gasto por gasto. Para en qué gasté, cuánto llevo en anuncios.",
  inputSchema: z.object(periodShape),
  execute: async (input) => {
    const { from, to, label } = resolveRange(input);
    const expenses = await getExpenses(from, to);

    return {
      periodo: label,
      totalUsd: usd(expenses.reduce((sum, row) => sum + Number(row.amountUsd), 0)),
      gastos: expenses.slice(0, 60).map((row) => ({
        fecha: row.expenseDate,
        categoria: row.category,
        descripcion: row.description,
        montoUsd: usd(Number(row.amountUsd)),
        // "operativo" resta de la ganancia del mes; "inventario" no, porque ese
        // costo se cuenta frasco a frasco al vender.
        restaDeLaGanancia: row.kind === "operativo",
      })),
    };
  },
});

const opinionesDeClientes = tool({
  description:
    "Lo que opinan los clientes: cuántas reseñas hay en cada estado y qué dicen. Para qué opinan de un sabor, tengo reseñas por aprobar.",
  inputSchema: z.object({
    estado: z
      .enum(["pendiente", "publicada", "oculta"])
      .optional()
      .describe("Por defecto las publicadas."),
    buscar: z
      .string()
      .optional()
      .describe("Filtra por el nombre de quien opinó o del cliente."),
  }),
  execute: async ({ estado, buscar }) => {
    const [counts, reviews] = await Promise.all([
      countReviewsByStatus(),
      getAdminReviews(estado ?? "publicada", buscar),
    ]);

    return {
      conteo: counts,
      resenas: reviews.slice(0, 25).map((review) => ({
        producto: review.productTitle,
        estrellas: review.rating,
        comentario: review.comment,
        firma: review.authorName,
        fecha: review.createdLabel,
        // "venta" es compra verificada; "general" salió del enlace abierto.
        origen: review.source,
        respondida: review.reply !== null,
      })),
    };
  },
});

const promocionesActivas = tool({
  description: "Las promociones cargadas y si están activas.",
  inputSchema: z.object({}),
  execute: async () => {
    const promotions = await getPromotions();
    return {
      promociones: promotions.map((promo) => ({
        titulo: promo.title,
        descripcion: promo.description,
        activa: promo.active,
        cantidadDelCombo: promo.bundleQuantity,
        precioDelComboUsd:
          promo.bundlePrice === null ? null : usd(Number(promo.bundlePrice)),
      })),
    };
  },
});

export const adminAgentTools = {
  ventasDelPeriodo,
  reporteFinanciero,
  listarVentas,
  patronPorDia,
  armarCotizacion,
  cliente,
  mejoresClientes,
  inventarioYPrecios,
  pendientes,
  gastosDelPeriodo,
  opinionesDeClientes,
  promocionesActivas,
};
