"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Receipt,
  Tag,
  Truck,
  Users,
  Wallet,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { logout } from "../actions";
import InstallPrompt from "../../_pwa/InstallPrompt";
import PushToggle from "../../_pwa/PushToggle";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/inventario", label: "Inventario", icon: Boxes },
  { href: "/admin/ventas", label: "Ventas", icon: Receipt },
  { href: "/admin/mayoreo", label: "Mayoreo", icon: Truck },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/finanzas", label: "Finanzas", icon: Wallet },
  { href: "/admin/promociones", label: "Promociones", icon: Tag },
];

function NavLinks({
  onNavigate,
  pendingCount,
}: {
  onNavigate?: () => void;
  /** Pedidos de la tienda esperando confirmación. */
  pendingCount: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        // Las subpáginas marcan su sección: la ficha de un cliente deja
        // "Clientes" encendido. El dashboard se compara exacto porque su ruta
        // es prefijo de todas las demás.
        const active =
          href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-black/[0.06] text-[#37352f] font-medium"
                : "text-[#5f5e5b] hover:bg-black/5 hover:text-[#37352f]"
            }`}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
            {/* El contador sólo cuelga de Ventas, que es donde se atienden. */}
            {href === "/admin/ventas" && pendingCount > 0 && (
              <span className="ml-auto min-w-5 text-center text-[11px] font-medium bg-[#b4700a] text-white rounded-full px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function NavFooter() {
  return (
    <div className="px-3 pb-4">
      <PushToggle />
      <InstallPrompt />
      <form action={logout}>
        <button
          type="submit"
          className="w-full flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-[#5f5e5b] hover:bg-black/5 hover:text-[#37352f] transition-colors"
        >
          <LogOut size={16} strokeWidth={2} />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}

export default function AdminNav({ pendingCount }: { pendingCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Barra superior: sustituye al sidebar por debajo de lg, donde una
          columna fija de 240px dejaría sin ancho útil a las tablas. */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center gap-2 px-2 border-b border-black/10 bg-[#f7f6f4]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          className="w-11 h-11 shrink-0 flex items-center justify-center rounded-md text-[#37352f] hover:bg-black/5"
        >
          <Menu size={20} />
        </button>
        <span className="font-semibold text-sm truncate">
          🧈 Butter Love Admin
        </span>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-64 max-w-[82%] h-full bg-[#f7f6f4] border-r border-black/10 flex flex-col">
            <div className="pl-5 pr-2 h-14 flex items-center justify-between gap-2 border-b border-black/10">
              <span className="font-semibold text-sm truncate">
                🧈 Butter Love Admin
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-md hover:bg-black/5"
              >
                <X size={18} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} pendingCount={pendingCount} />
            <NavFooter />
          </div>
        </div>
      )}

      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-60 flex-col border-r border-black/10 bg-[#f7f6f4]">
        <div className="px-5 h-16 flex items-center border-b border-black/10">
          <span className="font-semibold text-sm">🧈 Butter Love Admin</span>
        </div>
        <NavLinks pendingCount={pendingCount} />
        <NavFooter />
      </aside>
    </>
  );
}
