import type { MetadataRoute } from "next";
import { products } from "@/lib/products";
import { SITE_URL } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/productos/${p.key}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...productPages,
  ];
}
