import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // El panel y las rutas de API no aportan nada en búsqueda y consumen
      // presupuesto de rastreo. /admin además ya va con noindex. /opinar son
      // enlaces personales para dejar una reseña, uno por compra.
      disallow: ["/admin", "/api", "/opinar"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
