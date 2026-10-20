import { CartProvider } from "@/lib/cart-context";
import { ProductsProvider } from "@/lib/products-context";
import { getProductsByKeys } from "@/lib/products-data";
import CartDrawer from "@/components/CartDrawer";
import MetaPixel from "@/components/MetaPixel";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { META_PIXEL_ID, GA_MEASUREMENT_ID } from "@/lib/config";
import { LANDING_KEYS } from "@/app/promomani/packs";

/**
 * Igual que la de /promomani: fuera del grupo `(site)`, sin barra, sin pie y
 * sin el chat, con el carrito de la tienda para que el pedido termine en el
 * mismo WhatsApp.
 *
 * Trae los productos de las dos landings y no sólo el suyo: el carrito vive en
 * el navegador y es uno para todo el sitio, así que un pack que se agregó en
 * la otra landing tiene que poder nombrarse acá.
 */
export default async function LandingEnvioGratisManiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const products = await getProductsByKeys(LANDING_KEYS);

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
