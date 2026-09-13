import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `src/lib/og.ts` arma la ruta de la imagen en tiempo de ejecución, así que el
  // trazado no sabe qué archivo va a leer y mete todo `public` (videos incluidos)
  // dentro de cada función del blog. Eso infla el "Functions Storage" de Vercel
  // en cada deploy. El servidor sólo lee `public/products`; lo demás lo sirve el CDN.
  outputFileTracingExcludes: {
    "/*": [
      "public/videos/**/*",
      "public/hero/**/*",
      "public/icons/**/*",
      "public/*.{html,js,webmanifest,svg,png,jpg,jpeg}",
    ],
  },
  async headers() {
    return [
      {
        // El service worker no se cachea: así un deploy nuevo se aplica en la
        // siguiente visita en vez de quedarse pegado en el teléfono.
        source: "/admin-sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
