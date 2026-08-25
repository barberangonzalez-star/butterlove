import type { Metadata } from "next";
import Hero from "@/components/Hero";
import ProductsGrid from "@/components/ProductsGrid";
import Story from "@/components/Story";
import HowToOrder from "@/components/HowToOrder";
import JsonLd from "@/components/JsonLd";
import { getProducts, getProductsByKeys } from "@/lib/products-data";
import { productListSchema, breadcrumbSchema } from "@/lib/seo";
import { HERO_ANNOUNCEMENT_KEY } from "@/lib/config";

export const metadata: Metadata = {
  // Canónica explícita: evita que `/?utm_source=...` o `/?fbclid=...` se
  // indexen como páginas distintas y dividan la autoridad de la home.
  alternates: { canonical: "/" },
};

export default async function Home() {
  const products = await getProducts();
  // El sabor que anuncia el banner es de encargo: no está en la vitrina, así
  // que se pide por `key` aparte. Si no existe, el carrusel sale sin anuncio.
  const [announcement] = await getProductsByKeys([HERO_ANNOUNCEMENT_KEY]);

  return (
    <>
      <JsonLd data={productListSchema(products)} />
      <JsonLd data={breadcrumbSchema([{ name: "Inicio", path: "/" }])} />
      <Hero announcement={announcement} />
      <ProductsGrid />
      <Story />
      <HowToOrder />
    </>
  );
}
