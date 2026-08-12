import { getCustomers } from "@/lib/customers-data";
import ClientesAdminClient from "./ClientesAdminClient";

export default async function ClientesAdminPage() {
  const customers = await getCustomers();

  const withPurchases = customers.filter((c) => c.stats.orders > 0).length;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Clientes</h1>
      <p className="text-sm text-[#787774] mb-6">
        {customers.length} en la libreta · {withPurchases} con compras
        registradas
      </p>

      <ClientesAdminClient customers={customers} />
    </div>
  );
}
