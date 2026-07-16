import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { posts, getPost } from "@/lib/posts";
import { getProduct } from "@/lib/products";

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

  return {
    title: `${post.title} | Butter Love`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const product = getProduct(post.productKey);

  return (
    <article className="mx-auto max-w-2xl px-5 sm:px-8 py-12 sm:py-16">
      <Link
        href="/blog"
        className="text-xs font-bold uppercase tracking-widest text-ink-soft hover:text-ink w-fit inline-block mb-6"
      >
        ← Volver al blog
      </Link>

      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
        {post.category === "beneficios" ? "Beneficios" : "Receta"} ·{" "}
        {post.readTime}
      </span>
      <h1 className="font-display font-700 text-3xl sm:text-4xl text-ink mt-2 mb-6">
        {post.title}
      </h1>

      <div className={`torn-card ${product.bgClass} p-6 flex items-center gap-4 mb-8`}>
        <div className="relative w-20 h-20 shrink-0">
          <Image
            src={product.image}
            alt={`Mantequilla de ${product.name} Butter Love`}
            fill
            sizes="80px"
            className="object-contain drop-shadow-xl"
          />
        </div>
        <div>
          <p className="text-sm text-ink/80">Hecha con</p>
          <p className="font-display font-700 text-lg text-ink">
            Mantequilla de {product.name}
          </p>
        </div>
      </div>

      <div className="space-y-4 text-ink leading-relaxed">
        {post.body.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {post.recipe && (
        <div className="mt-8 grid sm:grid-cols-2 gap-8">
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
    </article>
  );
}
