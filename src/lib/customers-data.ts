import "server-only";
import { and, asc, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { customers, sales, saleItems } from "./db/schema";
import { stateForZone } from "./config";
import {
  normalizeInstagram,
  phoneKey,
  type CustomerChoice,
} from "./customers";

export type Customer = typeof customers.$inferSelect;

/** Cuánto compró un cliente y qué. Sale de sus ventas, no se guarda aparte. */
export interface CustomerStats {
  orders: number;
  /** Frascos, sumando todas las líneas de todas sus ventas. */
  jars: number;
  totalUsd: number;
  firstPurchase: string | null;
  lastPurchase: string | null;
  /** Lo que más se lleva, medido en frascos. */
  favoriteProduct: string | null;
  /**
   * Todo lo que compró, de más a menos frascos. El monto es el de las líneas
   * (cantidad × precio), así que puede no coincidir con `totalUsd`, que es lo
   * que se cobró de verdad después de descuentos y delivery.
   */
  byProduct: { productName: string; quantity: number; totalUsd: number }[];
}

export interface CustomerWithStats extends Customer {
  stats: CustomerStats;
}

const EMPTY_STATS: CustomerStats = {
  orders: 0,
  jars: 0,
  totalUsd: 0,
  firstPurchase: null,
  lastPurchase: null,
  favoriteProduct: null,
  byProduct: [],
};

/**
 * Las estadísticas de todos los clientes (o de uno solo) en dos consultas: una
 * para los totales de la venta y otra para el detalle por producto. Con una
 * consulta por cliente, la lista haría una por fila.
 */
async function loadStats(customerId?: number): Promise<Map<number, CustomerStats>> {
  const db = getDb();
  const scope = customerId
    ? and(isNotNull(sales.customerId), eq(sales.customerId, customerId))
    : isNotNull(sales.customerId);

  const [totals, byProduct] = await Promise.all([
    db
      .select({
        customerId: sales.customerId,
        orders: sql<number>`count(*)::int`,
        totalUsd: sql<string>`coalesce(sum(${sales.amountUsd}), 0)`,
        firstPurchase: sql<string>`min(${sales.saleDate})`,
        lastPurchase: sql<string>`max(${sales.saleDate})`,
      })
      .from(sales)
      .where(scope)
      .groupBy(sales.customerId),
    db
      .select({
        customerId: sales.customerId,
        productName: saleItems.productName,
        quantity: sql<number>`sum(${saleItems.quantity})::int`,
        totalUsd: sql<string>`sum(${saleItems.quantity} * ${saleItems.unitPriceUsd})`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(scope)
      // Empatados en frascos, gana el que dejó más dinero; y si también empatan,
      // el orden alfabético evita que el "favorito" cambie entre recargas.
      .groupBy(sales.customerId, saleItems.productName)
      .orderBy(
        desc(sql`sum(${saleItems.quantity})`),
        desc(sql`sum(${saleItems.quantity} * ${saleItems.unitPriceUsd})`),
        asc(saleItems.productName),
      ),
  ]);

  const stats = new Map<number, CustomerStats>();
  for (const row of totals) {
    if (row.customerId === null) continue;
    stats.set(row.customerId, {
      ...EMPTY_STATS,
      orders: Number(row.orders),
      totalUsd: Number(row.totalUsd),
      firstPurchase: row.firstPurchase ?? null,
      lastPurchase: row.lastPurchase ?? null,
      byProduct: [],
    });
  }

  for (const row of byProduct) {
    if (row.customerId === null) continue;
    const entry = stats.get(row.customerId);
    if (!entry) continue;
    entry.jars += Number(row.quantity);
    entry.byProduct.push({
      productName: row.productName,
      quantity: Number(row.quantity),
      totalUsd: Number(row.totalUsd),
    });
    // Las filas vienen ordenadas, así que el favorito es la primera de cada uno.
    entry.favoriteProduct ??= row.productName;
  }

  return stats;
}

export async function getCustomers(): Promise<CustomerWithStats[]> {
  const db = getDb();
  const [rows, stats] = await Promise.all([
    db.select().from(customers).orderBy(asc(customers.name)),
    loadStats(),
  ]);
  return rows.map((row) => ({
    ...row,
    stats: stats.get(row.id) ?? EMPTY_STATS,
  }));
}

/** El recorte que viaja al buscador del formulario de ventas. */
export function toCustomerChoice(customer: CustomerWithStats): CustomerChoice {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    instagram: customer.instagram,
    city: customer.city,
    state: customer.state,
    deliveryZone: customer.deliveryZone,
    address: customer.address,
    isReseller: customer.isReseller,
    orders: customer.stats.orders,
    totalUsd: customer.stats.totalUsd,
    favoriteProduct: customer.stats.favoriteProduct,
    lastPurchase: customer.stats.lastPurchase,
  };
}

export async function getCustomer(id: number): Promise<Customer | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  return row;
}

export async function getCustomerWithStats(
  id: number,
): Promise<CustomerWithStats | undefined> {
  const [row, stats] = await Promise.all([getCustomer(id), loadStats(id)]);
  if (!row) return undefined;
  return { ...row, stats: stats.get(id) ?? EMPTY_STATS };
}

export interface CustomerInput {
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  state: string | null;
  city: string | null;
  deliveryZone: string | null;
  address: string | null;
  notes: string | null;
  /** Si compra para revender: hace que la venta arranque en el canal "mayor". */
  isReseller: boolean;
}

function toRow(input: CustomerInput) {
  return {
    name: input.name,
    phone: input.phone,
    // Se guarda derivado y no calculado al vuelo para poder indexarlo: es la
    // columna con la que se busca al cliente al registrar una venta.
    phoneKey: phoneKey(input.phone),
    email: input.email,
    instagram: normalizeInstagram(input.instagram),
    state: input.state,
    city: input.city,
    deliveryZone: input.deliveryZone,
    address: input.address,
    notes: input.notes,
    isReseller: input.isReseller,
  };
}

export async function createCustomer(input: CustomerInput): Promise<number> {
  const db = getDb();
  const [row] = await db
    .insert(customers)
    .values(toRow(input))
    .returning({ id: customers.id });
  return row.id;
}

export async function updateCustomer(id: number, input: CustomerInput) {
  const db = getDb();
  await db
    .update(customers)
    .set({ ...toRow(input), updatedAt: new Date() })
    .where(eq(customers.id, id));
}

/** Las ventas no se van con él: su `customer_id` queda en null (ON DELETE SET NULL). */
export async function deleteCustomer(id: number) {
  const db = getDb();
  await db.delete(customers).where(eq(customers.id, id));
}

/**
 * Busca la ficha de alguien por teléfono y, si no hay, por nombre exacto. El
 * teléfono manda: es lo único que identifica de verdad, mientras que dos
 * clientes pueden llamarse igual.
 */
export async function findCustomer(
  name: string | null,
  phone: string | null,
): Promise<Customer | undefined> {
  const db = getDb();
  const key = phoneKey(phone);
  const trimmedName = name?.trim() ?? "";

  const conditions = [];
  if (key) conditions.push(eq(customers.phoneKey, key));
  if (trimmedName) {
    conditions.push(sql`lower(${customers.name}) = lower(${trimmedName})`);
  }
  if (conditions.length === 0) return undefined;

  const rows = await db
    .select()
    .from(customers)
    .where(or(...conditions))
    .limit(2);

  if (rows.length <= 1) return rows[0];
  // Con teléfono y nombre buscados a la vez pueden volver dos fichas distintas:
  // gana la del teléfono.
  return rows.find((row) => key !== null && row.phoneKey === key) ?? rows[0];
}

/**
 * Guarda en qué zona de Caracas queda el cliente. Se llama al registrarle una
 * venta, que es cuando de verdad se sabe dónde vive.
 *
 * A diferencia de `ensureCustomer`, aquí sí se pisa lo que hubiera: elegir una
 * zona distinta mientras se cobra es corregirla a propósito. El estado y la
 * ciudad se rellenan sólo si estaban vacíos.
 */
export async function setCustomerZone(id: number, zone: string) {
  const existing = await getCustomer(id);
  if (!existing || existing.deliveryZone === zone) return;

  const patch: Partial<typeof customers.$inferInsert> = {
    deliveryZone: zone,
    updatedAt: new Date(),
  };
  const impliedState = stateForZone(zone);
  if (impliedState) {
    // El estado se corrige si estaba vacío o si es el que implicaba la zona
    // anterior: eso lo puso el sistema, no una persona. Un estado escrito a
    // mano que no cuadra con la zona se respeta.
    const previousImplied = stateForZone(existing.deliveryZone);
    if (!existing.state || existing.state === previousImplied) {
      patch.state = impliedState;
    }
    if (!existing.city) patch.city = "Caracas";
  }

  const db = getDb();
  await db.update(customers).set(patch).where(eq(customers.id, id));
}

/**
 * Devuelve el id de la ficha del cliente de una venta, creándola si es la
 * primera vez que compra. Los datos que la ficha ya tiene no se pisan: sólo se
 * rellenan los que estaban vacíos, para que registrar una venta rápido y sin
 * correo no borre el correo que se anotó antes.
 */
export async function ensureCustomer(contact: {
  name: string | null;
  phone: string | null;
  email: string | null;
  state: string | null;
}): Promise<number | null> {
  const name = contact.name?.trim() || null;
  const phone = contact.phone?.trim() || null;
  if (!name && !phoneKey(phone)) return null;

  const existing = await findCustomer(name, phone);
  if (!existing) {
    return createCustomer({
      name: name ?? phone ?? "Cliente sin nombre",
      phone,
      email: contact.email,
      instagram: null,
      state: contact.state,
      city: null,
      deliveryZone: null,
      address: null,
      notes: null,
      // Una ficha creada al vuelo mientras se cobra nace como cliente normal.
      // Que la venta sea al mayor no lo convierte en mayorista: eso se marca a
      // mano, y es lo que después hace que el formulario proponga el canal.
      isReseller: false,
    });
  }

  const patch: Partial<typeof customers.$inferInsert> = {};
  if (!existing.phone && phone) {
    patch.phone = phone;
    patch.phoneKey = phoneKey(phone);
  }
  if (!existing.email && contact.email) patch.email = contact.email;
  if (!existing.state && contact.state) patch.state = contact.state;

  if (Object.keys(patch).length > 0) {
    const db = getDb();
    await db
      .update(customers)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(customers.id, existing.id));
  }

  return existing.id;
}
