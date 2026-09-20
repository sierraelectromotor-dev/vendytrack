"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  Settings,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Calendar,
  Building,
} from "lucide-react";
import {
  GastoFijoItem,
  guardarGastoFijo,
  eliminarGastoFijo,
} from "@/actions/contabilidad";

interface GastosFijosModalProps {
  gastosFijos: GastoFijoItem[];
  onClose: () => void;
  onUpdated?: () => void;
}

const CATEGORIAS_GASTOS = [
  { value: "SERVICIOS_ARRIENDO", label: "Servicios Públicos y Arriendos" },
  { value: "NOMINA_HONORARIOS", label: "Nómina y Salarios Base" },
  { value: "MANTENIMIENTO_REPUESTOS", label: "Mantenimiento Fijo Preventivo" },
  { value: "PUBLICIDAD_MARKETING", label: "Software / Plataformas / Marketing" },
  { value: "VIATICOS_ALIMENTACION", label: "Viáticos Fijos" },
  { value: "OTRO_GASTO", label: "Otros Gastos Fijos" },
];

export const GastosFijosModal: React.FC<GastosFijosModalProps> = ({
  gastosFijos,
  onClose,
  onUpdated,
}) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Formulario nuevo gasto fijo
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const formatearDinero = (monto: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(monto);
  };

  const totalFijoMensual = gastosFijos
    .filter((gf) => gf.activo)
    .reduce((acc, gf) => acc + gf.monto, 0);

  const handleCrear = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await guardarGastoFijo(formData);
      if (res.success) {
        setSuccess(true);
        setMostrarFormulario(false);
        if (onUpdated) onUpdated();
      } else {
        setError(res.error || "Error al guardar el gasto fijo");
      }
    });
  };

  const handleEliminar = (id: string) => {
    if (!confirm("¿Deseas eliminar este gasto fijo mensual?")) return;

    startTransition(async () => {
      const res = await eliminarGastoFijo(id);
      if (res.success) {
        if (onUpdated) onUpdated();
      } else {
        alert(res.error || "Error al eliminar");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-md">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-sm">
                Estructura de Gastos Fijos Mensuales
              </h3>
              <p className="text-[11px] text-stone-500">
                Costos independientes de las ventas (base para el punto de equilibrio)
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

        {/* Tarjeta de Resumen Total Fijo */}
        <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Total Costos Fijos Mensuales
            </span>
            <span className="text-lg font-black text-amber-900 dark:text-amber-300">
              {formatearDinero(totalFijoMensual)} / mes
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{mostrarFormulario ? "Cancelar" : "+ Nuevo Gasto Fijo"}</span>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Gasto fijo guardado exitosamente</span>
            </div>
          )}

          {/* Formulario desplegable para agregar nuevo gasto fijo */}
          {mostrarFormulario && (
            <form
              onSubmit={handleCrear}
              className="p-4 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl space-y-3 animate-in fade-in duration-200"
            >
              <h4 className="font-bold text-stone-900 dark:text-white text-xs flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                Registrar Nuevo Costo Fijo Recurrente
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Concepto del Gasto Fijo *
                  </label>
                  <input
                    type="text"
                    name="concepto"
                    required
                    placeholder="ej. Arriendo Bodega Central"
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Monto Mensual ($ COP) *
                  </label>
                  <input
                    type="number"
                    name="monto"
                    required
                    min="1"
                    placeholder="ej. 1500000"
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Categoría *
                  </label>
                  <select
                    name="categoria"
                    defaultValue="SERVICIOS_ARRIENDO"
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-amber-500 font-semibold"
                  >
                    {CATEGORIAS_GASTOS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Día Sugerido de Cobro / Pago
                  </label>
                  <input
                    type="number"
                    name="diaCobro"
                    min="1"
                    max="31"
                    defaultValue="1"
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Notas / Descripción (Opcional)
                </label>
                <input
                  type="text"
                  name="descripcion"
                  placeholder="ej. Pago mensual arriendo por transferencia bancaria..."
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMostrarFormulario(false)}
                  className="px-3 py-1.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Guardar Gasto Fijo</span>
                </button>
              </div>
            </form>
          )}

          {/* Listado de Gastos Fijos Existentes */}
          <div className="space-y-2">
            <h4 className="font-bold text-stone-900 dark:text-white text-xs">
              Gastos Fijos Activos ({gastosFijos.length})
            </h4>

            {gastosFijos.length > 0 ? (
              <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
                {gastosFijos.map((gf) => (
                  <div
                    key={gf.id}
                    className="p-3.5 bg-white dark:bg-stone-900 flex items-center justify-between gap-3 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 dark:text-white">
                          {gf.concepto}
                        </span>
                        <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-md text-[10px] font-medium">
                          {gf.categoriaLabel}
                        </span>
                      </div>
                      {gf.descripcion && (
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {gf.descripcion}
                        </p>
                      )}
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        Día {gf.diaCobro} de cada mes
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-black text-sm text-stone-900 dark:text-white">
                        {formatearDinero(gf.monto)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEliminar(gf.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Eliminar Gasto Fijo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-stone-400 italic bg-stone-50 dark:bg-stone-800/30 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700">
                Aún no has registrado ningún gasto fijo. Haz clic en "+ Nuevo Gasto Fijo" para ingresar arriendos, nómina base o servicios.
              </div>
            )}
          </div>
        </div>

        {/* Pie */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-bold rounded-xl transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
