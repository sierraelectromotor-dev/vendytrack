"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  Wrench,
  Package,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  Plus,
  Minus,
  Coffee,
} from "lucide-react";
import { VisitaExtraordinariaItem, completarVisitaExtraordinaria, crearVisitaExtraordinaria } from "@/actions/visitas";

interface InsumoSimple {
  id: string;
  nombre: string;
  unidadMedida: string;
  stockActual: number;
}

interface AtenderVisitaModalProps {
  visita: VisitaExtraordinariaItem;
  insumosDisponibles: InsumoSimple[];
  onClose: () => void;
  onCompleted?: () => void;
  onIrALiquidar?: () => void;
}

export const AtenderVisitaModal: React.FC<AtenderVisitaModalProps> = ({
  visita,
  insumosDisponibles,
  onClose,
  onCompleted,
  onIrALiquidar,
}) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Estado para reposición de insumos
  const [cantidadesInsumos, setCantidadesInsumos] = useState<Record<string, number>>({});

  const handleCantidadChange = (insumoId: string, delta: number) => {
    setCantidadesInsumos((prev) => {
      const actual = prev[insumoId] || 0;
      const nueva = Math.max(0, actual + delta);
      return { ...prev, [insumoId]: nueva };
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);

    // Si es reposición de insumos, validamos que haya al menos 1 seleccionado
    if (visita.tipo === "REPOSICION_URGENTE") {
      const items = Object.entries(cantidadesInsumos)
        .filter(([_, cant]) => cant > 0)
        .map(([id, cant]) => {
          const ins = insumosDisponibles.find((i) => i.id === id);
          return {
            insumoId: id,
            nombre: ins?.nombre || "Insumo",
            cantidad: cant,
            unidadMedida: ins?.unidadMedida || "KG",
          };
        });

      if (items.length === 0) {
        setError("Debes indicar al menos un insumo entregado con cantidad mayor a 0.");
        return;
      }

      formData.set("detallesReposicion", JSON.stringify(items));
    }

    startTransition(async () => {
      let visitId = visita.id;

      // Si es un borrador registrado directamente por el operador en campo
      if (visita.id.startsWith("draft-")) {
        const createData = new FormData();
        createData.set("maquinaId", visita.maquinaId);
        createData.set("tipo", visita.tipo);
        createData.set("prioridad", visita.prioridad || "ALTA");
        const motivo =
          formData.get("solucionAplicada")?.toString().trim() ||
          (visita.tipo === "REPOSICION_URGENTE"
            ? "Reposición urgente de insumos en campo"
            : "Soporte técnico reportado en campo");
        createData.set("motivoReporte", motivo.slice(0, 150));

        const createRes = await crearVisitaExtraordinaria(createData);
        if (!createRes.success || !createRes.data) {
          setError(createRes.error || "Error al crear la orden de visita");
          return;
        }
        visitId = createRes.data.id;
      }

      formData.set("id", visitId);

      const res = await completarVisitaExtraordinaria(formData);
      if (res.success) {
        setSuccess(true);
        if (onCompleted) onCompleted();
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setError(res.error || "Error al completar la visita");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-rose-50 dark:bg-rose-950/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md">
              {visita.tipo === "FALLA_TECNICA" && <Wrench className="w-5 h-5" />}
              {visita.tipo === "REPOSICION_URGENTE" && <Package className="w-5 h-5" />}
              {visita.tipo === "SEGUNDA_LIQUIDACION" && <DollarSign className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-sm">
                {visita.tipoLabel}{" "}
                {visita.consecutivo ? `(Orden #${visita.consecutivo})` : "(Atención en Campo)"}
              </h3>
              <p className="text-[11px] text-stone-500">
                {visita.clienteNombre} ({visita.clienteSede}) • {visita.maquinaSerial}
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

        {/* Reporte del Cliente */}
        {visita.motivoReporte && (
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/40 shrink-0 text-xs">
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block mb-0.5">
              {visita.id.startsWith("draft-") ? "Motivo / Situación en Campo:" : "Reporte del Cliente:"}
            </span>
            <p className="font-semibold text-stone-800 dark:text-stone-200 italic">
              "{visita.motivoReporte}"
            </p>
            {visita.notasAdmin && (
              <p className="text-stone-500 text-[11px] mt-1">
                <strong>Nota del Admin:</strong> {visita.notasAdmin}
              </p>
            )}
          </div>
        )}

        {/* Contenido scrolleable */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Visita completada exitosamente!</span>
            </div>
          )}

          {/* Caso 1: Falla Técnica */}
          {visita.tipo === "FALLA_TECNICA" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  ¿Cómo solucionaste el problema? (Descripción del trabajo) *
                </label>
                <textarea
                  name="solucionAplicada"
                  required
                  rows={3}
                  placeholder="ej. Se destapó la tolva de leche, se limpió el batidor y se hicieron 2 pruebas de caída satisfactorias..."
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-rose-500 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Enlace o Foto de Evidencia (Opcional)
                </label>
                <input
                  type="url"
                  name="fotoEvidenciaUrl"
                  placeholder="https://..."
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-rose-500 text-stone-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>✓ Marcar Falla Técnica como Solucionada</span>
              </button>
            </form>
          )}

          {/* Caso 2: Reposición de Insumos */}
          {visita.tipo === "REPOSICION_URGENTE" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Selecciona los insumos entregados en la máquina: *
                </label>
                <p className="text-[11px] text-stone-500 mb-2">
                  Estos insumos se descontarán automáticamente del inventario de bodega.
                </p>

                <div className="space-y-2 divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl p-2 bg-stone-50/50 dark:bg-stone-800/30">
                  {insumosDisponibles.map((ins) => {
                    const cant = cantidadesInsumos[ins.id] || 0;
                    return (
                      <div
                        key={ins.id}
                        className="pt-2 first:pt-0 flex items-center justify-between gap-2"
                      >
                        <div>
                          <strong className="text-stone-900 dark:text-white block">
                            {ins.nombre}
                          </strong>
                          <span className="text-[10px] text-stone-400">
                            Stock en bodega: {ins.stockActual} {ins.unidadMedida}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCantidadChange(ins.id, -1)}
                            className="w-8 h-8 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold flex items-center justify-center hover:bg-stone-300 active:scale-95"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <span className="w-10 text-center font-black text-sm text-stone-900 dark:text-white font-mono">
                            {cant}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCantidadChange(ins.id, 1)}
                            className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 font-bold flex items-center justify-center hover:bg-amber-600 active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Notas de Entrega (Opcional)
                </label>
                <input
                  type="text"
                  name="solucionAplicada"
                  placeholder="ej. Se entregaron 2 bolsas selladas a la administradora..."
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>✓ Confirmar Entrega y Descargar Inventario</span>
              </button>
            </form>
          )}

          {/* Caso 3: Segunda Liquidación */}
          {visita.tipo === "SEGUNDA_LIQUIDACION" && (
            <div className="space-y-3 text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <DollarSign className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                Segunda Liquidación Autorizada
              </h4>
              <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                Esta orden te permite registrar un nuevo recaudo y arqueo de contadores para el turno de hoy sin afectar ni borrar la liquidación de la mañana.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (onIrALiquidar) onIrALiquidar();
                  onClose();
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
              >
                <DollarSign className="w-4 h-4" />
                <span>Comenzar Segunda Liquidación Ahora ➔</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
