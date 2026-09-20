"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  AlertOctagon,
  Wrench,
  Package,
  DollarSign,
  User,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { crearVisitaExtraordinaria } from "@/actions/visitas";

interface CrearVisitaModalProps {
  maquinas: {
    id: string;
    codigoSerial: string;
    clienteNombre: string;
    sede: string;
    ubicacion: string;
  }[];
  ruteros: {
    id: string;
    name: string;
    email: string;
  }[];
  maquinaPreseleccionadaId?: string;
  onClose: () => void;
  onCreated?: () => void;
}

export const CrearVisitaModal: React.FC<CrearVisitaModalProps> = ({
  maquinas,
  ruteros,
  maquinaPreseleccionadaId,
  onClose,
  onCreated,
}) => {
  const [tipo, setTipo] = useState<"FALLA_TECNICA" | "REPOSICION_URGENTE" | "SEGUNDA_LIQUIDACION">("FALLA_TECNICA");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.set("tipo", tipo);

    startTransition(async () => {
      const res = await crearVisitaExtraordinaria(formData);
      if (res.success) {
        setSuccess(true);
        if (onCreated) onCreated();
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setError(res.error || "Error al generar la orden de visita");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-rose-50/60 dark:bg-rose-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-sm">
                Asignar Visita Extraordinaria / Emergencia
              </h3>
              <p className="text-[11px] text-stone-500">
                Despacha un servicio técnico, reposición urgente o liquidación complementaria
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

        {/* Selector de Tipo de Visita */}
        <div className="p-4 pb-0">
          <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1.5 text-xs">
            Tipo de Emergencia o Servicio *
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTipo("FALLA_TECNICA")}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                tipo === "FALLA_TECNICA"
                  ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 font-bold shadow-sm"
                  : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50"
              }`}
            >
              <Wrench className="w-4 h-4 text-rose-600" />
              <span className="text-[11px] leading-tight">Falla Técnica</span>
            </button>

            <button
              type="button"
              onClick={() => setTipo("REPOSICION_URGENTE")}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                tipo === "REPOSICION_URGENTE"
                  ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-sm"
                  : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50"
              }`}
            >
              <Package className="w-4 h-4 text-amber-600" />
              <span className="text-[11px] leading-tight">Sin Insumo</span>
            </button>

            <button
              type="button"
              onClick={() => setTipo("SEGUNDA_LIQUIDACION")}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                tipo === "SEGUNDA_LIQUIDACION"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm"
                  : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50"
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] leading-tight">2da Liquidación</span>
            </button>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Orden de visita extraordinaria despachada</span>
            </div>
          )}

          {/* Máquina */}
          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Máquina y Punto a Visitar *
            </label>
            <select
              name="maquinaId"
              required
              defaultValue={maquinaPreseleccionadaId || ""}
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-rose-500 font-semibold"
            >
              <option value="" disabled>
                -- Selecciona la máquina --
              </option>
              {maquinas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigoSerial} • {m.clienteNombre} ({m.sede}) - {m.ubicacion}
                </option>
              ))}
            </select>
          </div>

          {/* Rutero y Prioridad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Rutero / Técnico a Enviar *
              </label>
              <select
                name="operadorId"
                required
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-rose-500 font-semibold"
              >
                <option value="" disabled selected>
                  -- Seleccionar operador --
                </option>
                {ruteros.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Prioridad de Atención *
              </label>
              <select
                name="prioridad"
                defaultValue="ALTA"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-rose-500 font-semibold"
              >
                <option value="URGENTE">🚨 Urgente (Atender ya)</option>
                <option value="ALTA">⚠️ Alta (Hoy en la tarde/noche)</option>
                <option value="NORMAL">ℹ️ Normal (En el día)</option>
              </select>
            </div>
          </div>

          {/* Motivo Reportado por el Cliente */}
          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              ¿Qué reportó el cliente? (Motivo) *
            </label>
            <textarea
              name="motivoReporte"
              required
              rows={2}
              placeholder={
                tipo === "FALLA_TECNICA"
                  ? "ej. Se atascó una moneda de 500 y no cae el vaso..."
                  : tipo === "REPOSICION_URGENTE"
                  ? "ej. Se agotó la leche en polvo y el café..."
                  : "ej. Máquina con alta venta hoy, se requiere arqueo nocturno..."
              }
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-rose-500"
            />
          </div>

          {/* Notas Internas */}
          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Instrucciones / Notas para el Operador (Opcional)
            </label>
            <input
              type="text"
              name="notasAdmin"
              placeholder="ej. Preguntar por Don Carlos en recepción del piso 2..."
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-rose-500"
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
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Despachar Visita</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
