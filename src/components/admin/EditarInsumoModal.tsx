"use client";

import React, { useState, useTransition } from "react";
import { X, Boxes, AlertCircle, CheckCircle2, Loader2, Tag, Scale, DollarSign } from "lucide-react";
import { editarInsumo } from "@/actions/admin";

interface EditarInsumoModalProps {
  insumo: {
    id: string;
    nombre: string;
    codigo: string;
    unidadMedida: string;
    stockActual: number;
    stockMinimo: number;
    costoPromedio: number;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditarInsumoModal: React.FC<EditarInsumoModalProps> = ({
  insumo,
  onClose,
  onSuccess,
}) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.append("id", insumo.id);

    startTransition(async () => {
      const res = await editarInsumo(formData);
      if (res.success) {
        setSuccess(true);
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setError(res.error || "Error al actualizar el insumo");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-coffee-100 dark:bg-amber-950/60 flex items-center justify-center text-coffee-700 dark:text-amber-400">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-sm">
                Editar Insumo de Bodega
              </h3>
              <p className="text-[11px] text-stone-500 font-mono">
                {insumo.codigo} • {insumo.nombre}
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Insumo actualizado correctamente!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Nombre del Insumo *
              </label>
              <input
                type="text"
                name="nombre"
                required
                defaultValue={insumo.nombre}
                placeholder="ej. Café Soluble Liofilizado"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Código Único *
              </label>
              <div className="relative">
                <Tag className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="codigo"
                  required
                  defaultValue={insumo.codigo}
                  placeholder="ej. INS-CAFE-SOLUBLE"
                  className="w-full pl-8 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white font-mono uppercase"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Unidad de Medida *
              </label>
              <div className="relative">
                <Scale className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  name="unidadMedida"
                  defaultValue={insumo.unidadMedida}
                  className="w-full pl-8 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white font-semibold"
                >
                  <option value="KG">Kilogramos (KG)</option>
                  <option value="GRAMOS">Gramos (GRAMOS)</option>
                  <option value="UNIDADES">Unidades (UNIDADES)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Costo Promedio Unitario ($ COP) *
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="any"
                  name="costoPromedio"
                  required
                  defaultValue={insumo.costoPromedio}
                  placeholder="ej. 42000"
                  className="w-full pl-8 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Stock Actual en Bodega *
              </label>
              <input
                type="number"
                step="any"
                name="stockActual"
                required
                defaultValue={insumo.stockActual}
                placeholder="ej. 15.5"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Stock Mínimo de Alerta *
              </label>
              <input
                type="number"
                step="any"
                name="stockMinimo"
                required
                defaultValue={insumo.stockMinimo}
                placeholder="ej. 5"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="py-2 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="py-2 px-5 bg-coffee-800 hover:bg-coffee-900 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
