// Configuración general de la tienda.
export const SITE_URL = "https://butterlove.store";

export const GA_MEASUREMENT_ID = "G-LK4PXJHGH9";

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

export const PAYMENT_METHODS = ["Pago Móvil", "USD en efectivo", "Binance"];

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

// Encomiendas al interior del país.
export const NATIONAL_COURIERS = ["MRW", "Zoom", "Tealca"];

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

export const PAGO_MOVIL = {
  bank: "Mercantil",
  phone: "0414-2856600",
  id: "23656193",
};

export const BINANCE = {
  email: "albert6215@gmail.com",
};
