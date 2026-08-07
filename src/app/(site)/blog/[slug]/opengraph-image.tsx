import { ImageResponse } from "next/og";
import { posts, getPost, CATEGORY_LABEL } from "@/lib/posts";
import { getProduct } from "@/lib/products-data";
import { OG_SIZE, CREAM, INK, ogImageSource } from "@/lib/og";

// Una imagen por entrada, con el título del post en grande. Antes se compartía
// la foto cuadrada del envase, que las plataformas recortaban y que no decía de
// qué trataba el enlace.
export const alt = "Butter Love — Blog de mantequillas de frutos secos";
export const size = OG_SIZE;
export const contentType = "image/png";

// Sin esto la imagen se generaría a demanda en la primera petición; los bots de
// WhatsApp y Facebook no esperan, así que se prerenderiza junto con el post.
export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function BlogPostOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  const product = post ? await getProduct(post.productKey) : undefined;

  const accent = product?.accentHex ?? "#f3b94d";
  const jar = product ? await ogImageSource(product.image) : null;
  const title = post?.title ?? "Butter Love";
  // La columna de texto mide ~650px: un título largo pasa a tres líneas y se
  // come el aire del pie. Se baja el cuerpo por tramos para que ninguno lo haga.
  const titleSize = title.length <= 32 ? 68 : title.length <= 46 ? 56 : 48;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: CREAM,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 64,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex" }}>
              <div
                style={{
                  display: "flex",
                  background: accent,
                  color: INK,
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  padding: "12px 30px",
                  borderRadius: 999,
                }}
              >
                {post ? CATEGORY_LABEL[post.category] : "Blog"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                fontSize: titleSize,
                fontWeight: 700,
                color: INK,
                lineHeight: 1.1,
                marginTop: 34,
              }}
            >
              {title}
            </div>

            {post && (
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  color: INK,
                  opacity: 0.75,
                  lineHeight: 1.35,
                  marginTop: 26,
                }}
              >
                {post.excerpt}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 26,
              color: INK,
              opacity: 0.7,
              // `space-between` no deja hueco cuando el texto llena la columna;
              // este margen garantiza la separación mínima con el resumen.
              marginTop: 36,
            }}
          >
            <div style={{ display: "flex", fontWeight: 700 }}>Butter Love</div>
            <div style={{ display: "flex" }}>·</div>
            <div style={{ display: "flex" }}>butterlove.store</div>
          </div>
        </div>

        <div
          style={{
            width: 420,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: accent,
          }}
        >
          {/* `next/image` no existe dentro de ImageResponse: esto no es una
              página, es un PNG que se dibuja en el build. */}
          {jar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={jar}
              width={330}
              height={330}
              style={{ objectFit: "contain" }}
              alt=""
            />
          )}
        </div>
      </div>
    ),
    size,
  );
}
