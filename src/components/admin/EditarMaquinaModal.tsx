"use client";

import React, { useState, useTransition } from "react";
import { X, Coffee, Sliders, CheckCircle2, AlertCircle, Loader2, Building2 } from "lucide-react";
import { BEBIDAS_CATALOGO, TipoBebidaEnum } from "@/types/liquidacion";
import { actualizarMaquina } from "@/actions/admin";

interface ClienteOption {
  id: string;
  razonSocial: string;
  sede: string;
}

interface RutaOption {
  id: string;
  nombre: string;
}

export interface BebidaConfigEdit {
  id?: string;
  bebida: string;
  activa: boolean;
  contadorInicial: number;
  precio: number;
  gramosCafe: number;
  gramosLeche: number;
  gramosCocoa: number;
}

interface EditarMaquinaModalProps {
  maquina: {
    id: string;
    codigoSerial: string;
    modelo: string;
    ubicacion: string;
    numeroProductos: number;
    clienteId: string;
    rutaId?: string | null;
    configuraciones: BebidaConfigEdit[];
  };
  clientes: ClienteOption[];
  rutas: RutaOption[];
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditarMaquinaModal: React.FC<EditarMaquinaModalProps> = ({
  maquina,
  clientes,
  rutas,
  onClose,
  onSuccess,
}) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [codigoSerial, setCodigoSerial] = useState(maquina.codigoSerial);
  const [modelo, setModelo] = useState(maquina.modelo);
  const [ubicacion, setUbicacion] = useState(maquina.ubicacion);
  const [clienteId, setClienteId] = useState(maquina.clienteId);
  const [rutaId, setRutaId] = useState(maquina.rutaId || "none");
  const [numeroProductos, setNumeroProductos] = useState(maquina.numeroProductos);

  // Inicializar configuraciones completas para todas las bebidas del catálogo
  const [bebidas, setBebidas] = useState<BebidaConfigEdit[]>(() => {
    return BEBIDAS_CATALOGO.map((cat, idx) => {
      const existing = maquina.configuraciones.find((c) => c.bebida === cat.id);
      if (existing) {
        return {
          ...existing,
          contadorInicial: existing.contadorInicial ?? 0,
        };
      }
      return {
        bebida: cat.id,
        activa: idx < maquina.numeroProductos,
        contadorInicial: 0,
        precio: 2500,
        gramosCafe: 2.0,
        gramosLeche: 0,
        gramosCocoa: 0,
      };
    });
  });

  const handleBebidaToggle = (index: number) => {
    setBebidas((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], activa: !updated[index].activa };
      return updated;
    });
  };

  const handleFieldChange = (index: number, field: keyof BebidaConfigEdit, val: any) => {
    setBebidas((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const res = await actualizarMaquina({
        id: maquina.id,
        codigoSerial,
        modelo,
        ubicacion,
        clienteId,
        rutaId: rutaId === "none" ? null : rutaId,
        numeroProductos,
        bebidas,
      });

      if (res.success) {
        setSuccess(true);
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setError(res.error || "Error al actualizar la máquina");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-coffee-100 dark:bg-amber-950/60 flex items-center justify-center text-coffee-700 dark:text-amber-400">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-sm">
                Editar Máquina y Contadores
              </h3>
              <p className="text-[11px] text-stone-500 font-mono">
                {maquina.codigoSerial} • {maquina.modelo}
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
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Máquina y contadores actualizados correctamente!</span>
            </div>
          )}

          {/* Datos del Equipo y Reasignación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Cliente Asignado *
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razonSocial} ({c.sede})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Código Serial / Placa *
              </label>
              <input
                type="text"
                required
                value={codigoSerial}
                onChange={(e) => setCodigoSerial(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Modelo *
              </label>
              <input
                type="text"
                required
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Ubicación en Local *
              </label>
              <input
                type="text"
                required
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Ruta Asignada
              </label>
              <select
                value={rutaId}
                onChange={(e) => setRutaId(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              >
                <option value="none">Sin Ruta Asignada</option>
                {rutas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calibración de Bebidas y Contadores */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
                Contadores Iniciales y Calibración de Bebidas
              </h4>
              <span className="text-[11px] text-stone-400">
                Activa o desactiva las bebidas de la máquina
              </span>
            </div>

            <div className="space-y-2">
              {bebidas.map((cfg, idx) => {
                const info = BEBIDAS_CATALOGO.find((b) => b.id === cfg.bebida);

                return (
                  <div
                    key={cfg.bebida}
                    className={`p-3 rounded-xl border transition-all ${
                      cfg.activa
                        ? "bg-stone-50 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700"
                        : "bg-stone-100/40 dark:bg-stone-900/40 border-stone-200/40 dark:border-stone-800/40 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`check-${cfg.bebida}`}
                          checked={cfg.activa}
                          onChange={() => handleBebidaToggle(idx)}
                          className="w-4 h-4 rounded text-coffee-600 focus:ring-coffee-500 border-stone-300"
                        />
                        <label
                          htmlFor={`check-${cfg.bebida}`}
                          className="font-bold text-stone-900 dark:text-white cursor-pointer select-none"
                        >
                          {info?.icono} {info?.nombre || cfg.bebida}
                        </label>
                      </div>
                      <span className="text-[10px] font-semibold text-stone-400 uppercase">
                        {cfg.activa ? "Activa en Máquina" : "Desactivada"}
                      </span>
                    </div>

                    {cfg.activa && (
                      <div className="space-y-2 pt-1 border-t border-stone-200/50 dark:border-stone-700/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-stone-700 dark:text-stone-300 block mb-0.5">
                              Contador Inicial (Lectura física) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={cfg.contadorInicial}
                              onChange={(e) =>
                                handleFieldChange(idx, "contadorInicial", parseInt(e.target.value || "0", 10))
                              }
                              className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-1.5 text-xs font-mono font-bold text-stone-900 dark:text-white outline-none focus:border-coffee-600"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-stone-500 block mb-0.5">
                              Precio de Venta ($ COP)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={cfg.precio}
                              onChange={(e) =>
                                handleFieldChange(idx, "precio", parseFloat(e.target.value || "0"))
                              }
                              className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-1.5 text-xs font-mono font-semibold text-coffee-700 dark:text-amber-300 outline-none"
                            />
                          </div>
                        </div>

                        {/* Gramajes */}
                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                          <div>
                            <label className="text-stone-500 block">Café (g):</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={cfg.gramosCafe}
                              onChange={(e) =>
                                handleFieldChange(idx, "gramosCafe", parseFloat(e.target.value || "0"))
                              }
                              className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-1 font-mono outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-stone-500 block">Leche (g):</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={cfg.gramosLeche}
                              onChange={(e) =>
                                handleFieldChange(idx, "gramosLeche", parseFloat(e.target.value || "0"))
                              }
                              className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-1 font-mono outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-stone-500 block">Cocoa (g):</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={cfg.gramosCocoa}
                              onChange={(e) =>
                                handleFieldChange(idx, "gramosCocoa", parseFloat(e.target.value || "0"))
                              }
                              className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-1 font-mono outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botones */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800 shrink-0">
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
