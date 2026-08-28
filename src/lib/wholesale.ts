/**
 * El precio al mayor: cuánto se le cobra la caja a quien revende.
 *
 * No se escribe a mano. Sale del PVP y del costo del frasco —los dos ya viven
 * en el panel— para que subir un precio o cargar un costo nuevo mueva la
 * página al mayor sola, en vez de dejar dos verdades distintas como pasaba con
 * las promos escritas en el código.
 *
 * La regla tiene dos mitades y las dos importan:
 *
 * 1. Se apunta a `TARGET_DISCOUNT` bajo el PVP. Ese descuento es lo que gana
 *    el mayorista si revende al precio de la tienda, y es lo que lo hace
 *    querer vender: sin margen no empuja el producto.
 *
 * 2. Nunca se baja de `MIN_MARGIN` de margen nuestro. Un descuento parejo
 *    suena justo hasta que se mira el pistacho: su materia prima se lleva la
 *    mitad del PVP, y el mismo 30% que en el maní deja una ganancia flaca en
 *    la caja más cara del catálogo. Ahí manda el piso y el descuento se acorta.
 *
 * Cuando el piso es el que manda, el producto queda `capped`: no es un error,
 * es la señal de que ese sabor está apretado y de que el camino para soltarlo
 * es bajar su costo o subir su PVP, no regalar el margen.
 */

/** Cuántos frascos trae una caja. Es la unidad de venta al mayor. */
export const BOX_UNITS = 12;

/**
 * El frasco que se vende al mayor. Es el único tamaño con costo cargado, y
 * también el que se lleva la mayoría en la tienda.
 */
export const WHOLESALE_GRAMS = 230;

/** Lo que se le descuenta del PVP al mayorista, cuando el margen lo permite. */
export const TARGET_DISCOUNT = 0.3;

/** El margen nuestro por debajo del cual no se vende, pase lo que pase. */
export const MIN_MARGIN = 0.35;

/**
 * Los precios se dejan en múltiplos de cinco centavos, redondeando hacia
 * arriba. Hacia arriba y no al más cercano porque el redondeo no puede romper
 * el piso: bajar $20.523 a $20.50 son dos centavos, pero es el código
 * contradiciendo la regla que dice cumplir.
 */
function roundUpToNickel(value: number): number {
  return Math.ceil(value * 20) / 20;
}

export interface WholesalePrice {
  /** Lo que paga el mayorista por frasco. */
  unitPrice: number;
  /** Lo que paga por la caja completa. */
  boxPrice: number;
  /** Cuánto quedó por debajo del PVP, en porcentaje. */
  discountPct: number;
  /** Lo que nos queda a nosotros sobre el precio al mayor. */
  ourMarginPct: number;
  /** Lo que gana el mayorista revendiendo al PVP, por caja. */
  resellerProfitPerBox: number;
  /** Lo que nos queda a nosotros por caja. */
  ourProfitPerBox: number;
  /** Si el piso de margen fue el que decidió el precio, no el descuento. */
  capped: boolean;
}

/**
 * El precio al mayor de un frasco, con las dos cuentas que hay que mirar
 * antes de cerrar el trato: lo que nos deja y lo que le deja a él.
 */
export function wholesalePrice(
  retailPrice: number,
  unitCost: number,
): WholesalePrice {
  const target = retailPrice * (1 - TARGET_DISCOUNT);
  // El precio más bajo al que todavía nos queda `MIN_MARGIN`. Se despeja de
  // margen = (precio - costo) / precio.
  const floor = unitCost / (1 - MIN_MARGIN);

  const capped = floor > target;
  const unitPrice = roundUpToNickel(Math.max(target, floor));
  const boxPrice = unitPrice * BOX_UNITS;

  return {
    unitPrice,
    boxPrice,
    discountPct: ((retailPrice - unitPrice) / retailPrice) * 100,
    ourMarginPct: ((unitPrice - unitCost) / unitPrice) * 100,
    resellerProfitPerBox: (retailPrice - unitPrice) * BOX_UNITS,
    ourProfitPerBox: (unitPrice - unitCost) * BOX_UNITS,
    capped,
  };
}

/** Precio en dólares, con los dos decimales que se leen en una factura. */
export function fmtPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}
