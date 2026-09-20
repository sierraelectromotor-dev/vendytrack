"use client";

import React, { useState, useTransition } from "react";
import {
  AlertOctagon,
  Wrench,
  Package,
  DollarSign,
  User,
  Coffee,
  CheckCircle2,
  Clock,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  VisitaExtraordinariaItem,
  cancelarVisitaExtraordinaria,
} from "@/actions/visitas";

interface VisitasExtraordinariasListProps {
  visitas: VisitaExtraordinariaItem[];
  onVisitaCancelada?: () => void;
}

export const VisitasExtraordinariasList: React.FC<VisitasExtraordinariasListProps> = ({
  visitas,
  onVisitaCancelada,
}) => {
  const [filtro, setFiltro] = useState<"TODAS" | "PENDIENTE" | "COMPLETADA">("PENDIENTE");
  const [isPending, startTransition] = useTransition();

  const visitasFiltradas = visitas.filter((v) => {
    if (filtro === "TODAS") return true;
    return v.estado === filtro;
  });

  const handleCancelar = (id: string) => {
    if (!confirm("¿Deseas cancelar esta orden de visita extraordinaria?")) return;

    startTransition(async () => {
      const res = await cancelarVisitaExtraordinaria(id);
      if (res.success && onVisitaCancelada) {
        onVisitaCancelada();
      }
    });
  };

  if (visitas.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">
              Visitas Extraordinarias y Soporte en Curso ({visitas.length})
            </h3>
            <p className="text-[11px] text-stone-500">
              Atención de fallas técnicas, falta de insumos y visitas complementarias
            </p>
          </div>
        </div>

        {/* Filtro */}
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setFiltro("PENDIENTE")}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filtro === "PENDIENTE"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            Pendientes ({visitas.filter((v) => v.estado === "PENDIENTE").length})
          </button>
          <button
            type="button"
            onClick={() => setFiltro("COMPLETADA")}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filtro === "COMPLETADA"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            Resueltas ({visitas.filter((v) => v.estado === "COMPLETADA").length})
          </button>
          <button
            type="button"
            onClick={() => setFiltro("TODAS")}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filtro === "TODAS"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            Todas ({visitas.length})
          </button>
        </div>
      </div>

      {/* Lista de Visitas */}
      <div className="space-y-2.5">
        {visitasFiltradas.length > 0 ? (
          visitasFiltradas.map((v) => {
            const esPendiente = v.estado === "PENDIENTE";

            return (
              <div
                key={v.id}
                className={`p-4 rounded-xl border transition-all ${
                  esPendiente
                    ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40"
                    : "bg-stone-50 dark:bg-stone-800/40 border-stone-200/60 dark:border-stone-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-stone-900 dark:text-white">
                      Orden #{v.consecutivo}
                    </span>

                    {/* Badge de Tipo */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 ${
                        v.tipo === "FALLA_TECNICA"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
                          : v.tipo === "REPOSICION_URGENTE"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                      }`}
                    >
                      {v.tipo === "FALLA_TECNICA" && <Wrench className="w-3 h-3" />}
                      {v.tipo === "REPOSICION_URGENTE" && <Package className="w-3 h-3" />}
                      {v.tipo === "SEGUNDA_LIQUIDACION" && <DollarSign className="w-3 h-3" />}
                      {v.tipoLabel}
                    </span>

                    {/* Badge Prioridad */}
                    {v.prioridad === "URGENTE" && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold">
                        🚨 URGENTE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Badge Estado */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        esPendiente
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                      }`}
                    >
                      {esPendiente ? "⏳ Pendiente" : "✓ Completada"}
                    </span>

                    {esPendiente && (
                      <button
                        type="button"
                        onClick={() => handleCancelar(v.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                        title="Cancelar Orden de Visita"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-stone-600 dark:text-stone-300">
                  <div>
                    <span className="text-stone-400 block text-[10px]">Máquina / Punto:</span>
                    <strong className="text-stone-900 dark:text-white">
                      {v.maquinaSerial} ({v.clienteNombre})
                    </strong>
                    <span className="block text-stone-500 text-[10px]">
                      {v.clienteSede} • {v.maquinaUbicacion}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[10px]">Operador Asignado:</span>
                    <strong className="text-stone-900 dark:text-white">
                      👤 {v.operadorNombre}
                    </strong>
                    <span className="block text-stone-500 text-[10px]">
                      📍 {v.clienteDireccion}
                    </span>
                  </div>

                  <div className="sm:col-span-2 md:col-span-1">
                    <span className="text-stone-400 block text-[10px]">Reporte del Cliente:</span>
                    <p className="font-semibold text-stone-800 dark:text-stone-200 italic">
                      "{v.motivoReporte}"
                    </p>
                    {v.solucionAplicada && (
                      <p className="text-emerald-700 dark:text-emerald-400 text-[10px] mt-0.5">
                        ✓ Solución: {v.solucionAplicada}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-stone-400 italic bg-stone-50 dark:bg-stone-800/30 rounded-xl">
            No hay visitas en este estado.
          </div>
        )}
      </div>
    </div>
  );
};
