import { verifySession } from "@/lib/admin-session";
import { countPendingOrders } from "@/lib/pending-orders-data";
import AdminNav from "./_components/AdminNav";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();

  // El contador vive en el layout para que se vea desde cualquier pantalla del
  // panel: un pedido esperando no debería depender de que a alguien se le
  // ocurra entrar a Ventas.
  const pendingCount = await countPendingOrders();

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-[#37352f]">
      <AdminNav pendingCount={pendingCount} />
      <div className="lg:pl-60">
        <main className="min-w-0 px-4 pt-[4.5rem] pb-12 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
