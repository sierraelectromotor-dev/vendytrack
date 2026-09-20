import React from "react";
import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import {
  Coffee,
  LayoutDashboard,
  Package,
  Truck,
  Building2,
  DollarSign,
  MapPin,
  LogOut,
  Smartphone,
  Shield,
  Users,
} from "lucide-react";

import { BotonReinicioSistema } from "@/components/admin/BotonReinicioSistema";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();
  const adminName = currentUser?.name || "Administrador";
  const initials = adminName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navItems = [
    { href: "/admin", label: "Dashboard / Recaudos", icon: LayoutDashboard },
    { href: "/admin/contabilidad", label: "Contabilidad y Gastos", icon: DollarSign },
    { href: "/admin/clientes", label: "Clientes y Máquinas", icon: Building2 },
    { href: "/admin/inventario", label: "Inventario Bodega", icon: Package },
    { href: "/admin/rutas", label: "Rutas y Asignaciones", icon: MapPin },
    { href: "/admin/ruteros", label: "Usuarios y Ruteros", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col md:flex-row text-stone-900 dark:text-stone-100">
      {/* Sidebar para pantallas medianas y grandes */}
      <aside className="w-full md:w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col justify-between shrink-0 shadow-sm">
        <div>
          {/* Logo y Marca */}
          <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-coffee-800 text-amber-300 rounded-xl flex items-center justify-center shadow-md">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-tight text-stone-900 dark:text-white leading-tight">
                  VendyTrack
                </h1>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" /> Portal Admin
                </span>
              </div>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/80 transition-colors group"
                >
                  <Icon className="w-4 h-4 text-stone-400 group-hover:text-coffee-600 dark:group-hover:text-amber-400 transition-colors" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Pie de Sidebar con acceso a Vista Móvil, Reinicio y Cerrar Sesión */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 space-y-1.5">
          <Link
            href="/"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-stone-500 hover:text-coffee-700 dark:hover:text-amber-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            <Smartphone className="w-4 h-4 text-stone-400" />
            <span>Vista Móvil (Rutero)</span>
          </Link>

          <BotonReinicioSistema />

          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors"
            >
              <LogOut className="w-4 h-4 text-stone-400" />
              <span>Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>Administración General</span>
            <span>•</span>
            <span className="font-semibold text-stone-900 dark:text-white">
              Vending Institucional
            </span>
          </div>

          <Link
            href="/admin/ruteros"
            className="flex items-center gap-3 text-xs p-1.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors group"
            title="Ver y editar perfil de administrador"
          >
            <div className="text-right hidden sm:block">
              <span className="font-bold text-stone-900 dark:text-white block group-hover:text-coffee-600 dark:group-hover:text-amber-400 transition-colors">
                {adminName}
              </span>
              <span className="text-[10px] text-stone-400">Administrador de Operaciones</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center border border-purple-300 shadow-sm">
              {initials}
            </div>
          </Link>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
