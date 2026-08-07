import type { Metadata } from "next";
import Hero from "@/components/Hero";
import ProductsGrid from "@/components/ProductsGrid";
import Story from "@/components/Story";
import HowToOrder from "@/components/HowToOrder";
import JsonLd from "@/components/JsonLd";
import { getProducts } from "@/lib/products-data";
import { productListSchema, breadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = {
  // Canónica explícita: evita que `/?utm_source=...` o `/?fbclid=...` se
  // indexen como páginas distintas y dividan la autoridad de la home.
  alternates: { canonical: "/" },
};

export default async function Home() {
  const products = await getProducts();

  return (
    <>
      <JsonLd data={productListSchema(products)} />
      <JsonLd data={breadcrumbSchema([{ name: "Inicio", path: "/" }])} />
      <Hero />
      <ProductsGrid />
      <Story />
      <HowToOrder />
    </>
  );
}
