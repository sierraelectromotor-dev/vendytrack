"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  DollarSign,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Banknote,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { crearTransaccion } from "@/actions/contabilidad";

interface RegistrarTransaccionModalProps {
  onClose: () => void;
  tipoInicial?: "GASTO" | "INGRESO";
}

const CATEGORIAS_GASTOS = [
  { value: "COMBUSTIBLE_TRANSPORTE", label: "Combustible y Transporte" },
  { value: "COMPRA_INSUMOS", label: "Compra de Insumos (Café, Leche, etc.)" },
  { value: "MANTENIMIENTO_REPUESTOS", label: "Mantenimiento y Repuestos" },
  { value: "VIATICOS_ALIMENTACION", label: "Viáticos y Alimentación Ruteros" },
  { value: "NOMINA_HONORARIOS", label: "Nómina y Honorarios" },
  { value: "SERVICIOS_ARRIENDO", label: "Servicios Públicos y Arriendo" },
  { value: "PUBLICIDAD_MARKETING", label: "Publicidad y Mercadeo" },
  { value: "OTRO_GASTO", label: "Otros Gastos Operativos" },
];

const CATEGORIAS_INGRESOS = [
  { value: "VENTA_DIRECTA", label: "Venta Directa / Eventos" },
  { value: "OTRO_INGRESO", label: "Otros Ingresos Extraordinarios" },
];

export const RegistrarTransaccionModal: React.FC<RegistrarTransaccionModalProps> = ({
  onClose,
  tipoInicial = "GASTO",
}) => {
  const [tipo, setTipo] = useState<"GASTO" | "INGRESO">(tipoInicial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fecha por defecto en formato YYYY-MM-DD
  const hoyStr = new Date().toISOString().split("T")[0];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.set("tipo", tipo);

    startTransition(async () => {
      const res = await crearTransaccion(formData);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setError(res.error || "Error al registrar la transacción");
      }
    });
  };

  const categorias = tipo === "GASTO" ? CATEGORIAS_GASTOS : CATEGORIAS_INGRESOS;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-md ${
                tipo === "GASTO"
                  ? "bg-rose-500 text-white"
                  : "bg-emerald-500 text-white"
              }`}
            >
              {tipo === "GASTO" ? (
                <TrendingDown className="w-5 h-5" />
              ) : (
                <TrendingUp className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-sm">
                {tipo === "GASTO" ? "Registrar Gasto Operativo" : "Registrar Ingreso"}
              </h3>
              <p className="text-[11px] text-stone-500">
                Lleva el control de los flujos de dinero de la operación
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Tipo (Pestañas) */}
        <div className="p-4 pb-0">
          <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setTipo("GASTO")}
              className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                tipo === "GASTO"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Gasto Operativo</span>
            </button>
            <button
              type="button"
              onClick={() => setTipo("INGRESO")}
              className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                tipo === "INGRESO"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Ingreso Extra</span>
            </button>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Transacción registrada con éxito</span>
            </div>
          )}

          {/* Categoría */}
          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Categoría de la Transacción *
            </label>
            <select
              name="categoria"
              required
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-amber-500 font-semibold text-stone-900 dark:text-stone-100"
            >
              {categorias.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Monto ($ COP) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">
                  $
                </span>
                <input
                  type="number"
                  name="monto"
                  required
                  min="1"
                  step="any"
                  placeholder="ej. 85000"
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-7 pr-3 py-2.5 outline-none focus:border-amber-500 font-bold text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Fecha de la Transacción *
              </label>
              <input
                type="date"
                name="fecha"
                required
                defaultValue={hoyStr}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-amber-500 text-stone-900 dark:text-white"
              />
            </div>
          </div>

          {/* Método de Pago y Referencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Método de Pago *
              </label>
              <select
                name="metodoPago"
                defaultValue="EFECTIVO"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-amber-500 font-semibold"
              >
                <option value="EFECTIVO">💵 Efectivo</option>
                <option value="TRANSFERENCIA">💳 Transferencia Bancaria</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                # Factura / Recibo / Soporte
              </label>
              <input
                type="text"
                name="referencia"
                placeholder="ej. FAC-89421 o Vale #12"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Descripción / Concepto del Gasto *
            </label>
            <textarea
              name="descripcion"
              required
              rows={2}
              placeholder="ej. Tanqueada camión ruta norte o compra de 20 bolsas de café..."
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`px-5 py-2 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 ${
                tipo === "GASTO"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{tipo === "GASTO" ? "Guardar Gasto" : "Guardar Ingreso"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
