"use client";

import React, { useState } from "react";
import { BEBIDAS_CATALOGO } from "@/types/liquidacion";
import { guardarCalibracionMaquina } from "@/actions/admin";
import { formatCOP } from "@/lib/utils";
import {
  Sliders,
  X,
  Save,
  Loader2,
  CheckCircle2,
  Coffee,
  Check,
  Scale,
} from "lucide-react";

export interface BebidaConfigItem {
  bebida: string;
  activa: boolean;
  contadorInicial?: number;
  ultimoContador?: number;
  insumoId?: string | null;
  insumoNombre?: string | null;
  gramosPorTaza?: number;
  gramosCafe: number;
  gramosLeche: number;
  gramosCocoa: number;
  precio: number;
}

interface CalibracionMaquinaModalProps {
  maquinaId: string;
  codigoSerial: string;
  modelo: string;
  numeroProductos: number;
  configuracionesIniciales: BebidaConfigItem[];
  onClose: () => void;
}

export const CalibracionMaquinaModal: React.FC<CalibracionMaquinaModalProps> = ({
  maquinaId,
  codigoSerial,
  modelo,
  numeroProductos,
  configuracionesIniciales,
  onClose,
}) => {
  const defaultConfigs: Record<string, { cafe: number; leche: number; cocoa: number; precio: number }> = {
    CAFE_LARGO_TINTO: { cafe: 2.2, leche: 0, cocoa: 0, precio: 1800 },
    CAFE_CORTO_EXPRESO: { cafe: 2.0, leche: 0, cocoa: 0, precio: 1800 },
    CAPUCHINO_TRADICIONAL: { cafe: 2.0, leche: 12.0, cocoa: 0, precio: 2500 },
    CHOCOLATE_CHOCOMILK: { cafe: 0, leche: 6.0, cocoa: 16.0, precio: 2400 },
    CAPUCHINO_VAINILLA: { cafe: 1.8, leche: 12.0, cocoa: 0, precio: 2500 },
    MOCACCINO: { cafe: 1.8, leche: 8.0, cocoa: 10.0, precio: 2800 },
    LATTE: { cafe: 1.5, leche: 15.0, cocoa: 0, precio: 2600 },
  };

  const initialMap = new Map(configuracionesIniciales.map((c) => [c.bebida, c]));

  const [configs, setConfigs] = useState<BebidaConfigItem[]>(
    BEBIDAS_CATALOGO.map((b, idx) => {
      const existing = initialMap.get(b.id);
      const defaults = defaultConfigs[b.id] || { cafe: 2, leche: 10, cocoa: 0, precio: 2500 };

      return {
        bebida: b.id,
        activa: existing ? existing.activa : idx < numeroProductos,
        gramosCafe: existing ? existing.gramosCafe : defaults.cafe,
        gramosLeche: existing ? existing.gramosLeche : defaults.leche,
        gramosCocoa: existing ? existing.gramosCocoa : defaults.cocoa,
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

  const handleGramosChange = (
    bebidaId: string,
    field: "gramosCafe" | "gramosLeche" | "gramosCocoa" | "precio",
    val: string
  ) => {
    const num = parseFloat(val) || 0;
    setConfigs((prev) =>
      prev.map((c) => (c.bebida === bebidaId ? { ...c, [field]: num } : c))
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
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-coffee-100 dark:bg-stone-800 text-coffee-800 dark:text-amber-300 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-white leading-tight">
                Calibración de Gramajes y Bebidas: {codigoSerial}
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
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              ¡Calibración guardada exitosamente! El Kárdex y la PWA usarán estos gramajes.
            </div>
          )}

          <div className="space-y-3">
            {configs.map((c) => {
              const info = BEBIDAS_CATALOGO.find((b) => b.id === c.bebida);

              return (
                <div
                  key={c.bebida}
                  className={`p-3.5 rounded-xl border transition-all text-xs space-y-2.5 ${
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

                  {/* Campos de Dosificación en Gramos */}
                  {c.activa && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] font-semibold text-stone-500 block">
                          Café Soluble (g)
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={c.gramosCafe}
                          onChange={(e) =>
                            handleGramosChange(c.bebida, "gramosCafe", e.target.value)
                          }
                          className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-1.5 font-bold text-stone-900 dark:text-white text-xs outline-none focus:border-coffee-600"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-stone-500 block">
                          Leche Polvo (g)
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={c.gramosLeche}
                          onChange={(e) =>
                            handleGramosChange(c.bebida, "gramosLeche", e.target.value)
                          }
                          className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-1.5 font-bold text-stone-900 dark:text-white text-xs outline-none focus:border-coffee-600"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-stone-500 block">
                          Cocoa (g)
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={c.gramosCocoa}
                          onChange={(e) =>
                            handleGramosChange(c.bebida, "gramosCocoa", e.target.value)
                          }
                          className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-1.5 font-bold text-stone-900 dark:text-white text-xs outline-none focus:border-coffee-600"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-stone-500 block">
                          Precio ($ COP)
                        </span>
                        <input
                          type="number"
                          step="50"
                          min="0"
                          value={c.precio}
                          onChange={(e) =>
                            handleGramosChange(c.bebida, "precio", e.target.value)
                          }
                          className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-1.5 font-black text-coffee-800 dark:text-amber-300 text-xs outline-none focus:border-coffee-600"
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
              Vasos y mezcladores se descuentan a razón de 1 unidad por cada taza servida.
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
