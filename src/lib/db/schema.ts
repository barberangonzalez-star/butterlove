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
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  heroImage: text("hero_image").notNull(),
  bgClass: text("bg_class").notNull(),
  accentHex: text("accent_hex").notNull(),
  badges: jsonb("badges").$type<string[]>().notNull().default([]),
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
 * La cabecera de la venta: cliente, pago, entrega y monto total. Lo que se
 * llevó va en `saleItems`, una fila por producto y tamaño, porque un mismo
 * pedido puede traer maní, pistacho y merey a la vez.
 */
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  saleDate: date("sale_date").notNull(),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
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
});

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
