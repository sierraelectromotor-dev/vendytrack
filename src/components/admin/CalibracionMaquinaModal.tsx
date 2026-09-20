"use client";

import React, { useState } from "react";
import { BEBIDAS_CATALOGO } from "@/types/liquidacion";
import { guardarCalibracionMaquina } from "@/actions/admin";
import {
  Sliders,
  X,
  Save,
  Loader2,
  CheckCircle2,
  Scale,
  Package,
} from "lucide-react";

export interface BebidaConfigItem {
  bebida: string;
  activa: boolean;
  contadorInicial?: number;
  ultimoContador?: number;
  insumoId?: string | null;
  insumoNombre?: string | null;
  gramosPorTaza?: number;
  gramosCafe?: number;
  gramosLeche?: number;
  gramosCocoa?: number;
  precio: number;
}

export interface InsumoOption {
  id: string;
  nombre: string;
  codigo: string;
  unidadMedida: string;
}

interface CalibracionMaquinaModalProps {
  maquinaId: string;
  codigoSerial: string;
  modelo: string;
  numeroProductos: number;
  configuracionesIniciales: BebidaConfigItem[];
  insumos?: InsumoOption[];
  onClose: () => void;
}

export const CalibracionMaquinaModal: React.FC<CalibracionMaquinaModalProps> = ({
  maquinaId,
  codigoSerial,
  modelo,
  numeroProductos,
  configuracionesIniciales,
  insumos = [],
  onClose,
}) => {
  const defaultGramajes: Record<string, { precio: number; gramos: number }> = {
    CAFE_LARGO_TINTO: { precio: 1800, gramos: 2.2 },
    CAFE_CORTO_EXPRESO: { precio: 1800, gramos: 2.0 },
    CAPUCHINO_TRADICIONAL: { precio: 2500, gramos: 18.0 },
    CHOCOLATE_CHOCOMILK: { precio: 2400, gramos: 20.0 },
    CAPUCHINO_VAINILLA: { precio: 2500, gramos: 18.0 },
    MOCACCINO: { precio: 2800, gramos: 18.0 },
    LATTE: { precio: 2600, gramos: 18.0 },
  };

  const initialMap = new Map(configuracionesIniciales.map((c) => [c.bebida, c]));

  const [configs, setConfigs] = useState<BebidaConfigItem[]>(
    BEBIDAS_CATALOGO.map((b, idx) => {
      const existing = initialMap.get(b.id);
      const defaults = defaultGramajes[b.id] || { precio: 2500, gramos: 18.0 };

      return {
        bebida: b.id,
        activa: existing ? existing.activa : idx < numeroProductos,
        insumoId: existing?.insumoId || null,
        insumoNombre: existing?.insumoNombre || null,
        gramosPorTaza: existing?.gramosPorTaza ?? (existing?.gramosCafe || defaults.gramos),
        gramosCafe: existing?.gramosCafe ?? 0,
        gramosLeche: existing?.gramosLeche ?? 0,
        gramosCocoa: existing?.gramosCocoa ?? 0,
        precio: existing ? existing.precio : defaults.precio,
      };
    })
  );

  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const activeCount = configs.filter((c) => c.activa).length;

  const handleToggleActive = (bebidaId: string) => {
    setConfigs((prev) =>
      prev.map((c) => (c.bebida === bebidaId ? { ...c, activa: !c.activa } : c))
    );
  };

  const handleFieldChange = (
    bebidaId: string,
    field: "insumoId" | "gramosPorTaza" | "precio",
    val: any
  ) => {
    setConfigs((prev) =>
      prev.map((c) => (c.bebida === bebidaId ? { ...c, [field]: val } : c))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await guardarCalibracionMaquina(maquinaId, configs);
    setIsSaving(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-coffee-100 dark:bg-stone-800 text-coffee-800 dark:text-amber-300 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-white leading-tight">
                Calibración de Premezclas y Gramajes: {codigoSerial}
              </h3>
              <p className="text-[11px] text-stone-500">
                {modelo} • Capacidad: <strong>{numeroProductos} Productos / Tolvas</strong> (Activas: {activeCount})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario de Calibración */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              ¡Calibración guardada exitosamente! El Kárdex descontará estas premezclas de bodega.
            </div>
          )}

          <div className="space-y-3">
            {configs.map((c) => {
              const info = BEBIDAS_CATALOGO.find((b) => b.id === c.bebida);

              return (
                <div
                  key={c.bebida}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                    c.activa
                      ? "bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 shadow-sm"
                      : "bg-stone-50/70 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800 opacity-60"
                  }`}
                >
                  {/* Selector Activar / Desactivar Bebida */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={c.activa}
                        onChange={() => handleToggleActive(c.bebida)}
                        className="w-4 h-4 rounded text-coffee-600 focus:ring-coffee-500"
                      />
                      <span className="text-base">{info?.icono}</span>
                      <span className="font-bold text-stone-900 dark:text-white">
                        {info?.nombre}
                      </span>
                    </label>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.activa
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                      }`}
                    >
                      {c.activa ? "Activa en Máquina" : "Desactivada"}
                    </span>
                  </div>

                  {/* Campos de Premezcla, Gramaje y Precio */}
                  {c.activa && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-stone-100 dark:border-stone-800">
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1 flex items-center gap-1">
                          <Package className="w-3 h-3 text-coffee-600 dark:text-amber-400" />
                          Premezcla / Insumo
                        </label>
                        <select
                          value={c.insumoId || ""}
                          onChange={(e) =>
                            handleFieldChange(c.bebida, "insumoId", e.target.value || null)
                          }
                          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2 text-xs outline-none focus:border-coffee-600"
                        >
                          <option value="">Sin Premezcla Asignada</option>
                          {insumos.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.nombre} ({i.unidadMedida})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-stone-500 block mb-1">
                          Gramaje por Taza (g)
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={c.gramosPorTaza || 0}
                          onChange={(e) =>
                            handleFieldChange(
                              c.bebida,
                              "gramosPorTaza",
                              parseFloat(e.target.value || "0")
                            )
                          }
                          className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 font-bold text-stone-900 dark:text-white text-xs outline-none focus:border-coffee-600 font-mono"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-stone-500 block mb-1">
                          Precio ($ COP)
                        </span>
                        <input
                          type="number"
                          step="50"
                          min="0"
                          value={c.precio}
                          onChange={(e) =>
                            handleFieldChange(
                              c.bebida,
                              "precio",
                              parseFloat(e.target.value || "0")
                            )
                          }
                          className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 font-black text-coffee-800 dark:text-amber-300 text-xs outline-none focus:border-coffee-600 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pie de Acciones */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <span className="text-xs text-stone-500">
              Las premezclas seleccionadas se descontarán del kárdex al liquidar.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-coffee-800 hover:bg-coffee-900 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Calibración</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
