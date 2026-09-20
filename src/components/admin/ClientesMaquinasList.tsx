"use client";

import React, { useState } from "react";
import {
  Building2,
  Phone,
  MapPin,
  Coffee,
  Sliders,
  CheckCircle2,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  CalibracionMaquinaModal,
  BebidaConfigItem,
} from "./CalibracionMaquinaModal";
import { BEBIDAS_CATALOGO } from "@/types/liquidacion";

export interface MaquinaItem {
  id: string;
  codigoSerial: string;
  modelo: string;
  ubicacion: string;
  numeroProductos: number;
  rutaNombre: string;
  configuraciones: BebidaConfigItem[];
}

export interface ClienteItem {
  id: string;
  razonSocial: string;
  sede: string;
  direccion: string;
  contacto: string;
  whatsapp: string;
  maquinas: MaquinaItem[];
}

interface ClientesMaquinasListProps {
  clientes: ClienteItem[];
}

export const ClientesMaquinasList: React.FC<ClientesMaquinasListProps> = ({
  clientes,
}) => {
  const [selectedMaquina, setSelectedMaquina] = useState<MaquinaItem | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-coffee-600" />
          Clientes Registrados y Parque de Máquinas ({clientes.length})
        </h3>
        <span className="text-xs text-stone-400">
          Configura gramajes para el descuento automático en Kárdex
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clientes.map((c) => (
          <div
            key={c.id}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-coffee-300 dark:hover:border-stone-700 transition-all"
          >
            {/* Header del Cliente */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-base text-stone-900 dark:text-white leading-tight">
                  {c.razonSocial}
                </h4>
                <span className="text-xs text-coffee-700 dark:text-amber-300 font-semibold">
                  {c.sede}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Activo
              </span>
            </div>

            {/* Datos de Contacto */}
            <div className="space-y-1.5 text-xs text-stone-500">
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>{c.direccion}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>
                  WhatsApp:{" "}
                  <strong className="text-stone-800 dark:text-stone-200 font-medium">
                    {c.whatsapp}
                  </strong>{" "}
                  ({c.contacto})
                </span>
              </p>
            </div>

            {/* Listado de Máquinas Asociadas */}
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Coffee className="w-3 h-3" />
                  Máquinas Instaladas ({c.maquinas.length})
                </span>
              </div>

              {c.maquinas.length > 0 ? (
                <div className="space-y-2.5">
                  {c.maquinas.map((m) => {
                    const activeConfigs = m.configuraciones.filter((cfg) => cfg.activa);

                    return (
                      <div
                        key={m.id}
                        className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700/60 p-3 rounded-xl space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900 dark:text-white text-xs">
                                {m.codigoSerial}
                              </span>
                              <span className="text-[10px] font-semibold text-coffee-800 dark:text-amber-300 bg-coffee-100/70 dark:bg-stone-800 px-2 py-0.5 rounded-md border border-coffee-200 dark:border-stone-700">
                                {m.numeroProductos} Selecciones
                              </span>
                            </div>
                            <span className="text-[11px] text-stone-500 block mt-0.5">
                              {m.modelo} • {m.ubicacion}
                            </span>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                              Circuito: {m.rutaNombre}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedMaquina(m)}
                            className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 hover:border-coffee-600 dark:hover:border-amber-400 hover:text-coffee-800 dark:hover:text-amber-300 text-stone-700 dark:text-stone-300 text-[11px] font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                            title="Configurar Bebidas, Precios y Gramajes de Descuento de Kárdex"
                          >
                            <Sliders className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
                            <span>Calibrar Gramajes</span>
                          </button>
                        </div>

                        {/* Píldoras de Bebidas Activas */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {activeConfigs.length > 0 ? (
                            activeConfigs.map((cfg) => {
                              const bInfo = BEBIDAS_CATALOGO.find(
                                (b) => b.id === cfg.bebida
                              );
                              return (
                                <span
                                  key={cfg.bebida}
                                  className="inline-flex items-center gap-1 text-[10px] bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 px-2 py-0.5 rounded-md border border-stone-200 dark:border-stone-700"
                                >
                                  <span>{bInfo?.icono || "☕"}</span>
                                  <span>{bInfo?.nombre || cfg.bebida}</span>
                                  <span className="text-[9px] text-stone-400 font-mono">
                                    (${cfg.precio.toLocaleString("es-CO")})
                                  </span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 italic flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Sin bebidas calibradas. Haz clic en "Calibrar Gramajes".
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic p-2 bg-stone-50 dark:bg-stone-800/40 rounded-xl text-center">
                  No tiene máquinas asociadas actualmente.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Calibración de Gramajes y Bebidas */}
      {selectedMaquina && (
        <CalibracionMaquinaModal
          maquinaId={selectedMaquina.id}
          codigoSerial={selectedMaquina.codigoSerial}
          modelo={selectedMaquina.modelo}
          numeroProductos={selectedMaquina.numeroProductos}
          configuracionesIniciales={selectedMaquina.configuraciones}
          onClose={() => setSelectedMaquina(null)}
        />
      )}
    </div>
  );
};
