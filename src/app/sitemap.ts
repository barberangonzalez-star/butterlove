import type { MetadataRoute } from "next";
import { getProductSitemapEntries } from "@/lib/products-data";
import { posts } from "@/lib/posts";
import { SITE_URL } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productEntries = await getProductSitemapEntries();

  // `lastModified` le dice a Google cuándo vale la pena volver a rastrear. Sin
  // fecha, tiende a revisitar según su propio criterio y tarda más en recoger
  // cambios de precio o de contenido.
  const productPages: MetadataRoute.Sitemap = productEntries.map((p) => ({
    url: `${SITE_URL}/productos/${p.key}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const blogPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // La home y el listado del blog cambian cuando cambia cualquier hijo.
  const lastProductUpdate = productEntries.reduce<Date | undefined>(
    (latest, p) => (!latest || p.updatedAt > latest ? p.updatedAt : latest),
    undefined,
  );
  const lastPostDate = posts.reduce<Date | undefined>((latest, p) => {
    const date = new Date(p.date);
    return !latest || date > latest ? date : latest;
  }, undefined);

  return [
    {
      url: SITE_URL,
      lastModified: lastProductUpdate ?? new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: lastPostDate ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...productPages,
    ...blogPages,
  ];
}
