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
});

export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  saleDate: date("sale_date").notNull(),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  grams: integer("grams").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceUsd: numeric("unit_price_usd", { precision: 10, scale: 2 }).notNull(),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  promotionId: integer("promotion_id").references(() => promotions.id, {
    onDelete: "set null",
  }),
  promotionLabel: text("promotion_label"),
  paymentMethod: text("payment_method"),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  bcvUsdRate: numeric("bcv_usd_rate", { precision: 12, scale: 4 }),
  bcvEurRate: numeric("bcv_eur_rate", { precision: 12, scale: 4 }),
  amountBs: numeric("amount_bs", { precision: 14, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
