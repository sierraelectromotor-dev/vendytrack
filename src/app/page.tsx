import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { MobileLiquidacionForm } from "@/components/liquidacion/MobileLiquidacionForm";
import { logoutAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import {
  Coffee,
  Shield,
  ArrowRight,
  LogOut,
  Truck,
  PlusCircle,
  Package,
} from "lucide-react";
import { obtenerVisitasExtraordinarias } from "@/actions/visitas";

export default async function HomePage() {
  const user = await getCurrentUser();

  // Si el usuario es de rol CLIENTE, redirigir a su portal de consumo
  if (user?.rol === "CLIENTE") {
    redirect("/cliente");
  }

  const isAdmin = user?.rol === "ADMIN";

  // Buscar rutas asignadas al operador
  let rutaIds: string[] = [];
  if (user?.id) {
    const rutasAsignadas = await prisma.ruta
      .findMany({
        where: { operadorId: user.id, activa: true },
        select: { id: true },
      })
      .catch(() => []);
    rutaIds = rutasAsignadas.map((r) => r.id);
  }

  // Buscar máquinas activas con cliente asignado
  let maquinas: any[] = [];
  if (rutaIds.length > 0) {
    maquinas = await prisma.maquina
      .findMany({
        where: {
          activa: true,
          clienteId: { not: null },
          rutaId: { in: rutaIds },
        },
        include: {
          cliente: true,
          ruta: true,
          liquidaciones: {
            orderBy: { fecha: "desc" },
            take: 1,
            include: { detalles: true },
          },
        },
        orderBy: { codigoSerial: "asc" },
      })
      .catch(() => []);
  }

  // Si no tiene ruta asignada o es Admin, consultar todas las máquinas activas
  if (maquinas.length === 0) {
    maquinas = await prisma.maquina
      .findMany({
        where: {
          activa: true,
          clienteId: { not: null },
        },
        include: {
          cliente: true,
          ruta: true,
          liquidaciones: {
            orderBy: { fecha: "desc" },
            take: 1,
            include: { detalles: true },
          },
        },
        orderBy: { codigoSerial: "asc" },
      })
      .catch(() => []);
  }

  // Consultar visitas extraordinarias activas y catálogo de insumos para reposición
  const [visitasExtraRes, insumos] = await Promise.all([
    obtenerVisitasExtraordinarias({ estado: "PENDIENTE" }),
    prisma.insumo.findMany({
      select: { id: true, nombre: true, unidadMedida: true, stockActual: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

  const maquinasRuta = maquinas.map((m) => {
    const ultimaLiq = m.liquidaciones[0];
    const liquidadaHoy = ultimaLiq ? new Date(ultimaLiq.fecha) >= inicioHoy : false;
    const ultimoTotalTazas = ultimaLiq
      ? ultimaLiq.detalles.reduce((acc: number, d: any) => acc + (d.tazasNetas || 0), 0)
      : null;

    return {
      id: m.id,
      codigoSerial: m.codigoSerial,
      modelo: m.modelo,
      ubicacion: m.ubicacion,
      clienteNombre: m.cliente ? `${m.cliente.razonSocial} (${m.cliente.sede})` : "Sin Cliente",
      clienteWhatsapp: m.cliente?.whatsapp || null,
      rutaNombre: m.ruta?.nombre || "Sin Ruta Asignada",
      liquidadaHoy,
      ultimaLiquidacionId: ultimaLiq ? ultimaLiq.id : null,
      ultimaLiquidacionFecha: ultimaLiq ? ultimaLiq.fecha.toISOString() : null,
      ultimoTotalFacturado: ultimaLiq ? Number(ultimaLiq.totalFacturado) : null,
      ultimoConsecutivo: ultimaLiq ? ultimaLiq.consecutivo : null,
      ultimoMetodoPago: ultimaLiq ? (ultimaLiq.metodoPago as "EFECTIVO" | "TRANSFERENCIA") : null,
      ultimoTotalTazas,
      ultimoReciboPdfUrl: ultimaLiq?.reciboPdfUrl || (ultimaLiq ? `/api/liquidaciones/${ultimaLiq.id}/pdf` : null),
    };
  });

  const primeraMaquina = maquinas[0] || null;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 py-3 sm:py-6">
      {/* Banner especial para Administrador */}
      {isAdmin && (
        <div className="max-w-lg mx-auto px-4 mb-3">
          <Link
            href="/admin"
            className="w-full flex items-center justify-between p-3 bg-purple-900 text-white rounded-2xl shadow-lg border border-purple-700/50 hover:bg-purple-800 transition-all text-xs group"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-300" />
              <div>
                <span className="font-bold block">Acceso a Panel Administrativo</span>
                <span className="text-[10px] text-purple-200">
                  Dashboard, Recaudos, Clientes y Bodega
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
              PowerBy SierraElectromotor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge de usuario autenticado (Solo lectura - no modificable) */}
          <div className="px-2.5 py-1 rounded-full text-[11px] font-bold border bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 flex items-center gap-1.5 shadow-sm">
            {isAdmin ? (
              <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            ) : (
              <Truck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span className="truncate max-w-[110px]">
              {user?.name || (isAdmin ? "Admin" : "Operador")}
            </span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="p-1.5 text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full transition-colors shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </header>

      {/* Si no hay máquinas configuradas todavía */}
      {!primeraMaquina ? (
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
              <Coffee className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-stone-900 dark:text-white">
                Sistema listo para configurar
              </h2>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                {isAdmin
                  ? "No hay máquinas de café registradas aún. Comienza creando tus insumos en bodega, clientes y máquinas desde el panel administrativo."
                  : "No hay máquinas asignadas para liquidar en este momento. Comunícate con el administrador para que te asigne una ruta."}
              </p>
            </div>

            {isAdmin && (
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/admin/clientes"
                  className="w-full py-2.5 px-4 bg-coffee-800 hover:bg-coffee-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Crear Primer Cliente y Máquina</span>
                </Link>
                <Link
                  href="/admin/inventario"
                  className="w-full py-2.5 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Package className="w-4 h-4" />
                  <span>Configurar Insumos de Bodega</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Formulario Mobile de Liquidación en Campo con máquina real */
        <MobileLiquidacionForm
          initialMaquinaId={primeraMaquina.id}
          maquinasRuta={maquinasRuta}
          visitasExtraordinarias={visitasExtraRes.data || []}
          insumosDisponibles={insumos.map((i) => ({
            id: i.id,
            nombre: i.nombre,
            unidadMedida: i.unidadMedida,
            stockActual: Number(i.stockActual),
          }))}
        />
      )}
    </div>
  );
}
