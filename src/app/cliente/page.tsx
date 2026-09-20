import React from "react";
import prisma from "@/lib/prisma";
import { formatCOP, formatFechaColombia } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Building2,
  FileText,
  CreditCard,
  Banknote,
  Download,
  LogOut,
  Sparkles,
  Inbox,
} from "lucide-react";

export default async function ClientePortalPage() {
  const user = await getCurrentUser();

  if (!user || (user.rol !== "CLIENTE" && user.rol !== "ADMIN")) {
    redirect("/login");
  }

  // Buscar el cliente asociado en la base de datos
  let cliente = null;
  if (user.clienteId) {
    cliente = await prisma.cliente.findUnique({
      where: { id: user.clienteId },
      include: {
        maquinas: true,
        liquidaciones: {
          orderBy: { fecha: "desc" },
          include: { maquina: true },
        },
      },
    }).catch(() => null);
  }

  // Si no tiene clienteId directo o es admin revisando el portal
  if (!cliente) {
    cliente = await prisma.cliente.findFirst({
      include: {
        maquinas: true,
        liquidaciones: {
          orderBy: { fecha: "desc" },
          include: { maquina: true },
        },
      },
    }).catch(() => null);
  }

  const razonSocial = cliente?.razonSocial || user.name;
  const sede = cliente?.sede || "Sede Principal";
  const contacto = cliente?.contacto || user.name;
  const maquinas = cliente?.maquinas || [];
  const liquidaciones = cliente?.liquidaciones || [];

  const totalTazasServidas = liquidaciones.reduce((acc, l) => acc + (l.totalFacturado ? Number(l.totalFacturado) : 0), 0);
  const totalFacturadoAcumulado = liquidaciones.reduce((acc, l) => acc + (l.totalFacturado ? Number(l.totalFacturado) : 0), 0);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 py-4 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">
      {/* Cabecera del Portal Cliente */}
      <header className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-2xl flex items-center justify-center border border-blue-200">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-stone-900 dark:text-white leading-tight">
              {razonSocial}
            </h1>
            <p className="text-xs text-stone-500">
              {sede} • Contacto: {contacto}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200">
            Portal Cliente
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="p-2 text-stone-400 hover:text-rose-600 bg-stone-100 dark:bg-stone-800 rounded-xl transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Resumen de Máquinas y Consumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-xs text-stone-400 font-semibold block">Máquinas Instaladas</span>
          <span className="text-2xl font-black text-stone-900 dark:text-white">{maquinas.length}</span>
          <span className="text-[11px] text-stone-500 block">
            {maquinas.length > 0 ? maquinas[0].modelo : "Sin máquinas registradas"}
          </span>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-xs text-stone-400 font-semibold block">Liquidaciones Registradas</span>
          <span className="text-2xl font-black text-coffee-700 dark:text-amber-400">{liquidaciones.length}</span>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Historial auditado
          </span>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-xs text-stone-400 font-semibold block">Total Consumo Acumulado</span>
          <span className="text-2xl font-black text-stone-900 dark:text-white">
            {formatCOP(totalFacturadoAcumulado)}
          </span>
          <span className="text-[11px] text-stone-400 block">Liquidaciones al día</span>
        </div>
      </div>

      {/* Historial de Recibos y Liquidaciones */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-coffee-600 dark:text-amber-400" />
          Historial de Liquidaciones y Recibos Oficiales
        </h2>

        {liquidaciones.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Inbox className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto" />
            <p className="text-xs font-semibold text-stone-500">
              No hay liquidaciones registradas aún
            </p>
            <p className="text-[11px] text-stone-400">
              Tan pronto el operador de ruta registre una liquidación en tu sede, aparecerá aquí junto con su recibo oficial en PDF.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {liquidaciones.map((l) => (
              <div
                key={l.id}
                className="bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-stone-900 dark:text-white">
                      Liquidación LIQ-{l.consecutivo}
                    </span>
                    <span className="text-stone-400 text-[11px]">
                      • {formatFechaColombia(l.fecha)}
                    </span>
                  </div>
                  <p className="text-stone-500 text-[11px]">
                    Máquina: <strong className="text-stone-700 dark:text-stone-300">{l.maquina.codigoSerial}</strong> ({l.maquina.ubicacion})
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[11px]">
                    <span>Total Facturado: <strong className="text-coffee-700 dark:text-amber-300">{formatCOP(Number(l.totalFacturado))}</strong></span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-stone-600 dark:text-stone-300">
                      {l.metodoPago === "EFECTIVO" ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                      {l.metodoPago}
                    </span>
                  </div>
                </div>

                <a
                  href={`/api/liquidaciones/${l.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-coffee-800 hover:bg-coffee-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all self-start sm:self-auto shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Recibo (PDF)</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
