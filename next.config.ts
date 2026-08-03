import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
