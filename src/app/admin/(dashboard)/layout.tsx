import { verifySession } from "@/lib/admin-session";
import { countPendingOrders } from "@/lib/pending-orders-data";
import { countPendingReviews } from "@/lib/reviews-data";
import AdminNav from "./_components/AdminNav";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();

  // Los contadores viven en el layout para que se vean desde cualquier pantalla
  // del panel: un pedido o una reseña esperando no debería depender de que a
  // alguien se le ocurra entrar a Ventas o a Reseñas.
  const [pendingCount, pendingReviews] = await Promise.all([
    countPendingOrders(),
    countPendingReviews(),
  ]);

  return (
    <div className="min-h-dvh bg-[#fbfaf8] text-[#37352f]">
      <AdminNav pendingCount={pendingCount} pendingReviews={pendingReviews} />
      <div className="lg:pl-60">
        <main className="min-w-0 px-4 pt-[4.5rem] pb-12 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
