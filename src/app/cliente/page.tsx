import React from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { formatCOP, formatFechaColombia } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";
import {
  Building2,
  Coffee,
  FileText,
  Calendar,
  CreditCard,
  Banknote,
  Download,
  LogOut,
  Sparkles,
} from "lucide-react";

export default async function ClientePortalPage() {
  // Datos de demostración del cliente
  const clienteInfo = {
    razonSocial: "Hospital Universitario San José",
    sede: "Sede Centro",
    contacto: "Dra. Claudia Pérez",
    whatsapp: "+573005559876",
  };

  const liquidaciones = [
    {
      id: "liq-1002",
      consecutivo: 1002,
      fecha: new Date().toISOString(),
      maquinaSerial: "MAQ-COL-2024-089",
      maquinaModelo: "Bianchi Soluble 4 Tolvas",
      ubicacion: "Cafetería Principal Piso 2",
      tazasNetas: 145,
      totalFacturado: 362500,
      metodoPago: "TRANSFERENCIA",
      pdfUrl: "/api/liquidaciones/liq-1002/pdf",
    },
    {
      id: "liq-1001",
      consecutivo: 1001,
      fecha: new Date(Date.now() - 7 * 86400000).toISOString(),
      maquinaSerial: "MAQ-COL-2024-089",
      maquinaModelo: "Bianchi Soluble 4 Tolvas",
      ubicacion: "Cafetería Principal Piso 2",
      tazasNetas: 182,
      totalFacturado: 455000,
      metodoPago: "EFECTIVO",
      pdfUrl: "/api/liquidaciones/liq-1001/pdf",
    },
  ];

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
              {clienteInfo.razonSocial}
            </h1>
            <p className="text-xs text-stone-500">
              {clienteInfo.sede} • Contacto: {clienteInfo.contacto}
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
          <span className="text-2xl font-black text-stone-900 dark:text-white">1</span>
          <span className="text-[11px] text-stone-500 block">Bianchi Soluble 4 Tolvas</span>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-xs text-stone-400 font-semibold block">Tazas Servidas este Mes</span>
          <span className="text-2xl font-black text-coffee-700 dark:text-amber-400">327</span>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Conteo oficial de contadores
          </span>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-xs text-stone-400 font-semibold block">Total Consumo Acumulado</span>
          <span className="text-2xl font-black text-stone-900 dark:text-white">
            {formatCOP(817500)}
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
                  Máquina: <strong className="text-stone-700 dark:text-stone-300">{l.maquinaSerial}</strong> ({l.ubicacion})
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px]">
                  <span>Tazas Netas: <strong>{l.tazasNetas}</strong></span>
                  <span>•</span>
                  <span>Total Facturado: <strong className="text-coffee-700 dark:text-amber-300">{formatCOP(l.totalFacturado)}</strong></span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-stone-600 dark:text-stone-300">
                    {l.metodoPago === "EFECTIVO" ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                    {l.metodoPago}
                  </span>
                </div>
              </div>

              <a
                href={l.pdfUrl}
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
      </div>
    </div>
  );
}
