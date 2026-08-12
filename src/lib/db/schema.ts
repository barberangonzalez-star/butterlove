import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  // "single" es un sabor suelto y "combo" un dúo de frascos. Cambia cómo se
  // titula el producto: "Mantequilla de Maní" contra "Dúo Merey + Maní", que
  // leído con el prefijo quedaría absurdo.
  kind: text("kind").notNull().default("single"),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  heroImage: text("hero_image").notNull(),
  bgClass: text("bg_class").notNull(),
  accentHex: text("accent_hex").notNull(),
  badges: jsonb("badges").$type<string[]>().notNull().default([]),
  // Si el producto se muestra en la vitrina pública. Los que se venden sólo
  // por encargo existen igual en el catálogo para poder registrarles ventas y
  // llevarles inventario, pero no aparecen en la tienda ni en el sitemap.
  inStore: boolean("in_store").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const productSizes = pgTable("product_sizes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  grams: integer("grams").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
});

export const supplyItems = pgTable("supply_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit").notNull().default("unidades"),
  lowStockThreshold: integer("low_stock_threshold"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  active: boolean("active").notNull().default(true),
  bundleQuantity: integer("bundle_quantity").notNull().default(1),
  // Qué combo es, en datos y no sólo en el texto de la descripción: sin esto
  // el formulario de ventas no puede ofrecer la promo con su precio hecho.
  // Van nullable para no romper promos viejas que nunca los tuvieron.
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  grams: integer("grams"),
  /** Precio total del combo, no por envase. */
  bundlePrice: numeric("bundle_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * La libreta de clientes: a quién se le vende, cómo se le escribe y dónde se
 * le entrega. Cada venta guarda igual el nombre y el teléfono con los que se
 * hizo, así que borrar un cliente de aquí no reescribe su historial: sólo lo
 * deja sin ficha.
 */
export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone"),
    /**
     * Sólo los dígitos del teléfono, normalizados. Es lo que reconoce al mismo
     * cliente aunque una vez se haya anotado 0414-2856600 y otra +58 414 285
     * 66 00.
     */
    phoneKey: text("phone_key"),
    email: text("email"),
    instagram: text("instagram"),
    state: text("state"),
    city: text("city"),
    /** Zona de DELIVERY_ZONES: es lo que decide cuánto cuesta llevarle el pedido. */
    deliveryZone: text("delivery_zone"),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("customers_phone_key_idx").on(table.phoneKey)],
);

/**
 * La cabecera de la venta: cliente, pago, entrega y monto total. Lo que se
 * llevó va en `saleItems`, una fila por producto y tamaño, porque un mismo
 * pedido puede traer maní, pistacho y merey a la vez.
 */
export const sales = pgTable(
  "sales",
  {
    id: serial("id").primaryKey(),
    saleDate: date("sale_date").notNull(),
    amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: text("payment_method"),
    /**
     * La ficha del cliente, si la venta se registró con una. Los tres campos
     * de abajo se siguen guardando aparte: son el nombre y el contacto con los
     * que se hizo *esta* venta, y no cambian porque el cliente después se mude
     * o se corrija su teléfono.
     */
    customerId: integer("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    deliveryMethod: text("delivery_method"),
    deliveryProvider: text("delivery_provider"),
    deliveryState: text("delivery_state"),
    deliveryFeeUsd: numeric("delivery_fee_usd", { precision: 10, scale: 2 }),
    bcvUsdRate: numeric("bcv_usd_rate", { precision: 12, scale: 4 }),
    bcvEurRate: numeric("bcv_eur_rate", { precision: 12, scale: 4 }),
    amountBs: numeric("amount_bs", { precision: 14, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("sales_customer_id_idx").on(table.customerId)],
);

/**
 * Cada producto y tamaño que entró en una venta. El nombre se copia aquí (no
 * sólo se referencia) para que una venta vieja siga diciendo qué se vendió
 * aunque después se borre el producto del catálogo.
 */
export const saleItems = pgTable(
  "sale_items",
  {
    id: serial("id").primaryKey(),
    saleId: integer("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull(),
    grams: integer("grams").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceUsd: numeric("unit_price_usd", {
      precision: 10,
      scale: 2,
    }).notNull(),
    // La promo vive en la línea y no en la venta: un mismo pedido puede llevar
    // el combo de maní y el de merey a la vez.
    promotionId: integer("promotion_id").references(() => promotions.id, {
      onDelete: "set null",
    }),
    promotionLabel: text("promotion_label"),
    // El orden en que se cargaron las líneas, para que la venta se relea igual
    // que se escribió en vez de quedar al criterio del planificador.
    position: integer("position").notNull().default(0),
  },
  (table) => [index("sale_items_sale_id_idx").on(table.saleId)],
);
