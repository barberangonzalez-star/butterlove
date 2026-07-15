import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProductsGrid from "@/components/ProductsGrid";
import Story from "@/components/Story";
import HowToOrder from "@/components/HowToOrder";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ProductsGrid />
        <Story />
        <HowToOrder />
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
