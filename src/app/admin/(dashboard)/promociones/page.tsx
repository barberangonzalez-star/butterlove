import { getPromotions } from "@/lib/promotions-data";
import { getAdminProducts } from "@/lib/products-data";
import PromocionesAdminClient from "./PromocionesAdminClient";

export default async function PromocionesAdminPage() {
  const [promotions, products] = await Promise.all([
    getPromotions(),
    getAdminProducts(),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Promociones</h1>
      <PromocionesAdminClient promotions={promotions} products={products} />
    </div>
  );
}
