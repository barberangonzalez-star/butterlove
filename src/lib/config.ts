// Configuración general de la tienda.
// Con www, porque es el dominio principal en Vercel: el apex responde 308 hacia
// www. Si aquí se declara el apex, cada URL del sitemap y cada canonical apunta
// a una redirección, y Search Console las reporta como "página con redirección"
// o "URL enviada no seleccionada como canónica".
export const SITE_URL = "https://www.butterlove.store";

export const GA_MEASUREMENT_ID = "G-LK4PXJHGH9";

/**
 * El pixel de Meta, que es lo que mide en el sitio lo que pasa después de un
 * anuncio de Instagram o Facebook. Se saca del Administrador de eventos de
 * Meta (Orígenes de datos > el pixel > su ID): son 15 o 16 dígitos. Vacío, el
 * pixel no se carga y el sitio queda exactamente como estaba.
 */
export const META_PIXEL_ID = "2911739589218863";

// Perfiles oficiales del negocio. Google los usa (vía `sameAs`) para conectar
// el sitio con las redes y reforzar que se trata de la misma marca.
// Agrega aquí las URLs reales de Instagram, Facebook, TikTok, etc.
export const SOCIAL_LINKS: string[] = [];

// Ciudad principal de operación (pickup/delivery). Se usa como señal local en
// los datos estructurados. Déjalo vacío si prefieres no declarar ciudad.
export const BUSINESS_LOCALITY = "";

// Cambia el número de WhatsApp por el número real del negocio (formato: código país + número, sin '+' ni espacios).
export const WHATSAPP_NUMBER = "584142856600";

export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

/**
 * La llave pública VAPID con la que el panel se suscribe a las notificaciones.
 *
 * Va acá y no en una variable de entorno a propósito: es pública por diseño
 * —viaja en el navegador de todas formas— y en `NEXT_PUBLIC_` sería una
 * variable más que configurar en Vercel, con el detalle de que si falta, el
 * botón de activar notificaciones falla en silencio. La privada, que es la que
 * firma, sí vive en el entorno como `VAPID_PRIVATE_KEY`.
 *
 * Las dos son un par: cambiar ésta obliga a cambiar la otra, y deja sin efecto
 * todas las suscripciones ya guardadas.
 */
export const VAPID_PUBLIC_KEY =
  "BDPh0rk4MZoaZHxGDpChx0XGuK92se1OqrzZDz4nyO9uCB2Bus470SM-VQj2DWpdyp6p2sZFPUr3gxWOGIzvlYY";

/**
 * El sabor que anuncia el banner de la home, por su `key` del catálogo. Se
 * nombra aquí y no en el componente porque quien lo busca en la base de datos
 * es la página —el producto puede estar fuera de la vitrina—. Vacío, el
 * carrusel arranca directo en los sabores de la tienda.
 */
export const HERO_ANNOUNCEMENT_KEY = "chocomani";

/**
 * Por qué canal se vendió.
 *
 * `detal` es el cliente final, al precio de la tienda. `mayor` es quien compra
 * por caja para revender, ~30% más abajo. Se separan porque promediarlos
 * dejaría la ganancia por frasco sin significado: son dos negocios con costos
 * iguales y precios distintos.
 */
export type SaleChannel = "detal" | "mayor";

export const SALE_CHANNELS: { value: SaleChannel; label: string; hint: string }[] =
  [
    {
      value: "detal",
      label: "Detal",
      hint: "Cliente final, al precio de la tienda.",
    },
    {
      value: "mayor",
      label: "Mayor",
      hint: "Compra por caja para revender. Los precios se cotizan al mayor.",
    },
  ];

export function isSaleChannel(value: unknown): value is SaleChannel {
  return SALE_CHANNELS.some((c) => c.value === value);
}

/** El canal, saneado. Lo que no se reconozca cuenta como detal, que es el default. */
export function saleChannel(value: unknown): SaleChannel {
  return isSaleChannel(value) ? value : "detal";
}

export const PAYMENT_METHODS = ["Pago Móvil", "USD en efectivo", "Binance"];

/**
 * Los que se cobran en bolívares. Son los únicos en los que hay diferencia
 * entre lo que dice la venta y los dólares que quedan al reponer, porque el
 * monto se calculó a tasa BCV.
 */
export const BS_PAYMENT_METHODS = ["Pago Móvil"];

export const DELIVERY_METHODS = ["Pickup", "Delivery", "Envío nacional"];

// Delivery dentro de la ciudad.
export const DELIVERY_PROVIDERS = ["Ridery", "Yummy", "Nosotros"];

export interface DeliveryZone {
  name: string;
  price: number;
}

// Zonas de delivery en Caracas con su costo en USD. El checkout suma este monto
// al total del pedido. Ordenadas de menor a mayor precio.
export const DELIVERY_ZONES: DeliveryZone[] = [
  { name: "Los Cortijos", price: 2 },
  { name: "Los Dos Caminos", price: 2.6 },
  { name: "Miranda / Los Palos Grandes / La Castellana", price: 3 },
  { name: "Altamira", price: 3 },
  { name: "Chacao", price: 3 },
  { name: "El Cafetal", price: 3 },
  { name: "Las Mercedes", price: 3.5 },
  { name: "Chacaíto", price: 3.6 },
  { name: "Sabana Grande", price: 3.6 },
  { name: "Plaza Venezuela", price: 4 },
  { name: "Los Naranjos", price: 4.5 },
  { name: "El Hatillo", price: 5 },
  { name: "La Trinidad", price: 5.6 },
];

/**
 * Lo que cuesta llevar un pedido a una zona, si está en la lista de precios.
 *
 * `DELIVERY_ZONES` cobra por área y mete varias urbanizaciones en una sola
 * entrada ("Miranda / Los Palos Grandes / La Castellana"), así que se compara
 * contra cada nombre y no contra la entrada entera. Las zonas de
 * `CARACAS_ZONES` que no están en la lista de precios devuelven null: no hay
 * tarifa publicada, no que el envío sea gratis.
 */
export function deliveryPriceForZone(zone: string | null | undefined) {
  if (!zone) return null;
  const match = DELIVERY_ZONES.find((entry) =>
    entry.name.split(" / ").includes(zone),
  );
  return match?.price ?? null;
}

export interface CaracasZone {
  name: string;
  municipality: string;
}

/**
 * Municipios del área metropolitana de Caracas, en el orden en que se ofrecen.
 * Van primero los del este, que es donde está la mayoría de los clientes.
 */
export const CARACAS_MUNICIPALITIES = [
  "Chacao",
  "Baruta",
  "Sucre",
  "El Hatillo",
  "Libertador",
];

/** A qué estado pertenece cada municipio: los cuatro del este son Miranda. */
export const CARACAS_MUNICIPALITY_STATE: Record<string, string> = {
  Chacao: "Miranda",
  Baruta: "Miranda",
  Sucre: "Miranda",
  "El Hatillo": "Miranda",
  Libertador: "Distrito Capital",
};

/**
 * El estado que implica una zona, o null si no es de Caracas. Sirve para
 * rellenarlo solo, y también para saber si el estado guardado lo puso una zona
 * anterior en vez de una persona.
 */
export function stateForZone(zone: string | null | undefined) {
  const municipality = CARACAS_ZONES.find((z) => z.name === zone)?.municipality;
  return municipality ? CARACAS_MUNICIPALITY_STATE[municipality] ?? null : null;
}

/**
 * Urbanizaciones y sectores de Caracas, para ubicar al cliente más fino que
 * "Distrito Capital". Es la ubicación de la persona, no la tarifa del envío:
 * el delivery se sigue cobrando por `DELIVERY_ZONES`, que agrupa varias de
 * estas zonas en una sola área de precio.
 *
 * Los nombres de las que sí tienen tarifa coinciden exactos con los de
 * `DELIVERY_ZONES` para que `deliveryPriceForZone` las encuentre.
 *
 * Fuera de Caracas no se detalla por zona: ahí basta el estado y la ciudad.
 */
export const CARACAS_ZONES: CaracasZone[] = [
  { name: "Altamira", municipality: "Chacao" },
  { name: "Bello Campo", municipality: "Chacao" },
  { name: "Campo Alegre", municipality: "Chacao" },
  { name: "Chacao", municipality: "Chacao" },
  { name: "Country Club", municipality: "Chacao" },
  { name: "El Bosque", municipality: "Chacao" },
  { name: "El Pedregal", municipality: "Chacao" },
  { name: "El Rosal", municipality: "Chacao" },
  { name: "La Castellana", municipality: "Chacao" },
  { name: "La Floresta", municipality: "Chacao" },
  { name: "Los Palos Grandes", municipality: "Chacao" },

  { name: "Alto Prado", municipality: "Baruta" },
  { name: "Baruta", municipality: "Baruta" },
  { name: "Caurimare", municipality: "Baruta" },
  { name: "Chuao", municipality: "Baruta" },
  { name: "Colinas de Bello Monte", municipality: "Baruta" },
  { name: "Colinas de Tamanaco", municipality: "Baruta" },
  { name: "Colinas de Valle Arriba", municipality: "Baruta" },
  { name: "Cumbres de Curumo", municipality: "Baruta" },
  { name: "El Cafetal", municipality: "Baruta" },
  { name: "El Peñón", municipality: "Baruta" },
  { name: "El Placer", municipality: "Baruta" },
  { name: "La Alameda", municipality: "Baruta" },
  { name: "La Bonita", municipality: "Baruta" },
  { name: "La Tahona", municipality: "Baruta" },
  { name: "La Trinidad", municipality: "Baruta" },
  { name: "Las Mercedes", municipality: "Baruta" },
  { name: "Lomas de La Trinidad", municipality: "Baruta" },
  { name: "Lomas de Las Mercedes", municipality: "Baruta" },
  { name: "Los Campitos", municipality: "Baruta" },
  { name: "Los Naranjos del Cafetal", municipality: "Baruta" },
  { name: "Los Samanes", municipality: "Baruta" },
  { name: "Manzanares", municipality: "Baruta" },
  { name: "Piedra Azul", municipality: "Baruta" },
  { name: "Prados del Este", municipality: "Baruta" },
  { name: "Santa Fe Norte", municipality: "Baruta" },
  { name: "Santa Fe Sur", municipality: "Baruta" },
  { name: "Santa Paula", municipality: "Baruta" },
  { name: "Santa Rosa de Lima", municipality: "Baruta" },
  { name: "Sorocaima", municipality: "Baruta" },
  { name: "Terrazas del Club Hípico", municipality: "Baruta" },
  { name: "Valle Arriba", municipality: "Baruta" },

  { name: "Boleíta Norte", municipality: "Sucre" },
  { name: "Boleíta Sur", municipality: "Sucre" },
  { name: "Campo Claro", municipality: "Sucre" },
  { name: "Caucagüita", municipality: "Sucre" },
  { name: "Colinas de La California", municipality: "Sucre" },
  { name: "El Llanito", municipality: "Sucre" },
  { name: "El Marqués", municipality: "Sucre" },
  { name: "Filas de Mariche", municipality: "Sucre" },
  { name: "Horizonte", municipality: "Sucre" },
  { name: "La California Norte", municipality: "Sucre" },
  { name: "La California Sur", municipality: "Sucre" },
  { name: "La Dolorita", municipality: "Sucre" },
  { name: "La Urbina", municipality: "Sucre" },
  { name: "Los Chorros", municipality: "Sucre" },
  { name: "Los Cortijos", municipality: "Sucre" },
  { name: "Los Dos Caminos", municipality: "Sucre" },
  { name: "Los Ruices", municipality: "Sucre" },
  { name: "Los Ruices Sur", municipality: "Sucre" },
  { name: "Macaracuay", municipality: "Sucre" },
  { name: "Miranda", municipality: "Sucre" },
  { name: "Montecristo", municipality: "Sucre" },
  { name: "Palo Verde", municipality: "Sucre" },
  { name: "Petare", municipality: "Sucre" },
  { name: "Santa Cecilia", municipality: "Sucre" },
  { name: "Santa Eduvigis", municipality: "Sucre" },
  { name: "Sebucán", municipality: "Sucre" },
  { name: "Terrazas del Ávila", municipality: "Sucre" },

  { name: "Alto Hatillo", municipality: "El Hatillo" },
  { name: "Cerro Verde", municipality: "El Hatillo" },
  { name: "El Cigarral", municipality: "El Hatillo" },
  { name: "El Hatillo", municipality: "El Hatillo" },
  { name: "La Boyera", municipality: "El Hatillo" },
  { name: "La Lagunita", municipality: "El Hatillo" },
  { name: "La Unión", municipality: "El Hatillo" },
  { name: "Los Geranios", municipality: "El Hatillo" },
  { name: "Los Naranjos", municipality: "El Hatillo" },
  { name: "Oripoto", municipality: "El Hatillo" },

  { name: "23 de Enero", municipality: "Libertador" },
  { name: "Alta Florida", municipality: "Libertador" },
  { name: "Altagracia", municipality: "Libertador" },
  { name: "Antímano", municipality: "Libertador" },
  { name: "Bello Monte", municipality: "Libertador" },
  { name: "Caricuao", municipality: "Libertador" },
  { name: "Catia", municipality: "Libertador" },
  { name: "Chacaíto", municipality: "Libertador" },
  { name: "Coche", municipality: "Libertador" },
  { name: "Colinas de Las Acacias", municipality: "Libertador" },
  { name: "Colinas de Los Caobos", municipality: "Libertador" },
  { name: "Colinas de Santa Mónica", municipality: "Libertador" },
  { name: "Cotiza", municipality: "Libertador" },
  { name: "El Cementerio", municipality: "Libertador" },
  { name: "El Paraíso", municipality: "Libertador" },
  { name: "El Recreo", municipality: "Libertador" },
  { name: "El Silencio", municipality: "Libertador" },
  { name: "El Valle", municipality: "Libertador" },
  { name: "La Candelaria", municipality: "Libertador" },
  { name: "La Florida", municipality: "Libertador" },
  { name: "La Pastora", municipality: "Libertador" },
  { name: "La Vega", municipality: "Libertador" },
  { name: "La Yaguara", municipality: "Libertador" },
  { name: "Las Acacias", municipality: "Libertador" },
  { name: "Los Caobos", municipality: "Libertador" },
  { name: "Los Chaguaramos", municipality: "Libertador" },
  { name: "Los Rosales", municipality: "Libertador" },
  { name: "Los Símbolos", municipality: "Libertador" },
  { name: "Macarao", municipality: "Libertador" },
  { name: "Maripérez", municipality: "Libertador" },
  { name: "Montalbán", municipality: "Libertador" },
  { name: "Plaza Venezuela", municipality: "Libertador" },
  { name: "Propatria", municipality: "Libertador" },
  { name: "Quinta Crespo", municipality: "Libertador" },
  { name: "Sabana Grande", municipality: "Libertador" },
  { name: "San Agustín", municipality: "Libertador" },
  { name: "San Bernardino", municipality: "Libertador" },
  { name: "San Juan", municipality: "Libertador" },
  { name: "San Martín", municipality: "Libertador" },
  { name: "Santa Mónica", municipality: "Libertador" },
  { name: "Santa Rosalía", municipality: "Libertador" },
  { name: "Valle Abajo", municipality: "Libertador" },
];

/**
 * Encomiendas al interior del país.
 *
 * La lista se usa en dos sitios y por eso vive acá: el checkout la ofrece para
 * que el cliente elija por cuál empresa quiere recibir, y las preguntas de la
 * tienda y de la landing la nombran. Agregar una empresa es agregarla acá.
 */
export const NATIONAL_COURIERS = ["MRW", "Zoom", "Domesa", "Tealca"];

export const VENEZUELA_STATES = [
  "Amazonas",
  "Anzoátegui",
  "Apure",
  "Aragua",
  "Barinas",
  "Bolívar",
  "Carabobo",
  "Cojedes",
  "Delta Amacuro",
  "Distrito Capital",
  "Falcón",
  "Guárico",
  "La Guaira",
  "Lara",
  "Mérida",
  "Miranda",
  "Monagas",
  "Nueva Esparta",
  "Portuguesa",
  "Sucre",
  "Táchira",
  "Trujillo",
  "Yaracuy",
  "Zulia",
];

/**
 * Cómo cuenta un gasto contra la ganancia del mes.
 *
 * `operativo` se resta: anuncios, sueldos, comisiones. Es plata que se fue y no
 * dejó nada a cambio.
 *
 * `inventario` no se resta. Es plata que salió del bolsillo pero que todavía no
 * es un gasto: comprar 5 kg de maní es cambiar dólares por maní, y ese costo se
 * cuenta frasco a frasco cuando se vende. Restarlo aquí además de contarlo en
 * el costo de lo vendido sería contarlo dos veces y haría ver el negocio peor
 * de lo que está. Aparece igual en la vista de caja, que es la que responde
 * "cuánto entró y cuánto salió este mes".
 *
 * La categoría propone uno de los dos, pero el que manda es el que se eligió al
 * registrar el gasto: comprar una tostadora es un equipo que dura años y no
 * tiene por qué hundir el mes en que se compró.
 */
export type ExpenseKind = "operativo" | "inventario";

export const EXPENSE_KINDS: { value: ExpenseKind; label: string; hint: string }[] =
  [
    {
      value: "operativo",
      label: "Sí resta",
      hint: "Se resta de la ganancia del mes.",
    },
    {
      value: "inventario",
      label: "No resta",
      hint: "Salió de la caja pero no de la ganancia: es inventario o algo que te queda. La materia prima ya se cuenta frasco a frasco cuando vendes.",
    },
  ];

export interface ExpenseCategory {
  name: string;
  kind: ExpenseKind;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { name: "Anuncios (Meta, Instagram)", kind: "operativo" },
  { name: "Insumos y materia prima", kind: "inventario" },
  { name: "Delivery y transporte", kind: "operativo" },
  { name: "Sueldos y ayudantes", kind: "operativo" },
  { name: "Comisiones y bancos", kind: "operativo" },
  { name: "Servicios (luz, gas, internet)", kind: "operativo" },
  { name: "Equipos y utensilios", kind: "operativo" },
  { name: "Ferias y eventos", kind: "operativo" },
  { name: "Otros", kind: "operativo" },
];

export function isExpenseKind(value: unknown): value is ExpenseKind {
  return EXPENSE_KINDS.some((k) => k.value === value);
}

/** Lo que la categoría propone, y con lo que arranca el formulario. */
export function expenseKind(category: string): ExpenseKind {
  return (
    EXPENSE_CATEGORIES.find((c) => c.name === category)?.kind ?? "operativo"
  );
}

export const PAGO_MOVIL = {
  bank: "Mercantil",
  phone: "0414-2856600",
  id: "23656193",
};

export const BINANCE = {
  email: "albert6215@gmail.com",
};
