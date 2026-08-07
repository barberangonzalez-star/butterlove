import type { MetadataRoute } from "next";
import { getProductSitemapEntries } from "@/lib/products-data";
import { posts } from "@/lib/posts";
import { absoluteUrl } from "@/lib/seo";
import { SITE_URL } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productEntries = await getProductSitemapEntries();

  // `lastModified` le dice a Google cuándo vale la pena volver a rastrear. Sin
  // fecha, tiende a revisitar según su propio criterio y tarda más en recoger
  // cambios de precio o de contenido.
  //
  // `images` declara la foto de cada URL. Google no siempre encuentra las
  // imágenes al rastrear (más aún si cargan diferido), y sin esta declaración
  // quedan fuera de Google Imágenes.
  const productPages: MetadataRoute.Sitemap = productEntries.map((p) => ({
    url: `${SITE_URL}/productos/${p.key}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
    images: [absoluteUrl(p.image), absoluteUrl(p.heroImage)],
  }));

  const imageByProduct = new Map(
    productEntries.map((p) => [p.key, absoluteUrl(p.image)]),
  );

  const blogPages: MetadataRoute.Sitemap = posts.map((p) => {
    const image = imageByProduct.get(p.productKey);
    return {
      url: `${SITE_URL}/blog/${p.slug}`,
      // La fecha de revisión, cuando existe, es la que hace que Google vuelva
      // a pasar por un post que ya tenía indexado.
      lastModified: new Date(p.updated ?? p.date),
      changeFrequency: "monthly",
      priority: 0.6,
      ...(image ? { images: [image] } : {}),
    };
  });

  // La home y el listado del blog cambian cuando cambia cualquier hijo.
  const lastProductUpdate = productEntries.reduce<Date | undefined>(
    (latest, p) => (!latest || p.updatedAt > latest ? p.updatedAt : latest),
    undefined,
  );
  const lastPostDate = posts.reduce<Date | undefined>((latest, p) => {
    const date = new Date(p.updated ?? p.date);
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
