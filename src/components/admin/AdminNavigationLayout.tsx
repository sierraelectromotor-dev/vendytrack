"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import {
  Coffee,
  LayoutDashboard,
  Package,
  PackagePlus,
  Truck,
  Building2,
  DollarSign,
  MapPin,
  LogOut,
  Smartphone,
  Shield,
  Users,
  Menu,
  X,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { BotonReinicioSistema } from "@/components/admin/BotonReinicioSistema";

interface AdminNavigationLayoutProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    rol: string;
    empresaId: string;
  } | null;
  empresaNombre: string;
  children: React.ReactNode;
}

export function AdminNavigationLayout({
  currentUser,
  empresaNombre,
  children,
}: AdminNavigationLayoutProps) {
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const pathname = usePathname();

  const adminName = currentUser?.name || "Administrador";
  const initials = adminName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Cerrar drawer automáticamente al cambiar de ruta
  useEffect(() => {
    setDrawerAbierto(false);
  }, [pathname]);

  // Prevenir scroll en body cuando el drawer móvil está abierto
  useEffect(() => {
    if (drawerAbierto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerAbierto]);

  // Manejar tecla Escape para cerrar drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerAbierto) {
        setDrawerAbierto(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerAbierto]);

  // Grupos de Navegación
  const operacionesNav = [
    { href: "/admin", label: "Dashboard General", icon: LayoutDashboard },
    { href: "/admin/inventario", label: "Inventario y Bodegas", icon: Package },
    { href: "/admin/produccion", label: "Producción y Recetas", icon: PackagePlus },
    { href: "/admin/despachos", label: "Órdenes de Despacho", icon: Truck },
    { href: "/admin/rutas", label: "Rutas y Asignaciones", icon: MapPin },
    { href: "/admin/clientes", label: "Clientes y Máquinas", icon: Building2 },
  ];

  const finanzasNav = [
    { href: "/admin/cartera", label: "Cartera y Cobros", icon: DollarSign },
    { href: "/admin/contabilidad", label: "Contabilidad y Gastos", icon: DollarSign },
    { href: "/admin/ruteros", label: "Usuarios y Personal", icon: Users },
    ...(currentUser?.rol === "SUPERADMIN"
      ? [{ href: "/superadmin", label: "Panel Super Admin", icon: Shield }]
      : []),
  ];

  const esRutaActiva = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col md:flex-row text-stone-900 dark:text-stone-100">
      {/* ======================================================== */}
      {/* 1. BARRA SUPERIOR MÓVIL (Solo visible en pantallas < md) */}
      {/* ======================================================== */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerAbierto(true)}
            className="p-2 -ml-1 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 active:scale-95 transition-all focus:outline-hidden"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5 text-stone-800 dark:text-stone-200" />
          </button>

          <Link href="/admin" className="flex items-center gap-2 active:scale-95 transition-transform">
            <div className="w-8 h-8 bg-coffee-800 text-amber-300 rounded-xl flex items-center justify-center shadow-xs">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-sm tracking-tight text-stone-900 dark:text-white">
                  VendyTrack
                </span>
                <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-900/40">
                  Admin
                </span>
              </div>
              <span className="text-[10px] text-stone-400 truncate max-w-[150px] block font-medium">
                {empresaNombre}
              </span>
            </div>
          </Link>
        </div>

        {/* Perfil rápido en esquina superior derecha */}
        <Link
          href="/admin/ruteros"
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Ver perfil de usuario"
        >
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center border border-purple-300 dark:border-purple-800 shadow-2xs">
            {initials}
          </div>
        </Link>
      </header>

      {/* ======================================================== */}
      {/* 2. MENÚ DESPLEGABLE MÓVIL (DRAWER SLIDE-OVER)            */}
      {/* ======================================================== */}
      {/* Backdrop oscuro */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden transition-opacity duration-300 ${
          drawerAbierto
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerAbierto(false)}
        aria-hidden="true"
      />

      {/* Contenedor del Drawer deslizante */}
      <div
        className={`fixed inset-y-0 left-0 w-[84vw] max-w-xs bg-white dark:bg-stone-900 z-50 shadow-2xl flex flex-col justify-between border-r border-stone-200 dark:border-stone-800 md:hidden transition-transform duration-300 ease-in-out ${
          drawerAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Cabecera del Drawer */}
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-950/40 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-coffee-800 text-amber-300 rounded-xl flex items-center justify-center shadow-xs">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-sm tracking-tight text-stone-900 dark:text-white leading-tight">
                  VendyTrack
                </h2>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" /> Portal Admin
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDrawerAbierto(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tarjeta de Usuario Activo en Móvil */}
          <div className="p-3 border-b border-stone-100 dark:border-stone-800/80 bg-white dark:bg-stone-900 shrink-0">
            <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-700/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center border border-purple-300 shadow-2xs shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-stone-900 dark:text-white truncate block">
                  {adminName}
                </span>
                <span className="text-[10px] text-stone-400 truncate block">
                  {empresaNombre}
                </span>
              </div>
            </div>
          </div>

          {/* Lista de Enlaces de Navegación con Scroll */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
            {/* Sección Operaciones */}
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                Operaciones y Rutas
              </span>
              <div className="space-y-0.5">
                {operacionesNav.map((item) => {
                  const Icon = item.icon;
                  const activo = esRutaActiva(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerAbierto(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        activo
                          ? "bg-coffee-50 dark:bg-coffee-950/60 text-coffee-800 dark:text-amber-300 font-bold border-l-4 border-coffee-700 dark:border-amber-400 shadow-2xs"
                          : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            activo
                              ? "text-coffee-700 dark:text-amber-400"
                              : "text-stone-400"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {activo && (
                        <div className="w-1.5 h-1.5 rounded-full bg-coffee-600 dark:bg-amber-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sección Finanzas y Control */}
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                Finanzas y Control
              </span>
              <div className="space-y-0.5">
                {finanzasNav.map((item) => {
                  const Icon = item.icon;
                  const activo = esRutaActiva(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerAbierto(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        activo
                          ? "bg-coffee-50 dark:bg-coffee-950/60 text-coffee-800 dark:text-amber-300 font-bold border-l-4 border-coffee-700 dark:border-amber-400 shadow-2xs"
                          : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            activo
                              ? "text-coffee-700 dark:text-amber-400"
                              : "text-stone-400"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {activo && (
                        <div className="w-1.5 h-1.5 rounded-full bg-coffee-600 dark:bg-amber-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Pie del Drawer Móvil */}
          <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 space-y-2 shrink-0">
            <Link
              href="/rutero"
              onClick={() => setDrawerAbierto(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-coffee-700 dark:hover:text-amber-300 hover:bg-white dark:hover:bg-stone-800 border border-stone-200/80 dark:border-stone-700/80 transition-colors shadow-2xs"
            >
              <Smartphone className="w-4 h-4 text-stone-400" />
              <span>Vista Móvil (Rutero)</span>
            </Link>

            {currentUser?.rol === "SUPERADMIN" && <BotonReinicioSistema />}

            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Cerrar Sesión</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. SIDEBAR ESCRITORIO (Solo visible en pantallas md+)     */}
      {/* ======================================================== */}
      <aside className="hidden md:flex flex-col justify-between w-64 lg:w-72 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 h-screen sticky top-0 shrink-0 shadow-xs z-30">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo y Marca */}
          <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
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

          {/* Menú de Navegación con Scroll */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
            {/* Sección Operaciones */}
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                Operaciones y Rutas
              </span>
              <div className="space-y-0.5">
                {operacionesNav.map((item) => {
                  const Icon = item.icon;
                  const activo = esRutaActiva(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                        activo
                          ? "bg-coffee-50 dark:bg-coffee-950/60 text-coffee-800 dark:text-amber-300 font-bold border-l-4 border-coffee-700 dark:border-amber-400 shadow-2xs"
                          : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            activo
                              ? "text-coffee-600 dark:text-amber-400"
                              : "text-stone-400 group-hover:text-coffee-600 dark:group-hover:text-amber-400"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {activo && (
                        <div className="w-1.5 h-1.5 rounded-full bg-coffee-600 dark:bg-amber-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sección Finanzas y Control */}
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                Finanzas y Control
              </span>
              <div className="space-y-0.5">
                {finanzasNav.map((item) => {
                  const Icon = item.icon;
                  const activo = esRutaActiva(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                        activo
                          ? "bg-coffee-50 dark:bg-coffee-950/60 text-coffee-800 dark:text-amber-300 font-bold border-l-4 border-coffee-700 dark:border-amber-400 shadow-2xs"
                          : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            activo
                              ? "text-coffee-600 dark:text-amber-400"
                              : "text-stone-400 group-hover:text-coffee-600 dark:group-hover:text-amber-400"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {activo && (
                        <div className="w-1.5 h-1.5 rounded-full bg-coffee-600 dark:bg-amber-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Pie de Sidebar Escritorio */}
          <div className="p-3 border-t border-stone-200 dark:border-stone-800 space-y-1.5 shrink-0 bg-stone-50/50 dark:bg-stone-950/40">
            <Link
              href="/rutero"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-stone-500 hover:text-coffee-700 dark:hover:text-amber-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <Smartphone className="w-4 h-4 text-stone-400" />
              <span>Vista Móvil (Rutero)</span>
            </Link>

            {currentUser?.rol === "SUPERADMIN" && <BotonReinicioSistema />}

            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4 text-stone-400" />
                <span>Cerrar Sesión</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 4. CONTENIDO PRINCIPAL Y HEADER DE ESCRITORIO           */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header solo para pantallas md+ */}
        <header className="hidden md:flex bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-6 py-3.5 items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              Administración General
            </span>
            <span>•</span>
            <span className="font-bold text-coffee-700 dark:text-amber-400">
              {empresaNombre}
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

        {/* Contenedor de la página con padding responsive */}
        <div className="p-3 sm:p-5 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
