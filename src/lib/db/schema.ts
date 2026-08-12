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
  /**
   * Lo que cuesta hacer este envase y no sale de la receta: mano de obra, gas,
   * merma. Los insumos van en `recipeItems`, uno por línea.
   */
  extraCostUsd: numeric("extra_cost_usd", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
});

export const supplyItems = pgTable("supply_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit").notNull().default("unidades"),
  lowStockThreshold: integer("low_stock_threshold"),
  /**
   * Cómo se compra el insumo, para sacar el costo por unidad: "pagué
   * `purchasePriceUsd` por `purchaseQuantity` unidades". Se guarda así y no ya
   * dividido porque es como se compra de verdad, y actualizar el precio
   * cuando sube el maní es cambiar un número.
   */
  purchasePriceUsd: numeric("purchase_price_usd", { precision: 10, scale: 2 }),
  purchaseQuantity: integer("purchase_quantity"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * La receta de un envase: qué insumos lleva y cuántos. Un frasco de maní 230g
 * son 1 frasco, 1 tapa, 1 etiqueta, 1 precinto y ~250 g de maní crudo — la
 * merma del tostado se mete subiendo esa cantidad.
 *
 * Los combos tienen su propia receta, con las dos etiquetas y las dos
 * porciones, así que no hace falta que una receta apunte a otra.
 */
export const recipeItems = pgTable(
  "recipe_items",
  {
    id: serial("id").primaryKey(),
    productSizeId: integer("product_size_id")
      .notNull()
      .references(() => productSizes.id, { onDelete: "cascade" }),
    // Sin `cascade`: borrar un insumo que está en recetas cambiaría en silencio
    // el costo de los productos. La acción avisa en vez de dejarlo pasar.
    supplyItemId: integer("supply_item_id")
      .notNull()
      .references(() => supplyItems.id, { onDelete: "restrict" }),
    /** En la unidad del insumo: 250 si son gramos, 1 si son unidades. */
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("recipe_items_size_idx").on(table.productSizeId)],
);

/**
 * Lo que sale del bolsillo y no es materia prima: anuncios, sueldos,
 * comisiones. `kind` decide si el gasto se resta de la ganancia o no: comprar
 * maní no se resta aquí porque ya se cuenta frasco a frasco al venderlo, y
 * restarlo dos veces haría ver el negocio peor de lo que está. Se copia de la
 * categoría al guardar, para que recategorizar después no reescriba el pasado.
 */
export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    expenseDate: date("expense_date").notNull(),
    category: text("category").notNull(),
    kind: text("kind").notNull().default("operativo"),
    amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("expenses_date_idx").on(table.expenseDate)],
);

/**
 * A qué tasa se consiguen los dólares de verdad, por mes. Cobrar en bolívares
 * a tasa BCV y reponer comprando dólares más caros es una pérdida que no
 * aparece en ninguna venta; con esta tasa el reporte la puede medir.
 */
export const replacementRates = pgTable("replacement_rates", {
  /** "YYYY-MM". */
  month: text("month").primaryKey(),
  rate: numeric("rate", { precision: 12, scale: 4 }).notNull(),
  notes: text("notes"),
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
    /**
     * En qué zona de Caracas vive, de `CARACAS_ZONES`. Es ubicación, no
     * tarifa: el delivery se cobra por `DELIVERY_ZONES`, que agrupa varias de
     * estas zonas en una sola área de precio. La columna conserva el nombre
     * `delivery_zone` con el que nació.
     */
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
    /**
     * Lo que costó llevar el pedido: gasolina, el repartidor, lo que cobró
     * Ridery. Va aparte de `deliveryFeeUsd`, que es lo que se le cobró al
     * cliente; la diferencia entre los dos es lo que el delivery deja o quita.
     */
    deliveryCostUsd: numeric("delivery_cost_usd", { precision: 10, scale: 2 }),
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
    /**
     * Lo que costaba hacer ese envase el día de la venta, congelado igual que
     * el nombre del producto: si mañana sube el maní, la ganancia de la venta
     * de ayer no cambia sola. Null cuando el producto no tenía receta cargada.
     */
    unitCostUsd: numeric("unit_cost_usd", { precision: 12, scale: 4 }),
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
