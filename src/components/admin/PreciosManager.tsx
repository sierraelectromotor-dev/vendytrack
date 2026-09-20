"use client";

import React, { useState } from "react";
import { BEBIDAS_CATALOGO, TipoBebidaEnum } from "@/types/liquidacion";
import { actualizarPreciosMaquina } from "@/actions/admin";
import { formatCOP } from "@/lib/utils";
import { DollarSign, CheckCircle2, Loader2, Save, Coffee } from "lucide-react";

interface PreciosManagerProps {
  maquinas: Array<{
    id: string;
    codigoSerial: string;
    modelo: string;
    clienteNombre: string;
    sede: string;
    precios: Record<string, number>;
  }>;
}

export const PreciosManager: React.FC<PreciosManagerProps> = ({ maquinas }) => {
  const [selectedMaquinaId, setSelectedMaquinaId] = useState<string>(
    maquinas[0]?.id || ""
  );

  const selectedMaquina = maquinas.find((m) => m.id === selectedMaquinaId);

  const defaultPrices: Record<string, number> = {
    CAPUCHINO_VAINILLA: 2500,
    CAPUCHINO_TRADICIONAL: 2500,
    MOCACCINO: 2800,
    CAFE_CORTO_EXPRESO: 1800,
    CAFE_LARGO_TINTO: 1800,
    LATTE: 2600,
    CHOCOLATE_CHOCOMILK: 2400,
  };

  const [preciosState, setPreciosState] = useState<Record<string, number>>(
    selectedMaquina?.precios || defaultPrices
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleMaquinaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const maqId = e.target.value;
    setSelectedMaquinaId(maqId);
    const found = maquinas.find((m) => m.id === maqId);
    setPreciosState(found?.precios || defaultPrices);
    setSavedSuccess(false);
  };

  const handlePriceChange = (bebidaId: string, val: string) => {
    const num = parseFloat(val) || 0;
    setPreciosState((prev) => ({
      ...prev,
      [bebidaId]: num,
    }));
    setSavedSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaquinaId) return;

    setIsSaving(true);
    const res = await actualizarPreciosMaquina(selectedMaquinaId, preciosState);
    setIsSaving(false);

    if (res.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Selector de Máquina */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3">
        <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
          Seleccionar Cliente y Máquina para Configurar Tarifas:
        </label>
        <select
          value={selectedMaquinaId}
          onChange={handleMaquinaChange}
          className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-3 text-sm font-semibold outline-none focus:border-coffee-600"
        >
          {maquinas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.clienteNombre} ({m.sede}) — Máquina: {m.codigoSerial} ({m.modelo})
            </option>
          ))}
        </select>
      </div>

      {/* Tabla de Precios por Bebida */}
      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Tarifas por Taza ($ COP)
            </h3>
            <p className="text-xs text-stone-500">
              Estos valores se aplicarán de inmediato al formulario móvil del rutero
            </p>
          </div>

          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> ¡Precios actualizados!
            </span>
          )}
        </div>

        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {BEBIDAS_CATALOGO.map((b) => {
            const precioActual = preciosState[b.id] ?? defaultPrices[b.id] ?? 2500;

            return (
              <div
                key={b.id}
                className="py-3 flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{b.icono}</span>
                  <div>
                    <span className="font-bold text-stone-900 dark:text-white block">
                      {b.nombre}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {b.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-400">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={precioActual}
                    onChange={(e) => handlePriceChange(b.id, e.target.value)}
                    className="w-32 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 text-right font-black text-sm text-coffee-800 dark:text-amber-300 outline-none focus:border-coffee-600"
                  />
                  <span className="text-[10px] text-stone-400">COP</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="py-2.5 px-6 bg-coffee-800 hover:bg-coffee-900 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando cambios...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Nuevas Tarifas</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
