import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { productSizes, recipeItems, supplyItems } from "./db/schema";
import { supplyUnitCost } from "./costs";

export type RecipeItemRow = typeof recipeItems.$inferSelect;

/** Una línea de receta ya resuelta: el insumo con nombre, unidad y costo. */
export interface RecipeLine {
  id: number;
  supplyItemId: number;
  supplyName: string;
  unit: string;
  quantity: number;
  /** Costo de una unidad del insumo, o null si no se sabe cómo se compra. */
  unitCost: number | null;
  /** Lo que aporta esta línea al envase. Null arrastra el null del insumo. */
  lineCost: number | null;
}

/**
 * Lo que cuesta hacer un envase.
 *
 * Hay dos maneras de saberlo y las dos valen. La corta es escribir el costo del
 * frasco a mano (`extra`). La larga es desglosarlo en insumos (`lines`), que
 * tiene la ventaja de que subir el precio del maní actualiza solo todos los
 * productos que lo llevan. Se pueden combinar: el desglose cubre los materiales
 * y el número suelto agrega lo que no está en la lista, como la mano de obra.
 *
 * `known` dice si hay algún costo cargado. `complete` dice además que se puede
 * creer: una receta con un insumo sin precio da un costo más bajo que el real,
 * y el reporte prefiere avisar antes que mostrar una ganancia inventada.
 */
export interface SizeCost {
  productSizeId: number;
  materials: number;
  /** El costo escrito a mano, fuera de la receta. */
  extra: number;
  total: number;
  hasRecipe: boolean;
  known: boolean;
  complete: boolean;
  /** Insumos de la receta a los que les falta el precio de compra. */
  missing: string[];
  lines: RecipeLine[];
}

function emptyCost(productSizeId: number, extra: number): SizeCost {
  return {
    productSizeId,
    materials: 0,
    extra,
    total: extra,
    hasRecipe: false,
    known: extra > 0,
    complete: false,
    missing: [],
    lines: [],
  };
}

/**
 * El costo de todos los tamaños del catálogo, en tres consultas. Se calcula
 * entero en vez de guardarse: así cambiar el precio del maní actualiza solo
 * todos los productos que lo llevan, sin recalcular nada a mano.
 */
export async function getSizeCosts(): Promise<Map<number, SizeCost>> {
  const db = getDb();
  const [sizes, lines, supplies] = await Promise.all([
    db
      .select({
        id: productSizes.id,
        extraCostUsd: productSizes.extraCostUsd,
      })
      .from(productSizes),
    db.select().from(recipeItems).orderBy(asc(recipeItems.position), asc(recipeItems.id)),
    db.select().from(supplyItems),
  ]);

  const supplyById = new Map(supplies.map((s) => [s.id, s]));
  const costs = new Map<number, SizeCost>();
  for (const size of sizes) {
    costs.set(size.id, emptyCost(size.id, Number(size.extraCostUsd)));
  }

  for (const row of lines) {
    const cost = costs.get(row.productSizeId);
    const supply = supplyById.get(row.supplyItemId);
    if (!cost || !supply) continue;

    const quantity = Number(row.quantity);
    const unitCost = supplyUnitCost(supply);
    const lineCost = unitCost === null ? null : unitCost * quantity;

    cost.hasRecipe = true;
    cost.lines.push({
      id: row.id,
      supplyItemId: supply.id,
      supplyName: supply.name,
      unit: supply.unit,
      quantity,
      unitCost,
      lineCost,
    });

    if (lineCost === null) cost.missing.push(supply.name);
    else cost.materials += lineCost;
  }

  for (const cost of costs.values()) {
    cost.total = cost.materials + cost.extra;
    // Un costo escrito a mano vale tanto como uno desglosado: lo que invalida
    // el número no es que falte la receta, sino que falte un precio de la que sí
    // hay. Sin receta y sin costo a mano no se sabe nada, y eso se dice.
    cost.known = cost.hasRecipe || cost.extra > 0;
    cost.complete = cost.known && cost.missing.length === 0;
  }

  return costs;
}

export async function getSizeCost(
  productSizeId: number,
): Promise<SizeCost | undefined> {
  const costs = await getSizeCosts();
  return costs.get(productSizeId);
}

/**
 * Escribe a mano lo que cuesta un envase, sin tocar su receta. Es el camino
 * corto: se edita desde Finanzas, que es donde el número significa algo.
 */
export async function setSizeCost(productSizeId: number, costUsd: number) {
  const db = getDb();
  const safe = Number.isFinite(costUsd) ? Math.max(0, costUsd) : 0;
  await db
    .update(productSizes)
    .set({ extraCostUsd: safe.toFixed(2) })
    .where(eq(productSizes.id, productSizeId));
}

export interface RecipeLineInput {
  supplyItemId: number;
  quantity: number;
}

/**
 * Reemplaza la receta entera de un tamaño. Igual que las líneas de una venta:
 * es más simple que reconciliar altas y bajas, y una receta es corta.
 */
export async function saveRecipe(
  productSizeId: number,
  lines: RecipeLineInput[],
  extraCostUsd: number,
) {
  const db = getDb();
  const rows = lines
    // Una línea en cero no cuesta nada y sólo ensucia la receta.
    .filter((line) => line.supplyItemId > 0 && line.quantity > 0)
    .map((line, position) => ({
      productSizeId,
      supplyItemId: line.supplyItemId,
      quantity: line.quantity.toFixed(3),
      position,
    }));

  const setExtra = db
    .update(productSizes)
    .set({ extraCostUsd: extraCostUsd.toFixed(2) })
    .where(eq(productSizes.id, productSizeId));
  const clear = db
    .delete(recipeItems)
    .where(eq(recipeItems.productSizeId, productSizeId));

  // `batch` mantiene los pasos atómicos: nunca queda una receta a medio borrar.
  if (rows.length > 0) {
    await db.batch([setExtra, clear, db.insert(recipeItems).values(rows)]);
  } else {
    await db.batch([setExtra, clear]);
  }
}

/**
 * En qué recetas se usa un insumo. Se consulta antes de borrarlo: la base lo
 * impediría igual (ON DELETE RESTRICT), pero con esto el admin puede decir
 * cuáles son en vez de mostrar un error de Postgres.
 */
export async function getSupplyUsage(supplyItemId: number): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: recipeItems.id })
    .from(recipeItems)
    .where(eq(recipeItems.supplyItemId, supplyItemId));
  return rows.length;
}

/**
 * Lo que consume una venta, insumo por insumo: para un envase de maní 230g,
 * un frasco, una tapa, una etiqueta y 250 g de maní crudo.
 */
export async function getRecipeConsumption(
  productSizeIds: number[],
): Promise<Map<number, { supplyItemId: number; quantity: number }[]>> {
  const consumption = new Map<
    number,
    { supplyItemId: number; quantity: number }[]
  >();
  if (productSizeIds.length === 0) return consumption;

  const db = getDb();
  const rows = await db
    .select()
    .from(recipeItems)
    .where(inArray(recipeItems.productSizeId, productSizeIds));

  for (const row of rows) {
    const list = consumption.get(row.productSizeId) ?? [];
    list.push({ supplyItemId: row.supplyItemId, quantity: Number(row.quantity) });
    consumption.set(row.productSizeId, list);
  }
  return consumption;
}
