import type { Metadata } from "next";
import Link from "next/link";
import { posts } from "@/lib/posts";
import { getProduct } from "@/lib/products";

export const metadata: Metadata = {
  title: "Blog | Butter Love",
  description:
    "Beneficios y recetas fáciles con mantequillas de maní, pistacho, almendras y merey.",
};

function PostCard({ post }: { post: (typeof posts)[number] }) {
  const product = getProduct(post.productKey);
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="torn-card overflow-hidden flex flex-col bg-white/70 hover:bg-white transition-colors"
    >
      <div className={`h-2 ${product.bgClass}`} />
      <div className="p-5 flex flex-col flex-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-2">
          {post.category === "beneficios" ? "Beneficios" : "Receta"} ·{" "}
          {post.readTime}
        </span>
        <h3 className="font-display font-700 text-lg text-ink mb-2">
          {post.title}
        </h3>
        <p className="text-sm text-ink-soft flex-1">{post.excerpt}</p>
      </div>
    </Link>
  );
}

export default function BlogPage() {
  const beneficios = posts.filter((p) => p.category === "beneficios");
  const recetas = posts.filter((p) => p.category === "recetas");

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 py-12 sm:py-16">
      <h1 className="font-display font-700 text-4xl sm:text-5xl text-ink mb-3">
        Blog
      </h1>
      <p className="text-ink-soft max-w-lg mb-12">
        Beneficios de cada fruto seco y recetas fáciles y saludables para
        sacarle provecho a tu mantequilla favorita.
      </p>

      <h2 className="font-display font-700 text-2xl text-ink mb-5">
        Beneficios
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
        {beneficios.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      <h2 className="font-display font-700 text-2xl text-ink mb-5">
        Recetas
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {recetas.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}
