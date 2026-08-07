import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/seo";

// Imagen que se ve al compartir el sitio por WhatsApp, Instagram o Facebook.
// Sin esto el enlace sale como texto plano, y eso baja mucho el clic.
export const alt =
  "Butter Love — Mantequillas de maní, pistacho, almendras y merey";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Colores de la marca (los mismos de globals.css).
const CREAM = "#f4efda";
const INK = "#1e4356";
const FLAVORS = [
  { name: "Maní", color: "#f3b94d" },
  { name: "Pistacho", color: "#b7d96b" },
  { name: "Almendras", color: "#f5a8c4" },
  { name: "Merey", color: "#a9dce8" },
];

export default function OpenGraphImage() {
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
          padding: 72,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 30,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: INK,
              opacity: 0.65,
              marginBottom: 24,
            }}
          >
            Untado real · 100% natural
          </div>
          <div
            style={{
              fontSize: 108,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.05,
            }}
          >
            Butter Love
          </div>
          <div
            style={{
              fontSize: 38,
              color: INK,
              opacity: 0.8,
              marginTop: 24,
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {FLAVORS.map((flavor) => (
            <div
              key={flavor.name}
              style={{
                display: "flex",
                alignItems: "center",
                background: flavor.color,
                color: INK,
                fontSize: 28,
                fontWeight: 700,
                padding: "16px 32px",
                borderRadius: 999,
              }}
            >
              {flavor.name}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
