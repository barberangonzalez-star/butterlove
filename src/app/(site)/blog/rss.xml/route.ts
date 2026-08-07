import { posts, CATEGORY_LABEL, type Post } from "@/lib/posts";
import {
  absoluteUrl,
  BLOG_DESCRIPTION,
  BLOG_TITLE,
  RSS_PATH,
  SITE_NAME,
} from "@/lib/seo";

// El feed es contenido estático: se genera en el build y se sirve desde la CDN.
export const dynamic = "force-static";

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ENTITIES[c]);

/**
 * El cuerpo del post como HTML, para que los lectores muestren la entrada
 * completa. Va dentro de un CDATA, así que el texto se escapa como HTML (no
 * como XML): dentro de CDATA el parser no toca nada y lo que queda es lo que el
 * lector interpreta como marcado.
 */
function postHtml(post: Post): string {
  const blocks = [
    ...post.intro.map((p) => `<p>${escape(p)}</p>`),
    ...post.sections.flatMap((section) => [
      `<h2>${escape(section.heading)}</h2>`,
      ...section.paragraphs.map((p) => `<p>${escape(p)}</p>`),
    ]),
  ];

  if (post.recipe) {
    blocks.push(
      "<h2>Ingredientes</h2>",
      `<p>${escape(`${post.recipe.time} · ${post.recipe.servings}`)}</p>`,
      `<ul>${post.recipe.ingredients.map((i) => `<li>${escape(i)}</li>`).join("")}</ul>`,
      "<h2>Preparación</h2>",
      `<ol>${post.recipe.steps.map((s) => `<li>${escape(s)}</li>`).join("")}</ol>`,
    );
  }

  return blocks.join("");
}

function item(post: Post): string {
  const url = absoluteUrl(`/blog/${post.slug}`);
  // RFC 822 es el formato de fecha que exige RSS 2.0.
  const pubDate = new Date(`${post.date}T00:00:00Z`).toUTCString();

  return `    <item>
      <title>${escape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escape(CATEGORY_LABEL[post.category])}</category>
      <description>${escape(post.excerpt)}</description>
      <content:encoded><![CDATA[${postHtml(post)}]]></content:encoded>
    </item>`;
}

export function GET() {
  // Del más reciente al más antiguo, que es lo que espera un lector de feeds.
  const ordered = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  const lastBuild = ordered[0]
    ? new Date(`${ordered[0].updated ?? ordered[0].date}T00:00:00Z`).toUTCString()
    : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escape(`${BLOG_TITLE} | ${SITE_NAME}`)}</title>
    <link>${absoluteUrl("/blog")}</link>
    <description>${escape(BLOG_DESCRIPTION)}</description>
    <language>es-VE</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${absoluteUrl(RSS_PATH)}" rel="self" type="application/rss+xml" />
${ordered.map(item).join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
