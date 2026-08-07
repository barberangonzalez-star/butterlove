// Datos estructurados (schema.org / JSON-LD) y helpers de URL para SEO.
//
// Google usa esto para entender qué vende el sitio y para mostrar resultados
// enriquecidos: precio y disponibilidad en las páginas de producto, y el
// carrusel de recetas con foto, tiempo e ingredientes en el blog.
import {
  SITE_URL,
  WHATSAPP_LINK,
  WHATSAPP_NUMBER,
  SOCIAL_LINKS,
  BUSINESS_LOCALITY,
  PAYMENT_METHODS,
} from "./config";
import type { Product } from "./products";
import type { Post } from "./posts";

export const SITE_NAME = "Butter Love";

export const SITE_DESCRIPTION =
  "Mantequillas artesanales de maní, pistacho, almendras y merey. 100% naturales, sin azúcar agregada, hechas a mano en Venezuela.";

/**
 * Convierte una ruta relativa en URL absoluta (schema.org las exige).
 * La barra final se elimina para que la home quede idéntica a la canónica y a
 * la del sitemap: una sola forma de la URL, sin ambigüedad para Google.
 */
export function absoluteUrl(path = "/"): string {
  const url = new URL(path, SITE_URL).toString();
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Cuando una página define su propio `openGraph`, Next reemplaza por completo
 * el del layout raíz (no hace merge campo a campo). Estas claves se esparcen
 * en cada página para no perder `og:site_name` ni `og:locale`.
 */
export const OG_DEFAULTS = {
  siteName: SITE_NAME,
  locale: "es_VE",
} as const;

/** IDs estables para poder referenciar nodos entre distintos schemas. */
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * La marca como entidad. Va en el layout raíz, así aparece en todas las
 * páginas y Google puede asociar logo, contacto y redes con el dominio.
 */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/logo-wordmark.png"),
      width: 920,
      height: 500,
    },
    image: absoluteUrl("/logo-wordmark.png"),
    ...(SOCIAL_LINKS.length > 0 ? { sameAs: SOCIAL_LINKS } : {}),
    address: {
      "@type": "PostalAddress",
      addressCountry: "VE",
      ...(BUSINESS_LOCALITY ? { addressLocality: BUSINESS_LOCALITY } : {}),
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: `+${WHATSAPP_NUMBER}`,
      url: WHATSAPP_LINK,
      areaServed: "VE",
      availableLanguage: ["es"],
    },
  };
}

/** El sitio como entidad, enlazado a la organización. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "es",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

/** Migas de pan: Google las muestra en lugar de la URL cruda del resultado. */
export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/**
 * Producto con sus precios por tamaño. Cuando hay más de un tamaño usamos
 * AggregateOffer con el rango, que es lo que Google espera para variantes.
 */
export function productSchema(product: Product) {
  const url = absoluteUrl(`/productos/${product.key}`);
  const prices = product.sizes.map((s) => s.price);

  const offers =
    product.sizes.length === 1
      ? {
          "@type": "Offer",
          url,
          price: prices[0].toFixed(2),
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
          acceptedPaymentMethod: PAYMENT_METHODS.map((name) => ({
            "@type": "PaymentMethod",
            name,
          })),
        }
      : {
          "@type": "AggregateOffer",
          url,
          priceCurrency: "USD",
          lowPrice: Math.min(...prices).toFixed(2),
          highPrice: Math.max(...prices).toFixed(2),
          offerCount: product.sizes.length,
          availability: "https://schema.org/InStock",
          offers: product.sizes.map((size) => ({
            "@type": "Offer",
            url,
            name: `Mantequilla de ${product.name} ${size.grams}g`,
            sku: `${product.key}-${size.grams}`,
            price: size.price.toFixed(2),
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
          })),
        };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: `Mantequilla de ${product.name}`,
    description: product.description,
    image: [absoluteUrl(product.image), absoluteUrl(product.heroImage)],
    url,
    sku: product.key,
    category: "Mantequilla de frutos secos",
    brand: { "@type": "Brand", name: SITE_NAME },
    // Los badges del producto ("sin azúcar", "100% natural"...) son atributos
    // reales del artículo, así que los declaramos como propiedades.
    ...(product.badges.length > 0
      ? {
          additionalProperty: product.badges.map((badge) => ({
            "@type": "PropertyValue",
            name: badge,
          })),
        }
      : {}),
    offers,
  };
}

/** "15 min + 30 min de reposo" -> PT45M. Suma todos los minutos del texto. */
function toIsoDuration(text: string): string | undefined {
  const matches = [...text.matchAll(/(\d+)\s*min/gi)];
  if (matches.length === 0) return undefined;
  const total = matches.reduce((sum, m) => sum + Number(m[1]), 0);
  return `PT${total}M`;
}

/** "10 bolitas" -> 10. Google prefiere un número en recipeYield. */
function toYield(text: string): string {
  const match = text.match(/(\d+)/);
  return match ? match[1] : text;
}

/**
 * Receta: es el schema con más potencial de tráfico nuevo, porque habilita el
 * carrusel visual de recetas en los resultados de Google.
 */
export function recipeSchema(post: Post, product: Product) {
  if (!post.recipe) return null;
  const url = absoluteUrl(`/blog/${post.slug}`);
  const totalTime = toIsoDuration(post.recipe.time);

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "@id": `${url}#recipe`,
    name: post.title,
    description: post.excerpt,
    image: [absoluteUrl(product.image)],
    url,
    inLanguage: "es",
    datePublished: post.date,
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    recipeCategory: "Desayuno",
    recipeCuisine: "Saludable",
    keywords: `mantequilla de ${product.name}, receta saludable, sin azúcar`,
    ...(totalTime ? { totalTime } : {}),
    recipeYield: toYield(post.recipe.servings),
    recipeIngredient: post.recipe.ingredients,
    recipeInstructions: post.recipe.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text: step,
    })),
    // El cuerpo del post da contexto adicional a la receta.
    articleBody: post.body.join("\n\n"),
  };
}

/** Artículo informativo (los posts de beneficios, que no son recetas). */
export function articleSchema(post: Post, product: Product) {
  const url = absoluteUrl(`/blog/${post.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.excerpt,
    image: [absoluteUrl(product.image)],
    url,
    inLanguage: "es",
    datePublished: post.date,
    dateModified: post.date,
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleBody: post.body.join("\n\n"),
    about: {
      "@type": "Product",
      name: `Mantequilla de ${product.name}`,
      url: absoluteUrl(`/productos/${product.key}`),
    },
  };
}

/** Listado de productos de la home, para que Google entienda el catálogo. */
export function productListSchema(products: Product[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Mantequillas Butter Love",
    itemListElement: products.map((product, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `Mantequilla de ${product.name}`,
      url: absoluteUrl(`/productos/${product.key}`),
    })),
  };
}
