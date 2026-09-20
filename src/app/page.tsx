import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MobileLiquidacionForm } from "@/components/liquidacion/MobileLiquidacionForm";
import { RoleSwitcher } from "@/components/ui/RoleSwitcher";
import { logoutAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import {
  Coffee,
  Shield,
  ArrowRight,
  LogOut,
  Building,
} from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();

  // Si el usuario es de rol CLIENTE, redirigir a su portal de consumo
  if (user?.rol === "CLIENTE") {
    redirect("/cliente");
  }

  const isAdmin = user?.rol === "ADMIN";

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 py-3 sm:py-6">
      {/* Banner especial para Administrador */}
      {isAdmin && (
        <div className="max-w-lg mx-auto px-4 mb-3">
          <Link
            href="/admin/inventario"
            className="w-full flex items-center justify-between p-3 bg-purple-900 text-white rounded-2xl shadow-lg border border-purple-700/50 hover:bg-purple-800 transition-all text-xs group"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-300" />
              <div>
                <span className="font-bold block">Acceso a Panel Administrativo</span>
                <span className="text-[10px] text-purple-200">
                  Bodega, Rutas, Clientes y Tarifas
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-300 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      )}

      {/* Barra de navegación superior móvil */}
      <header className="max-w-lg mx-auto px-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-coffee-800 text-amber-300 rounded-xl flex items-center justify-center shadow-md shadow-coffee-950/20">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-stone-900 dark:text-white leading-tight">
              VendyTrack PWA
            </h1>
            <p className="text-[10px] text-stone-500 font-medium">
              Vercel Serverless Architecture
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RoleSwitcher />
          <form action={logoutAction}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="p-1.5 text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 bg-stone-200/70 dark:bg-stone-800 rounded-full transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </header>

      {/* Formulario Mobile de Liquidación en Campo */}
      <MobileLiquidacionForm initialMaquinaId="maq-demo-01" />
    </div>
  );
}
