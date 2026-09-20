"use client";

import React, { useState, useTransition } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Calendar,
  Filter,
  Search,
  Trash2,
  FileText,
  CreditCard,
  Banknote,
  PieChart,
  Percent,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  ResumenContable,
  TransaccionUnificada,
  eliminarTransaccion,
  obtenerResumenContable,
} from "@/actions/contabilidad";
import { RegistrarTransaccionModal } from "./RegistrarTransaccionModal";

interface ContabilidadViewProps {
  initialData: ResumenContable;
  mesInicial: number;
  anioInicial: number;
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function ContabilidadView({
  initialData,
  mesInicial,
  anioInicial,
}: ContabilidadViewProps) {
  const [data, setData] = useState<ResumenContable>(initialData);
  const [mes, setMes] = useState(mesInicial);
  const [anio, setAnio] = useState(anioInicial);

  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "INGRESO" | "GASTO">("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoModal, setTipoModal] = useState<"GASTO" | "INGRESO">("GASTO");

  const [isPending, startTransition] = useTransition();

  const handleCambioPeriodo = (nuevoMes: number, nuevoAnio: number) => {
    setMes(nuevoMes);
    setAnio(nuevoAnio);

    startTransition(async () => {
      const res = await obtenerResumenContable({ mes: nuevoMes, anio: nuevoAnio });
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const handleEliminar = (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este registro contable?")) return;

    startTransition(async () => {
      const res = await eliminarTransaccion(id);
      if (res.success) {
        // Recargar datos del periodo
        const updated = await obtenerResumenContable({ mes, anio });
        if (updated.success && updated.data) {
          setData(updated.data);
        }
      } else {
        alert(res.error || "Error al eliminar");
      }
    });
  };

  const formatearDinero = (monto: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(monto);
  };

  // Filtrar transacciones para la tabla
  const transaccionesFiltradas = data.transacciones.filter((t) => {
    const matchTipo = filtroTipo === "TODOS" || t.tipo === filtroTipo;
    const matchBusqueda =
      busqueda.trim() === "" ||
      t.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.categoriaLabel.toLowerCase().includes(busqueda.toLowerCase()) ||
      (t.referencia && t.referencia.toLowerCase().includes(busqueda.toLowerCase()));
    return matchTipo && matchBusqueda;
  });

  return (
    <div className="space-y-6 text-xs">
      {/* Cabecera y Filtro de Período */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Contabilidad y Flujo de Caja
          </h2>
          <p className="text-stone-500 text-xs">
            Control de ingresos por liquidaciones, gastos operativos y estado de resultados (P&L)
          </p>
        </div>

        {/* Selector de Período y Botones de Acción */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector Mes / Año */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={mes}
              onChange={(e) => handleCambioPeriodo(parseInt(e.target.value), anio)}
              className="bg-transparent font-bold text-stone-800 dark:text-stone-200 outline-none cursor-pointer text-xs"
            >
              {MESES.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={anio}
              onChange={(e) => handleCambioPeriodo(mes, parseInt(e.target.value))}
              className="bg-transparent font-bold text-stone-800 dark:text-stone-200 outline-none cursor-pointer text-xs"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Botones Registrar */}
          <button
            type="button"
            onClick={() => {
              setTipoModal("GASTO");
              setModalAbierto(true);
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>+ Registrar Gasto</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTipoModal("INGRESO");
              setModalAbierto(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+ Ingreso Extra</span>
          </button>
        </div>
      </div>

      {/* KPI Cards de Finanzas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingresos */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 font-bold uppercase tracking-wider text-[10px]">
              Total Ingresos
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {formatearDinero(data.totalIngresos)}
            </span>
            <p className="text-[10px] text-stone-400 mt-0.5">
              Liquidaciones + ventas directas
            </p>
          </div>
        </div>

        {/* Total Gastos */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 font-bold uppercase tracking-wider text-[10px]">
              Total Gastos
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">
              {formatearDinero(data.totalGastos)}
            </span>
            <p className="text-[10px] text-stone-400 mt-0.5">
              Combustible, insumos, nómina, etc.
            </p>
          </div>
        </div>

        {/* Utilidad Neta (P&L) */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 font-bold uppercase tracking-wider text-[10px]">
              Utilidad Neta (P&L)
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                data.utilidadNeta >= 0
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                  : "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span
              className={`text-xl font-black ${
                data.utilidadNeta >= 0
                  ? "text-stone-900 dark:text-white"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatearDinero(data.utilidadNeta)}
            </span>
            <p className="text-[10px] text-stone-400 mt-0.5">
              Ingresos menos gastos totales
            </p>
          </div>
        </div>

        {/* Margen Operativo */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 font-bold uppercase tracking-wider text-[10px]">
              Margen Operativo
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">
              {data.margenOperativo.toFixed(1)}%
            </span>
            <p className="text-[10px] text-stone-400 mt-0.5">
              Rentabilidad sobre ventas
            </p>
          </div>
        </div>
      </div>

      {/* Desglose de Gastos por Categoría y Métodos de Pago */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución de Gastos */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-600" />
              Distribución de Gastos Operativos
            </h3>
            <span className="text-stone-400 text-[11px]">
              Total: {formatearDinero(data.totalGastos)}
            </span>
          </div>

          {data.desgloseGastos.length > 0 ? (
            <div className="space-y-3">
              {data.desgloseGastos.map((item) => (
                <div key={item.categoria} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {item.label}
                    </span>
                    <span className="font-bold text-stone-900 dark:text-white">
                      {formatearDinero(item.monto)} ({item.porcentaje.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, item.porcentaje)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-stone-400 italic">
              No hay gastos registrados en este período.
            </div>
          )}
        </div>

        {/* Métodos de Pago (Recaudos) */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-600" />
            Flujo por Método de Pago
          </h3>

          <div className="space-y-3">
            <div className="p-3.5 bg-emerald-50/50 dark:bg-stone-800/60 border border-emerald-200/60 dark:border-stone-700 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  💵
                </div>
                <div>
                  <span className="font-bold text-stone-900 dark:text-white block text-xs">
                    Efectivo
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Caja física / recaudadores
                  </span>
                </div>
              </div>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                {formatearDinero(data.metodosPago.efectivo)}
              </span>
            </div>

            <div className="p-3.5 bg-blue-50/50 dark:bg-stone-800/60 border border-blue-200/60 dark:border-stone-700 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  💳
                </div>
                <div>
                  <span className="font-bold text-stone-900 dark:text-white block text-xs">
                    Transferencia
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Bancos / Nequi / Daviplata
                  </span>
                </div>
              </div>
              <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                {formatearDinero(data.metodosPago.transferencia)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla Unificada de Transacciones */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden space-y-0">
        {/* Controles de la Tabla */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/60 dark:bg-stone-950/40">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">
              Historial de Transacciones ({transaccionesFiltradas.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Buscador */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por concepto o #..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs outline-none focus:border-amber-500"
              />
            </div>

            {/* Filtro Tipo */}
            <div className="flex items-center gap-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFiltroTipo("TODOS")}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filtroTipo === "TODOS"
                    ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo("INGRESO")}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filtroTipo === "INGRESO"
                    ? "bg-emerald-600 text-white"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Ingresos
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo("GASTO")}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filtroTipo === "GASTO"
                    ? "bg-rose-600 text-white"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Gastos
              </button>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-stone-100/70 dark:bg-stone-800/40 text-stone-500 uppercase font-bold border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Concepto / Descripción</th>
                <th className="p-3">Referencia</th>
                <th className="p-3">Método</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
              {transaccionesFiltradas.length > 0 ? (
                transaccionesFiltradas.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
                  >
                    <td className="p-3 whitespace-nowrap text-stone-500 font-mono">
                      {new Date(t.fecha).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {t.tipo === "INGRESO" ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-900/60">
                          + Ingreso
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold border border-rose-200/60 dark:border-rose-900/60">
                          - Gasto
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-stone-800 dark:text-stone-200">
                      {t.categoriaLabel}
                    </td>
                    <td className="p-3 text-stone-600 dark:text-stone-300 max-w-xs truncate">
                      {t.descripcion}
                    </td>
                    <td className="p-3 whitespace-nowrap text-stone-500 font-mono">
                      {t.referencia || "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium">
                        {t.metodoPago}
                      </span>
                    </td>
                    <td
                      className={`p-3 whitespace-nowrap text-right font-bold ${
                        t.tipo === "INGRESO"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {t.tipo === "INGRESO" ? "+" : "-"}
                      {formatearDinero(t.monto)}
                    </td>
                    <td className="p-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {t.esLiquidacion && t.reciboPdfUrl && (
                          <a
                            href={t.reciboPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg text-coffee-700 dark:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            title="Ver Comprobante PDF"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {!t.esLiquidacion && (
                          <button
                            type="button"
                            onClick={() => handleEliminar(t.id)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Eliminar Transacción"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-stone-400 italic">
                    No se encontraron transacciones en este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro */}
      {modalAbierto && (
        <RegistrarTransaccionModal
          tipoInicial={tipoModal}
          onClose={() => {
            setModalAbierto(false);
            // Recargar datos
            startTransition(async () => {
              const res = await obtenerResumenContable({ mes, anio });
              if (res.success && res.data) {
                setData(res.data);
              }
            });
          }}
        />
      )}
    </div>
  );
}
