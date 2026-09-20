"use client";

import React, { useState } from "react";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Coffee,
  DollarSign,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PuntoEquilibrioData } from "@/actions/contabilidad";

interface PuntoEquilibrioCardProps {
  puntoEquilibrio: PuntoEquilibrioData;
  onConfigurarGastosFijos: () => void;
}

export const PuntoEquilibrioCard: React.FC<PuntoEquilibrioCardProps> = ({
  puntoEquilibrio,
  onConfigurarGastosFijos,
}) => {
  const [mostrarExplicacion, setMostrarExplicacion] = useState(false);

  const formatearDinero = (monto: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(monto);
  };

  const {
    gastosFijosTotales,
    ventasActuales,
    puntoEquilibrioDinero,
    tazasActuales,
    puntoEquilibrioTazas,
    porcentajeAlcanzado,
    diferenciaDinero,
    diferenciaTazas,
    estaEnEquilibrio,
    precioPromedioTaza,
    margenContribucionTaza,
    margenContribucionPct,
  } = puntoEquilibrio;

  // Si no hay gastos fijos configurados, mostramos una llamada a la acción
  if (gastosFijosTotales === 0) {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-md shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">
              Calculadora de Punto de Equilibrio (Break-Even)
            </h3>
            <p className="text-[11px] text-stone-500">
              Configura tus gastos fijos (arriendos, salarios base, servicios) para calcular cuántas tazas o pesos necesitas para empezar a generar ganancias netas.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onConfigurarGastosFijos}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs shadow-md transition-all shrink-0 active:scale-95"
        >
          ⚙️ Configurar Gastos Fijos
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Cabecera de la Tarjeta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md shrink-0 ${
              estaEnEquilibrio
                ? "bg-emerald-500 text-white"
                : "bg-amber-500 text-stone-950"
            }`}
          >
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                Punto de Equilibrio Operativo
              </h3>
              {estaEnEquilibrio ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px] flex items-center gap-1 border border-emerald-300/60 dark:border-emerald-800/60">
                  <CheckCircle2 className="w-3 h-3" /> ¡Superado! En Zona de Ganancia
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] flex items-center gap-1 border border-amber-300/60 dark:border-amber-800/60">
                  <AlertTriangle className="w-3 h-3" /> Faltan {formatearDinero(Math.abs(diferenciaDinero))}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-500">
              Basado en {formatearDinero(gastosFijosTotales)} de costos fijos mensuales
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onConfigurarGastosFijos}
          className="text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-4"
        >
          Ajustar Gastos Fijos ➔
        </button>
      </div>

      {/* Barra de Progreso del Punto de Equilibrio */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-stone-700 dark:text-stone-300">
            Progreso hacia el Punto de Equilibrio:
          </span>
          <span
            className={`font-black ${
              estaEnEquilibrio
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {porcentajeAlcanzado.toFixed(1)}% completado
          </span>
        </div>

        <div className="w-full h-3 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              estaEnEquilibrio ? "bg-emerald-500" : "bg-amber-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(3, porcentajeAlcanzado))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
          <span>$0 COP</span>
          <span>Meta: {formatearDinero(puntoEquilibrioDinero)}</span>
        </div>
      </div>

      {/* Métricas Comparativas: Dinero vs Tazas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Tarjeta En Dinero */}
        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200/60 dark:border-stone-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5 text-xs">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Punto de Equilibrio en Pesos ($)
            </span>
            <span className="text-[10px] text-stone-400 uppercase font-bold">
              COP
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-stone-400 block text-[10px]">Facturado Actual:</span>
              <span className="font-bold text-stone-900 dark:text-white">
                {formatearDinero(ventasActuales)}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px]">Meta de Equilibrio:</span>
              <span className="font-bold text-stone-900 dark:text-white">
                {formatearDinero(puntoEquilibrioDinero)}
              </span>
            </div>
          </div>

          <div className="pt-1 border-t border-stone-200 dark:border-stone-700 text-[11px] flex items-center justify-between">
            <span className="text-stone-500">
              {estaEnEquilibrio ? "Ganancia Neta sobre Fijo:" : "Faltante para cubrir:"}
            </span>
            <span
              className={`font-black ${
                estaEnEquilibrio
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {formatearDinero(Math.abs(diferenciaDinero))}
            </span>
          </div>
        </div>

        {/* Tarjeta En Tazas */}
        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200/60 dark:border-stone-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5 text-xs">
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              Punto de Equilibrio en Tazas
            </span>
            <span className="text-[10px] text-stone-400 uppercase font-bold">
              Bebidas
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-stone-400 block text-[10px]">Tazas Vendidas:</span>
              <span className="font-bold text-stone-900 dark:text-white">
                {tazasActuales.toLocaleString()} tazas
              </span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px]">Tazas Requeridas:</span>
              <span className="font-bold text-stone-900 dark:text-white">
                {puntoEquilibrioTazas.toLocaleString()} tazas
              </span>
            </div>
          </div>

          <div className="pt-1 border-t border-stone-200 dark:border-stone-700 text-[11px] flex items-center justify-between">
            <span className="text-stone-500">
              {estaEnEquilibrio ? "Tazas en Zona Ganancia:" : "Tazas Faltantes:"}
            </span>
            <span
              className={`font-black ${
                estaEnEquilibrio
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {Math.abs(diferenciaTazas).toLocaleString()} tazas
            </span>
          </div>
        </div>
      </div>

      {/* Explicación Matemática Desplegable */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setMostrarExplicacion(!mostrarExplicacion)}
          className="flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-stone-900 dark:hover:text-white font-semibold transition-colors"
        >
          <Info className="w-3.5 h-3.5 text-amber-500" />
          <span>¿Cómo se calculan estos valores?</span>
          {mostrarExplicacion ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {mostrarExplicacion && (
          <div className="mt-2 p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-[11px] text-stone-600 dark:text-stone-300 space-y-1.5 animate-in fade-in duration-200">
            <p>
              • <strong>Punto de Equilibrio en $</strong> = Costos Fijos ({formatearDinero(gastosFijosTotales)}) ÷ Margen de Contribución ({(margenContribucionPct * 100).toFixed(1)}%) = <strong>{formatearDinero(puntoEquilibrioDinero)}</strong>.
            </p>
            <p>
              • <strong>Punto de Equilibrio en Tazas</strong> = Costos Fijos ÷ Margen por Taza ({formatearDinero(margenContribucionTaza)}) = <strong>{puntoEquilibrioTazas.toLocaleString()} tazas</strong>.
            </p>
            <p className="text-stone-400 text-[10px] italic">
              * El margen por taza se obtiene restando el costo variable de insumos (café, leche, azúcar, vasos) del precio promedio de venta ({formatearDinero(precioPromedioTaza)}). Una vez superadas las {puntoEquilibrioTazas} tazas, cada bebida adicional aporta directamente a la utilidad neta de la empresa.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
