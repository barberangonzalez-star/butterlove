import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { posts, CATEGORY_LABEL, formatPostDateShort } from "@/lib/posts";
import { getProducts } from "@/lib/products-data";
import type { Product } from "@/lib/products";
import type { Post } from "@/lib/posts";
import JsonLd from "@/components/JsonLd";
import {
  blogSchema,
  breadcrumbSchema,
  BLOG_DESCRIPTION,
  BLOG_TITLE,
  RSS_PATH,
  OG_DEFAULTS,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: BLOG_TITLE,
  description: BLOG_DESCRIPTION,
  keywords: [
    "recetas con mantequilla de maní",
    "beneficios de los frutos secos",
    "desayunos saludables",
    "meriendas sin azúcar",
  ],
  alternates: {
    canonical: "/blog",
    // El feed permite que lectores y agregadores sigan el blog, y le da a
    // Google una segunda ruta de descubrimiento de las entradas nuevas.
    types: { "application/rss+xml": RSS_PATH },
  },
  openGraph: {
    ...OG_DEFAULTS,
    type: "website",
    url: "/blog",
    title: `${BLOG_TITLE} | Butter Love`,
    description: BLOG_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BLOG_TITLE} | Butter Love`,
    description: BLOG_DESCRIPTION,
  },
};

function PostCard({
  post,
  product,
}: {
  post: Post;
  product: Product | undefined;
}) {
  if (!product) return null;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="torn-card overflow-hidden flex flex-col bg-surface hover:bg-cream transition-colors group"
    >
      <div
        className={`relative ${product.bgClass} h-44 flex items-center justify-center`}
      >
        <span className="absolute top-3 left-3 z-10 bg-white/90 text-ink text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full">
          {CATEGORY_LABEL[post.category]}
        </span>
        {/* Burbujas decorativas, el mismo guiño que en las tarjetas de producto */}
        <span className="absolute left-5 bottom-6 w-2 h-2 rounded-full bg-white/50" />
        <span className="absolute right-7 top-1/2 w-2.5 h-2.5 rounded-full bg-white/40" />
        <div className="relative h-32 w-32">
          <Image
            src={product.image}
            alt={`Mantequilla de ${product.name} Butter Love`}
            fill
            sizes="(max-width: 640px) 40vw, 128px"
            className="object-contain drop-shadow-xl transition-transform duration-300 group-hover:-translate-y-1"
          />
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1 gap-2">
        <h3 className="font-display font-700 text-lg text-ink group-hover:underline">
          {post.title}
        </h3>
        <p className="text-sm text-ink-soft flex-1">{post.excerpt}</p>
        <p className="flex items-center gap-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
          <time dateTime={post.date}>{formatPostDateShort(post.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readTime}</span>
        </p>
      </div>
    </Link>
  );
}

export default async function BlogPage() {
  const products = await getProducts();
  const findProduct = (key: string) => products.find((p) => p.key === key);
  const beneficios = posts.filter((p) => p.category === "beneficios");
  const recetas = posts.filter((p) => p.category === "recetas");

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 py-12 sm:py-16">
      <JsonLd
        data={blogSchema(
          posts.map((post) => ({ post, product: findProduct(post.productKey) })),
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
      <h1 className="font-display font-700 text-4xl sm:text-5xl text-ink mb-3">
        Blog
      </h1>
      <p className="text-ink-soft max-w-lg mb-12">
        Beneficios de cada fruto seco y recetas fáciles y saludables para
        sacarle provecho a tu mantequilla favorita.
      </p>

      <h2
        id="beneficios"
        className="font-display font-700 text-2xl text-ink mb-5 scroll-mt-24"
      >
        Beneficios
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
        {beneficios.map((post) => (
          <PostCard
            key={post.slug}
            post={post}
            product={findProduct(post.productKey)}
          />
        ))}
      </div>

      <h2
        id="recetas"
        className="font-display font-700 text-2xl text-ink mb-5 scroll-mt-24"
      >
        Recetas
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {recetas.map((post) => (
          <PostCard
            key={post.slug}
            post={post}
            product={findProduct(post.productKey)}
          />
        ))}
      </div>

      <p className="mt-14 text-sm text-ink-soft">
        ¿Prefieres seguirnos desde tu lector?{" "}
        <a
          href={RSS_PATH}
          className="font-semibold text-ink underline underline-offset-4 hover:opacity-70"
        >
          Suscríbete al feed RSS
        </a>
        .
      </p>
    </div>
  );
}
