import type { MetadataRoute } from "next";
import { products } from "@/lib/products";
import { posts } from "@/lib/posts";
import { SITE_URL } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/productos/${p.key}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const blogPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/blog`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...productPages,
    ...blogPages,
  ];
}
