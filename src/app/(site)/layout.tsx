import { CartProvider } from "@/lib/cart-context";
import { ProductsProvider } from "@/lib/products-context";
import { getProducts } from "@/lib/products-data";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import FloatingNav from "@/components/FloatingNav";
import ChatWidget from "@/components/ChatWidget";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const products = await getProducts();

  return (
    <ProductsProvider products={products}>
      <CartProvider>
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
