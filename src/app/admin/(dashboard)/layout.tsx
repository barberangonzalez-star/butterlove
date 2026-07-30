import Link from "next/link";
import { LayoutDashboard, Package, Boxes, Receipt, Tag, LogOut } from "lucide-react";
import { verifySession } from "@/lib/admin-session";
import { logout } from "./actions";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/inventario", label: "Inventario", icon: Boxes },
  { href: "/admin/ventas", label: "Ventas", icon: Receipt },
  { href: "/admin/promociones", label: "Promociones", icon: Tag },
];

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();

  return (
    <div className="min-h-screen flex bg-[#fbfaf8] text-[#37352f]">
      <aside className="w-60 shrink-0 border-r border-black/10 bg-[#f7f6f4] flex flex-col">
        <div className="px-5 h-16 flex items-center border-b border-black/10">
          <span className="font-semibold text-sm">🧈 Butter Love Admin</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[#5f5e5b] hover:bg-black/5 hover:text-[#37352f] transition-colors"
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="px-3 pb-4">
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[#5f5e5b] hover:bg-black/5 hover:text-[#37352f] transition-colors"
          >
            <LogOut size={16} strokeWidth={2} />
            Cerrar sesión
          </button>
        </form>
      </aside>
      <main className="flex-1 min-w-0 px-8 py-8">{children}</main>
    </div>
  );
}
