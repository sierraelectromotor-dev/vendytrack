"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  Coffee,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Package,
  Hash,
  RotateCcw,
  MapPin,
  Navigation,
} from "lucide-react";
import { BEBIDAS_CATALOGO } from "@/types/liquidacion";
import { actualizarMaquina, habilitarReliquidacionHoy } from "@/actions/admin";

interface ClienteOption {
  id: string;
  razonSocial: string;
  sede: string;
  latitud?: number | null;
  longitud?: number | null;
}

interface RutaOption {
  id: string;
  nombre: string;
}

export interface InsumoOption {
  id: string;
  nombre: string;
  codigo: string;
  unidadMedida: string;
}

export interface BebidaConfigEdit {
  id?: string;
  bebida: string;
  activa: boolean;
  contadorInicial: number;
  ultimoContador?: number;
  precio: number;
  insumoId?: string | null;
  insumoNombre?: string | null;
  gramosPorTaza?: number;
  gramosCafe?: number;
  gramosLeche?: number;
  gramosCocoa?: number;
}

interface EditarMaquinaModalProps {
  maquina: {
    id: string;
    codigoSerial: string;
    modelo: string;
    ubicacion: string;
    numeroProductos: number;
    clienteId?: string | null;
    rutaId?: string | null;
    latitud?: number | null;
    longitud?: number | null;
    configuraciones: BebidaConfigEdit[];
    liquidadaHoy?: boolean;
    ultimoConsecutivo?: number | null;
  };
  clientes: ClienteOption[];
  rutas: RutaOption[];
  insumos?: InsumoOption[];
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditarMaquinaModal: React.FC<EditarMaquinaModalProps> = ({
  maquina,
  clientes,
  rutas,
  insumos = [],
  onClose,
  onSuccess,
}) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [codigoSerial, setCodigoSerial] = useState(maquina.codigoSerial);
  const [modelo, setModelo] = useState(maquina.modelo);
  const [ubicacion, setUbicacion] = useState(maquina.ubicacion);
  const [clienteId, setClienteId] = useState(maquina.clienteId || "none");
  const [rutaId, setRutaId] = useState(maquina.rutaId || "none");
  const [numeroProductos, setNumeroProductos] = useState(maquina.numeroProductos);
  const [latitud, setLatitud] = useState<string>(
    maquina.latitud !== undefined && maquina.latitud !== null ? maquina.latitud.toString() : ""
  );
  const [longitud, setLongitud] = useState<string>(
    maquina.longitud !== undefined && maquina.longitud !== null ? maquina.longitud.toString() : ""
  );
  const [liquidadaState, setLiquidadaState] = useState(maquina.liquidadaHoy || false);
  const [isReopening, setIsReopening] = useState(false);
  const [reopenSuccessMsg, setReopenSuccessMsg] = useState<string | null>(null);

  const handleCopiarCoordenadasCliente = () => {
    const c = clientes.find((cli) => cli.id === clienteId);
    if (c && c.latitud !== undefined && c.latitud !== null && c.longitud !== undefined && c.longitud !== null) {
      setLatitud(c.latitud.toString());
      setLongitud(c.longitud.toString());
    }
  };

  const handleObtenerUbicacionGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocalización no soportada en este dispositivo.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitud(pos.coords.latitude.toFixed(6));
        setLongitud(pos.coords.longitude.toFixed(6));
      },
      (err) => {
        alert("No se pudo obtener la ubicación GPS: " + err.message);
      }
    );
  };

  const handleHabilitarReliquidacion = async () => {
    if (
      !window.confirm(
        `¿Estás seguro de habilitar la máquina ${maquina.codigoSerial} para re-liquidar hoy?\n\nLa liquidación de hoy será anulada y el inventario de premezclas descontado será restaurado.`
      )
    ) {
      return;
    }
    setIsReopening(true);
    const res = await habilitarReliquidacionHoy(maquina.id);
    setIsReopening(false);
    if (res.success) {
      setLiquidadaState(false);
      setReopenSuccessMsg(
        res.message || "Máquina habilitada con éxito para re-liquidar hoy."
      );
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || "No se pudo habilitar la re-liquidación.");
    }
  };

  // Inicializar configuraciones completas para todas las bebidas del catálogo
  const [bebidas, setBebidas] = useState<BebidaConfigEdit[]>(() => {
    return BEBIDAS_CATALOGO.map((cat, idx) => {
      const existing = maquina.configuraciones.find((c) => c.bebida === cat.id);
      if (existing) {
        return {
          ...existing,
          contadorInicial: existing.ultimoContador ?? existing.contadorInicial ?? 0,
          insumoId: existing.insumoId || null,
          gramosPorTaza: existing.gramosPorTaza ?? (existing.gramosCafe || 18.0),
        };
      }
      return {
        bebida: cat.id,
        activa: idx < maquina.numeroProductos,
        contadorInicial: 0,
        precio: 2500,
        insumoId: insumos[0]?.id || null,
        gramosPorTaza: 18.0,
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
        clienteId: clienteId === "none" ? null : clienteId,
        rutaId: rutaId === "none" ? null : rutaId,
        numeroProductos,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
        bebidas: bebidas.map((b) => ({
          bebida: b.bebida,
          activa: b.activa,
          contadorInicial: b.contadorInicial,
          precio: b.precio,
          insumoId: b.insumoId || null,
          gramosPorTaza: b.gramosPorTaza ?? 0,
        })),
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-coffee-100 dark:bg-amber-950/60 flex items-center justify-center text-coffee-700 dark:text-amber-400">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-base">
                Editar Máquina, Reasignar y Calibrar Premezclas
              </h3>
              <p className="text-xs text-stone-500 font-mono">
                {maquina.codigoSerial} • {maquina.modelo}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {/* Banner si la máquina ya fue liquidada hoy */}
          {liquidadaState && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-amber-900 dark:text-amber-200 block">
                  Esta máquina ya fue liquidada hoy{" "}
                  {maquina.ultimoConsecutivo
                    ? `(LIQ-${maquina.ultimoConsecutivo.toString().padStart(4, "0")})`
                    : ""}
                  .
                </span>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  Si el rutero cometió un error o requiere una segunda visita, puedes desbloquearla aquí.
                </p>
              </div>
              <button
                type="button"
                disabled={isReopening}
                onClick={handleHabilitarReliquidacion}
                className="shrink-0 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isReopening ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>{isReopening ? "Habilitando..." : "Habilitar Re-liquidación"}</span>
              </button>
            </div>
          )}

          {reopenSuccessMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{reopenSuccessMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Máquina y calibración actualizadas con éxito!</span>
            </div>
          )}

          {/* Datos del Equipo y Reasignación de Cliente */}
          <div className="bg-stone-50/80 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700/80 rounded-2xl p-4 space-y-3.5">
            <h4 className="font-bold text-stone-900 dark:text-white flex items-center gap-2 text-xs">
              <Building2 className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
              Asignación y Datos Principales
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Cliente Asignado (Reasignar)
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
                >
                  <option value="none">-- En Bodega (Sin Asignar) --</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razonSocial} ({c.sede})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-stone-400 block mt-0.5">
                  Puedes cambiar el cliente o enviar la máquina a Bodega
                </span>
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Código Serial / Placa *
                </label>
                <input
                  type="text"
                  required
                  value={codigoSerial}
                  onChange={(e) => setCodigoSerial(e.target.value)}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Ubicación en Local
                </label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Ruta Asignada
                </label>
                <select
                  value={rutaId}
                  onChange={(e) => setRutaId(e.target.value)}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
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

            {/* Coordenadas Geográficas de la Máquina */}
            <div className="pt-3 border-t border-stone-200/80 dark:border-stone-700/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    Coordenadas Geográficas (GPS de la Máquina)
                  </span>
                  <span className="text-[10px] text-stone-500">
                    Si se dejan vacías, se usarán las coordenadas de la sede del cliente en el mapa.
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {clienteId !== "none" && (
                    <button
                      type="button"
                      onClick={handleCopiarCoordenadasCliente}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors border border-stone-200 dark:border-stone-700"
                      title="Copiar las coordenadas del cliente seleccionado"
                    >
                      <MapPin className="w-3 h-3 text-coffee-600" />
                      <span>Usar GPS del Cliente</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleObtenerUbicacionGPS}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors border border-rose-200 dark:border-rose-900"
                    title="Capturar ubicación GPS actual"
                  >
                    <Navigation className="w-3 h-3 text-rose-600" />
                    <span>Mi GPS Actual</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                    Latitud (ej. 4.652130)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitud}
                    onChange={(e) => setLatitud(e.target.value)}
                    placeholder="ej. 4.652130"
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2 text-xs outline-none focus:border-coffee-600 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                    Longitud (ej. -74.112340)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitud}
                    onChange={(e) => setLongitud(e.target.value)}
                    placeholder="ej. -74.112340"
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2 text-xs outline-none focus:border-coffee-600 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configuración de Bebidas y Premezclas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 dark:text-white flex items-center gap-2 text-xs">
                <Sliders className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
                Configuración de Bebidas, Premezclas y Contadores
              </h4>
              <span className="text-[11px] text-stone-500">
                Ajusta los contadores, la premezcla por tolva y el gramaje
              </span>
            </div>

            <div className="space-y-3">
              {bebidas.map((b, idx) => {
                const cat = BEBIDAS_CATALOGO.find((c) => c.id === b.bebida);

                return (
                  <div
                    key={b.bebida}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      b.activa
                        ? "bg-stone-50/80 dark:bg-stone-800/60 border-stone-200/80 dark:border-stone-700/80 shadow-2xs"
                        : "bg-stone-100/40 dark:bg-stone-900/30 border-stone-200/40 dark:border-stone-800 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`edit-activa-${idx}`}
                          checked={b.activa}
                          onChange={() => handleBebidaToggle(idx)}
                          className="w-4 h-4 rounded text-coffee-600 focus:ring-coffee-500 border-stone-300"
                        />
                        <label
                          htmlFor={`edit-activa-${idx}`}
                          className="font-bold text-stone-900 dark:text-white text-xs cursor-pointer select-none flex items-center gap-1.5"
                        >
                          <span>{cat?.icono || "☕"}</span>
                          <span>{cat?.nombre || b.bebida}</span>
                        </label>
                      </div>

                      <span className="text-[10px] text-stone-400 font-mono">
                        {b.activa ? "Habilitada" : "Deshabilitada"}
                      </span>
                    </div>

                    {b.activa && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-stone-200/50 dark:border-stone-700/50">
                        {/* Selector de Premezcla */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1 flex items-center gap-1">
                            <Package className="w-3 h-3 text-coffee-600 dark:text-amber-400" />
                            Premezcla / Insumo
                          </label>
                          <select
                            value={b.insumoId || ""}
                            onChange={(e) =>
                              handleFieldChange(idx, "insumoId", e.target.value || null)
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

                        {/* Gramaje */}
                        <div>
                          <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                            Gramaje (g)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={b.gramosPorTaza ?? 18}
                              onChange={(e) =>
                                handleFieldChange(
                                  idx,
                                  "gramosPorTaza",
                                  parseFloat(e.target.value || "0")
                                )
                              }
                              className="w-full pr-6 pl-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono font-bold text-stone-900 dark:text-white outline-none focus:border-coffee-600"
                            />
                            <span className="text-[10px] text-stone-400 absolute right-2 top-1/2 -translate-y-1/2">
                              g
                            </span>
                          </div>
                        </div>

                        {/* Contador Inicial */}
                        <div>
                          <label className="text-[10px] font-bold text-stone-900 dark:text-white block mb-1">
                            Contador
                          </label>
                          <div className="relative">
                            <Hash className="w-3 h-3 text-stone-400 absolute left-2 top-1/2 -translate-y-1/2" />
                            <input
                              type="number"
                              min="0"
                              value={b.contadorInicial}
                              onChange={(e) =>
                                handleFieldChange(
                                  idx,
                                  "contadorInicial",
                                  parseInt(e.target.value || "0", 10)
                                )
                              }
                              className="w-full pl-6 pr-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono font-black text-stone-900 dark:text-white outline-none focus:border-coffee-600"
                            />
                          </div>
                        </div>

                        {/* Precio Unitario */}
                        <div className="sm:col-span-1">
                          <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                            Precio ($ COP)
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={b.precio}
                            onChange={(e) =>
                              handleFieldChange(
                                idx,
                                "precio",
                                parseFloat(e.target.value || "0")
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono font-bold text-coffee-700 dark:text-amber-300 outline-none"
                          />
                        </div>
                      </div>
                    )}
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
              className="py-2.5 px-6 bg-coffee-800 hover:bg-coffee-900 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando Cambios...</span>
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
