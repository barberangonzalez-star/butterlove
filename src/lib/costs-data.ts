import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { costItems, productSizes, recipeItems } from "./db/schema";

/**
 * Una línea del desglose: cómo se llama y cuánto le pone al costo de UN frasco.
 * No sabe de unidades ni de precios de compra — el número ya viene hecho.
 */
export interface CostLine {
  id: number;
  name: string;
  amount: number;
}

/**
 * Lo que cuesta hacer un envase.
 *
 * Hay dos maneras de escribirlo y las dos valen. La corta es un solo número
 * (`extra`), que se edita en la tabla misma. La larga es desglosarlo en líneas
 * (`lines`): "frasco $0.25", "etiqueta $0.12", "maní $0.90". Se suman, así que
 * se pueden combinar: el desglose cubre lo que está listado y el número suelto
 * agrega el resto.
 *
 * `known` dice si hay algún costo cargado. Sin eso, la ganancia se muestra
 * vacía en vez de inventada.
 */
export interface SizeCost {
  productSizeId: number;
  /** Lo que suman las líneas del desglose. */
  breakdown: number;
  /** El costo escrito de un tirón, fuera del desglose. */
  extra: number;
  total: number;
  hasBreakdown: boolean;
  known: boolean;
  lines: CostLine[];
}

function emptyCost(productSizeId: number, extra: number): SizeCost {
  return {
    productSizeId,
    breakdown: 0,
    extra,
    total: extra,
    hasBreakdown: false,
    known: extra > 0,
    lines: [],
  };
}

/**
 * El costo de todos los tamaños del catálogo, en dos consultas.
 *
 * Antes esto salía de las recetas, resolviendo cada insumo contra su precio de
 * compra. Se cambió porque llenar catorce recetas con unidades y rendimientos
 * era demasiado trabajo para lo que se quería saber, que es cuánto deja un
 * frasco. Las recetas siguen existiendo, pero para descontar inventario.
 */
export async function getSizeCosts(): Promise<Map<number, SizeCost>> {
  const db = getDb();
  const [sizes, lines] = await Promise.all([
    db
      .select({
        id: productSizes.id,
        extraCostUsd: productSizes.extraCostUsd,
      })
      .from(productSizes),
    db
      .select()
      .from(costItems)
      .orderBy(asc(costItems.position), asc(costItems.id)),
  ]);

  const costs = new Map<number, SizeCost>();
  for (const size of sizes) {
    costs.set(size.id, emptyCost(size.id, Number(size.extraCostUsd)));
  }

  for (const row of lines) {
    const cost = costs.get(row.productSizeId);
    if (!cost) continue;

    const amount = Number(row.amountUsd);
    cost.hasBreakdown = true;
    cost.lines.push({ id: row.id, name: row.name, amount });
    cost.breakdown += amount;
  }

  for (const cost of costs.values()) {
    cost.total = cost.breakdown + cost.extra;
    cost.known = cost.hasBreakdown || cost.extra > 0;
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
 * Escribe de un tirón lo que cuesta un envase, sin tocar su desglose. Es el
 * camino corto: se edita desde Finanzas, que es donde el número significa algo.
 */
export async function setSizeCost(productSizeId: number, costUsd: number) {
  const db = getDb();
  const safe = Number.isFinite(costUsd) ? Math.max(0, costUsd) : 0;
  await db
    .update(productSizes)
    .set({ extraCostUsd: safe.toFixed(2) })
    .where(eq(productSizes.id, productSizeId));
}

export interface CostLineInput {
  name: string;
  amount: number;
}

/**
 * Reemplaza el desglose entero de un tamaño. Igual que las líneas de una venta:
 * es más simple que reconciliar altas y bajas, y un desglose es corto.
 */
export async function saveCostItems(
  productSizeId: number,
  lines: CostLineInput[],
) {
  const db = getDb();
  const rows = lines
    .map((line) => ({ name: line.name.trim(), amount: line.amount }))
    // Una línea sin nombre o en cero no dice nada y sólo ensucia el desglose.
    .filter((line) => line.name.length > 0 && line.amount > 0)
    .map((line, position) => ({
      productSizeId,
      name: line.name,
      amountUsd: line.amount.toFixed(4),
      position,
    }));

  const clear = db
    .delete(costItems)
    .where(eq(costItems.productSizeId, productSizeId));

  // `batch` mantiene los pasos atómicos: nunca queda un desglose a medio borrar.
  if (rows.length > 0) {
    await db.batch([clear, db.insert(costItems).values(rows)]);
  } else {
    await clear;
  }
}

export interface RecipeLineInput {
  supplyItemId: number;
  quantity: number;
}

export interface SizeRecipe {
  productSizeId: number;
  lines: RecipeLineInput[];
}

/**
 * La receta de cada tamaño: qué insumos lleva y cuántos. Es lo que se descuenta
 * del inventario al vender; el costo ya no sale de acá.
 */
export async function getRecipes(): Promise<SizeRecipe[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(recipeItems)
    .orderBy(asc(recipeItems.position), asc(recipeItems.id));

  const recipes = new Map<number, SizeRecipe>();
  for (const row of rows) {
    let recipe = recipes.get(row.productSizeId);
    if (!recipe) {
      recipe = { productSizeId: row.productSizeId, lines: [] };
      recipes.set(row.productSizeId, recipe);
    }
    recipe.lines.push({
      supplyItemId: row.supplyItemId,
      quantity: Number(row.quantity),
    });
  }
  return [...recipes.values()];
}

/**
 * Reemplaza la receta entera de un tamaño, por el mismo motivo que el desglose.
 */
export async function saveRecipe(
  productSizeId: number,
  lines: RecipeLineInput[],
) {
  const db = getDb();
  const rows = lines
    // Una línea en cero no consume nada y sólo ensucia la receta.
    .filter((line) => line.supplyItemId > 0 && line.quantity > 0)
    .map((line, position) => ({
      productSizeId,
      supplyItemId: line.supplyItemId,
      quantity: line.quantity.toFixed(3),
      position,
    }));

  const clear = db
    .delete(recipeItems)
    .where(eq(recipeItems.productSizeId, productSizeId));

  if (rows.length > 0) {
    await db.batch([clear, db.insert(recipeItems).values(rows)]);
  } else {
    await clear;
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
