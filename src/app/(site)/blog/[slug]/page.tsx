import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  posts,
  getPost,
  relatedPosts,
  formatPostDate,
  CATEGORY_LABEL,
} from "@/lib/posts";
import type { Post } from "@/lib/posts";
import type { Product } from "@/lib/products";
import { getProduct, getProducts } from "@/lib/products-data";
import JsonLd from "@/components/JsonLd";
import {
  recipeSchema,
  articleSchema,
  breadcrumbSchema,
  RSS_PATH,
  OG_DEFAULTS,
} from "@/lib/seo";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const url = `/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    alternates: {
      canonical: url,
      types: { "application/rss+xml": RSS_PATH },
    },
    openGraph: {
      ...OG_DEFAULTS,
      type: "article",
      url,
      title: `${post.title} | Butter Love`,
      description: post.excerpt,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: ["Butter Love"],
      section: CATEGORY_LABEL[post.category],
      tags: post.keywords,
      // Las imágenes no se declaran aquí a propósito: las aporta
      // `opengraph-image.tsx`, que genera una 1200x630 con el título del post.
      // Si se declararan aquí, esa tendría prioridad y volveríamos a compartir
      // la foto cuadrada del envase.
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | Butter Love`,
      description: post.excerpt,
    },
  };
}

function RelatedCard({
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
      className="torn-card overflow-hidden flex items-center gap-4 bg-white/70 hover:bg-white transition-colors p-4 group"
    >
      <div
        className={`relative shrink-0 w-16 h-16 rounded-2xl ${product.bgClass} flex items-center justify-center`}
      >
        <div className="relative w-11 h-11">
          <Image
            src={product.image}
            alt={`Mantequilla de ${product.name} Butter Love`}
            fill
            sizes="44px"
            className="object-contain drop-shadow-md"
          />
        </div>
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">
          {CATEGORY_LABEL[post.category]}
        </span>
        <p className="font-display font-700 text-sm text-ink leading-snug group-hover:underline">
          {post.title}
        </p>
      </div>
    </Link>
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const product = await getProduct(post.productKey);
  if (!product) notFound();

  // Las recetas usan schema Recipe (habilita el carrusel de recetas de Google,
  // con foto, tiempo e ingredientes); los posts de beneficios van como Article.
  const recipe = recipeSchema(post, product);

  const related = relatedPosts(post);
  const allProducts = await getProducts();
  const productFor = (key: string) => allProducts.find((p) => p.key === key);

  return (
    <article className="mx-auto max-w-2xl px-5 sm:px-8 py-12 sm:py-16">
      <JsonLd data={recipe ?? articleSchema(post, product)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />
      <Link
        href="/blog"
        className="text-xs font-bold uppercase tracking-widest text-ink-soft hover:text-ink w-fit block mb-6"
      >
        ← Volver al blog
      </Link>

      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
        {CATEGORY_LABEL[post.category]} · {post.readTime} de lectura
      </p>
      <h1 className="font-display font-700 text-3xl sm:text-4xl text-ink mt-2 mb-3">
        {post.title}
      </h1>
      {/* La fecha visible acompaña al `datePublished` del JSON-LD: Google
          contrasta ambas y muestra la fecha junto al resultado cuando coinciden. */}
      <p className="text-sm text-ink-soft mb-6">
        Publicado el{" "}
        <time dateTime={post.date}>{formatPostDate(post.date)}</time>
        {post.updated && post.updated !== post.date && (
          <>
            {" · Actualizado el "}
            <time dateTime={post.updated}>{formatPostDate(post.updated)}</time>
          </>
        )}
      </p>

      <div
        className={`torn-card ${product.bgClass} p-6 flex items-center gap-4 mb-8`}
      >
        <div className="relative w-20 h-20 shrink-0">
          <Image
            src={product.image}
            alt={`Mantequilla de ${product.name} Butter Love`}
            fill
            sizes="80px"
            className="object-contain drop-shadow-xl"
            priority
          />
        </div>
        <div>
          <p className="text-sm text-ink/80">Hecha con</p>
          <Link
            href={`/productos/${product.key}`}
            className="font-display font-700 text-lg text-ink hover:underline"
          >
            Mantequilla de {product.name}
          </Link>
        </div>
      </div>

      <div className="text-ink leading-relaxed">
        {post.intro.map((paragraph, i) => (
          <p key={i} className="text-lg mb-4">
            {paragraph}
          </p>
        ))}

        {post.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="font-display font-700 text-xl text-ink mb-2">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="mb-3">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      {post.recipe && (
        <div className="mt-10 grid sm:grid-cols-2 gap-8">
          <div>
            <h2 className="font-display font-700 text-xl text-ink mb-1">
              Ingredientes
            </h2>
            <p className="text-xs text-ink-soft mb-3">
              {post.recipe.time} · {post.recipe.servings}
            </p>
            <ul className="space-y-2 text-sm text-ink-soft">
              {post.recipe.ingredients.map((ing) => (
                <li key={ing}>• {ing}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display font-700 text-xl text-ink mb-1">
              Preparación
            </h2>
            <p className="text-xs text-ink-soft mb-3">&nbsp;</p>
            <ol className="space-y-2 text-sm text-ink-soft list-decimal list-inside">
              {post.recipe.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-ink/10 flex items-center justify-between flex-wrap gap-4">
        <p className="text-ink-soft text-sm max-w-xs">
          Prepara esta {post.category === "recetas" ? "receta" : "combinación"}{" "}
          con mantequilla de {product.name} 100% natural, sin azúcar agregada.
        </p>
        <Link
          href={`/productos/${product.key}`}
          className="rounded-full bg-ink text-cream px-6 py-3 font-bold text-sm uppercase tracking-wide hover:opacity-85 transition-opacity"
        >
          Comprar mantequilla de {product.name}
        </Link>
      </div>

      {related.length > 0 && (
        <div className="mt-12 pt-8 border-t border-ink/10">
          <h2 className="font-display font-700 text-xl text-ink mb-5">
            Sigue leyendo
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.map((p) => (
              <RelatedCard
                key={p.slug}
                post={p}
                product={productFor(p.productKey)}
              />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
