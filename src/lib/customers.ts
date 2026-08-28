/**
 * Helpers de clientes que corren en los dos lados: el buscador del formulario
 * de ventas es un componente de cliente y necesita normalizar y filtrar igual
 * que el servidor. Nada de aquí toca la base de datos.
 */

/**
 * Reduce un teléfono a sus dígitos significativos para poder comparar dos
 * anotaciones del mismo número: "0414-2856600", "+58 414 285 6600" y
 * "4142856600" dan todas `4142856600`.
 *
 * Devuelve null si no queda un número de teléfono plausible, para no juntar
 * clientes distintos por culpa de un campo con tres dígitos sueltos.
 */
export function phoneKey(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  // El código de país sólo se quita si debajo queda un número completo: hay
  // teléfonos locales que legítimamente empiezan por 58.
  if (digits.startsWith("58") && digits.length >= 12) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length >= 7 ? digits : null;
}

/** Formato de pantalla: 0414-2856600. Lo que no encaja se muestra tal cual. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const key = phoneKey(phone);
  if (!key || key.length !== 10) return phone;
  return `0${key.slice(0, 3)}-${key.slice(3)}`;
}

/**
 * Enlace para escribirle por WhatsApp. Sólo para números venezolanos
 * completos: con menos dígitos el enlace abriría un chat con nadie, así que
 * mejor mostrar el teléfono pelado.
 */
export function whatsappLink(phone: string | null | undefined): string | null {
  const key = phoneKey(phone);
  if (!key || key.length !== 10) return null;
  return `https://wa.me/58${key}`;
}

/** El @ sobra al guardar: se agrega al mostrar y se quita al escribir. */
export function normalizeInstagram(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const clean = handle.trim().replace(/^@+/, "").replace(/\s+/g, "");
  return clean || null;
}

/** Sin tildes ni mayúsculas, para que "Andrés" aparezca buscando "andres". */
export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export interface CustomerLike {
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  city: string | null;
  state: string | null;
  deliveryZone: string | null;
  address: string | null;
}

/**
 * Lo que el buscador del formulario de ventas necesita saber de un cliente.
 * Es un recorte a propósito: la ficha completa viaja al navegador en cada
 * carga de la página de ventas, así que no se manda lo que no se muestra.
 */
export interface CustomerChoice extends CustomerLike {
  id: number;
  orders: number;
  totalUsd: number;
  favoriteProduct: string | null;
  lastPurchase: string | null;
  /** Si compra para revender. Hace que la venta arranque en el canal "mayor". */
  isReseller: boolean;
}

/** Dónde vive, en una línea: de lo más específico a lo más general. */
export function customerLocation(customer: CustomerLike): string {
  const parts = [
    customer.deliveryZone,
    customer.city,
    customer.state,
  ].filter((part): part is string => Boolean(part));
  // El estado se calla si la zona o la ciudad ya lo hacen obvio.
  return parts.join(" · ");
}

/**
 * Filtra por nombre, teléfono, correo, Instagram o ubicación. El teléfono se
 * compara normalizado en ambos lados, así que buscar "0414" encuentra a quien
 * está guardado como "+584142856600".
 */
export function matchesCustomer(customer: CustomerLike, query: string): boolean {
  const term = foldText(query.trim());
  if (!term) return true;

  const haystack = foldText(
    [
      customer.name,
      customer.email,
      customer.instagram,
      customer.city,
      customer.state,
      customer.deliveryZone,
      customer.address,
    ]
      .filter(Boolean)
      .join(" "),
  );
  if (haystack.includes(term)) return true;

  const digits = term.replace(/\D/g, "");
  if (!digits) return false;
  const key = phoneKey(customer.phone);
  return key !== null && key.includes(phoneKey(digits) ?? digits);
}
