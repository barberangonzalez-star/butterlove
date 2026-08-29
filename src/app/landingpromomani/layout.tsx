import { CartProvider } from "@/lib/cart-context";
import { ProductsProvider } from "@/lib/products-context";
import { getProductsByKeys } from "@/lib/products-data";
import CartDrawer from "@/components/CartDrawer";
import MetaPixel from "@/components/MetaPixel";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { META_PIXEL_ID, GA_MEASUREMENT_ID } from "@/lib/config";
import { PACK_KEYS } from "./packs";

/**
 * La landing va fuera del grupo `(site)` a propósito: sin barra, sin pie y sin
 * el chat. Es una página de anuncio y todo lo que no sea comprar maní es una
 * salida. Lo único que se trae de la tienda es el carrito, para que el pedido
 * termine en el mismo WhatsApp de siempre.
 *
 * Los productos se piden por `key` y no con `getProducts()`: el trío no está
 * en la vitrina y esa lista no lo traería.
 */
export default async function LandingPromoManiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const products = await getProductsByKeys(PACK_KEYS);

  return (
    <ProductsProvider products={products}>
      <CartProvider>
        <MetaPixel pixelId={META_PIXEL_ID} />
        <GoogleAnalytics measurementId={GA_MEASUREMENT_ID} />
        <main className="flex-1">{children}</main>
        <CartDrawer />
      </CartProvider>
    </ProductsProvider>
  );
}
