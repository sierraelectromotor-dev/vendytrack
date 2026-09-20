"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  Coffee,
  Building2,
  MapPin,
  Route,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Hash,
  Sliders,
} from "lucide-react";
import { BEBIDAS_CATALOGO } from "@/types/liquidacion";
import { asignarMaquinaACliente } from "@/actions/admin";

interface ClienteOption {
  id: string;
  razonSocial: string;
  sede: string;
}

interface RutaOption {
  id: string;
  nombre: string;
}

interface BebidaItem {
  id?: string;
  bebida: string;
  activa: boolean;
  contadorInicial: number;
  ultimoContador?: number;
  precio: number;
  insumoId?: string | null;
  insumoNombre?: string | null;
  gramosPorTaza?: number;
}

interface AsignarMaquinaModalProps {
  maquina: {
    id: string;
    codigoSerial: string;
    modelo: string;
    ubicacion: string;
    numeroProductos: number;
    configuraciones: BebidaItem[];
  };
  clientes: ClienteOption[];
  rutas: RutaOption[];
  onClose: () => void;
  onSuccess?: () => void;
}

export const AsignarMaquinaModal: React.FC<AsignarMaquinaModalProps> = ({
  maquina,
  clientes,
  rutas,
  onClose,
  onSuccess,
}) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [clienteId, setClienteId] = useState(clientes[0]?.id || "");
  const [ubicacion, setUbicacion] = useState("Piso 1 Cafetería");
  const [rutaId, setRutaId] = useState("none");

  // Contadores iniciales para la nueva asignación (por defecto toma los últimos contadores registrados)
  const [contadores, setContadores] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    maquina.configuraciones.forEach((c) => {
      map[c.bebida] = c.ultimoContador ?? c.contadorInicial ?? 0;
    });
    return map;
  });

  const handleContadorChange = (bebida: string, val: number) => {
    setContadores((prev) => ({
      ...prev,
      [bebida]: val,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!clienteId) {
      setError("Debes seleccionar un cliente");
      return;
    }

    startTransition(async () => {
      const res = await asignarMaquinaACliente({
        maquinaId: maquina.id,
        clienteId,
        ubicacion,
        rutaId: rutaId === "none" ? null : rutaId,
        contadores,
      });

      if (res.success) {
        setSuccess(true);
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setError(res.error || "Error al asignar la máquina al cliente");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-base">
                Asignar Máquina a Nuevo Cliente
              </h3>
              <p className="text-xs text-stone-500">
                Máquina <strong className="text-stone-800 dark:text-stone-200">{maquina.codigoSerial}</strong> ({maquina.modelo})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Máquina asignada al cliente con éxito!</span>
            </div>
          )}

          {/* Destino de la Asignación */}
          <div className="bg-stone-50/80 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-700/80 space-y-3">
            <h4 className="font-bold text-stone-900 dark:text-white flex items-center gap-2 text-xs">
              <Building2 className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
              Datos del Cliente y Ubicación
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Cliente Destino *
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
                >
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razonSocial} ({c.sede})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Ubicación en Local *
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="ej. Piso 1 Cafetería"
                    className="w-full pl-9 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Ruta / Circuito Asignado
                </label>
                <div className="relative">
                  <Route className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={rutaId}
                    onChange={(e) => setRutaId(e.target.value)}
                    className="w-full pl-9 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
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
            </div>
          </div>

          {/* Contadores Iniciales para la Nueva Asignación */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 dark:text-white flex items-center gap-2 text-xs">
                <Sliders className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
                Contadores Iniciales para este Cliente
              </h4>
              <span className="text-[11px] text-stone-500">
                Pre-cargados con los últimos contadores registrados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {maquina.configuraciones
                .filter((c) => c.activa)
                .map((cfg, idx) => {
                  const bInfo = BEBIDAS_CATALOGO.find((b) => b.id === cfg.bebida);
                  const valorContador = contadores[cfg.bebida] ?? 0;

                  return (
                    <div
                      key={cfg.bebida}
                      className="p-3 bg-stone-50/80 dark:bg-stone-800/50 rounded-2xl border border-stone-200/80 dark:border-stone-700/80 flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="font-bold text-stone-900 dark:text-white text-xs flex items-center gap-1.5">
                          <span>{bInfo?.icono || "☕"}</span>
                          <span>{bInfo?.nombre || cfg.bebida}</span>
                        </span>
                        <span className="text-[10px] text-stone-500 block mt-0.5">
                          {cfg.insumoNombre ? `Premezcla: ${cfg.insumoNombre}` : "Calibración estándar"}
                          {cfg.gramosPorTaza ? ` • ${cfg.gramosPorTaza}g` : ""}
                        </span>
                      </div>

                      <div className="w-28 shrink-0">
                        <label className="text-[9px] font-bold text-stone-500 block mb-0.5">
                          Contador Inicial
                        </label>
                        <div className="relative">
                          <Hash className="w-3 h-3 text-stone-400 absolute left-2 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            min="0"
                            value={valorContador}
                            onChange={(e) =>
                              handleContadorChange(
                                cfg.bebida,
                                parseInt(e.target.value || "0", 10)
                              )
                            }
                            className="w-full pl-6 pr-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl font-mono font-bold text-xs text-stone-900 dark:text-white outline-none focus:border-coffee-600"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="py-2.5 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="py-2.5 px-5 bg-coffee-800 hover:bg-coffee-900 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Asignando...</span>
                </>
              ) : (
                <span>Confirmar Asignación</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
