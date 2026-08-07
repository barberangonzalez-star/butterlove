import { ImageResponse } from "next/og";
import { getProducts } from "@/lib/products-data";
import { BLOG_DESCRIPTION } from "@/lib/seo";
import { OG_SIZE, CREAM, INK, ogImageSource } from "@/lib/og";

export const alt = "Blog de Butter Love — Beneficios y recetas con frutos secos";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function BlogOgImage() {
  const products = await getProducts();
  const jars = await Promise.all(
    products.slice(0, 4).map(async (product) => ({
      name: product.name,
      accent: product.accentHex,
      src: await ogImageSource(product.image),
    })),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CREAM,
          padding: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: INK,
              opacity: 0.65,
            }}
          >
            Butter Love · Blog
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.1,
              marginTop: 22,
            }}
          >
            Beneficios y recetas
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: INK,
              opacity: 0.75,
              lineHeight: 1.35,
              marginTop: 22,
              maxWidth: 900,
            }}
          >
            {BLOG_DESCRIPTION}
          </div>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          {jars.map((jar) => (
            <div
              key={jar.name}
              style={{
                flex: 1,
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: jar.accent,
                borderRadius: 40,
              }}
            >
              {/* `next/image` no existe dentro de ImageResponse: esto no es una
                  página, es un PNG que se dibuja en el build. */}
              {jar.src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={jar.src}
                  width={150}
                  height={150}
                  style={{ objectFit: "contain" }}
                  alt=""
                />
              )}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
