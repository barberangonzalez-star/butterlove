import { getAdminProducts } from "@/lib/products-data";
import CotizadorClient from "./CotizadorClient";

export default async function CotizadorPage() {
  const products = await getAdminProducts();

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Cotizador</h1>
      <p className="text-sm text-[#787774] mb-6">
        Arma el pedido, elige la zona y copia la cotización para pegarla en el
        chat.
      </p>
      <CotizadorClient products={products} />
    </div>
  );
}
