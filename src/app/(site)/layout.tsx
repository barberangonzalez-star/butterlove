import { CartProvider } from "@/lib/cart-context";
import { ProductsProvider } from "@/lib/products-context";
import { getProducts } from "@/lib/products-data";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import FloatingNav from "@/components/FloatingNav";
import ChatWidget from "@/components/ChatWidget";
import JsonLd from "@/components/JsonLd";
import MetaPixel from "@/components/MetaPixel";
import { organizationSchema, websiteSchema } from "@/lib/seo";
import { META_PIXEL_ID } from "@/lib/config";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const products = await getProducts();

  return (
    <ProductsProvider products={products}>
      <CartProvider>
        {/* Identidad de la marca y del sitio, en todas las páginas públicas.
            El panel /admin queda fuera a propósito: va con noindex. */}
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        <MetaPixel pixelId={META_PIXEL_ID} />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartDrawer />
        <FloatingNav />
        <ChatWidget />
      </CartProvider>
    </ProductsProvider>
  );
}
