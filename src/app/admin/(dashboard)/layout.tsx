import { verifySession } from "@/lib/admin-session";
import AdminNav from "./_components/AdminNav";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-[#37352f]">
      <AdminNav />
      <div className="lg:pl-60">
        <main className="min-w-0 px-4 pt-[4.5rem] pb-12 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
