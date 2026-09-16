import { verifySession } from "@/lib/admin-session";
import { countPendingOrders } from "@/lib/pending-orders-data";
import { countPendingReviews } from "@/lib/reviews-data";
import AdminNav from "./_components/AdminNav";
import AdminAssistantShell from "./_components/AdminAssistantShell";

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

  // El marco lo arma el shell: el ancho del contenido depende de si el
  // asistente está abierto, y eso sólo se sabe en el navegador.
  return (
    <AdminAssistantShell
      nav={
        <AdminNav pendingCount={pendingCount} pendingReviews={pendingReviews} />
      }
    >
      {children}
    </AdminAssistantShell>
  );
}
