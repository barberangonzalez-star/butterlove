import { getPromotions } from "@/lib/promotions-data";
import PromocionesAdminClient from "./PromocionesAdminClient";

export default async function PromocionesAdminPage() {
  const promotions = await getPromotions();

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Promociones</h1>
      <PromocionesAdminClient promotions={promotions} />
    </div>
  );
}
