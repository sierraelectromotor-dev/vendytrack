"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Phone,
  MapPin,
  Coffee,
  Sliders,
  CheckCircle2,
  Layers,
  Sparkles,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  AlertCircle,
  PlusCircle,
  Search,
  ExternalLink,
  Route,
  Activity,
  X,
  Package,
  ArrowRightLeft,
  Warehouse,
  RotateCcw,
} from "lucide-react";
import { EditarClienteModal } from "./EditarClienteModal";
import { EditarMaquinaModal } from "./EditarMaquinaModal";
import { CrearClienteModal } from "./CrearClienteModal";
import { CrearMaquinaModal } from "./CrearMaquinaModal";
import { AsignarMaquinaModal } from "./AsignarMaquinaModal";
import { eliminarMaquina, habilitarReliquidacionHoy } from "@/actions/admin";
import { BEBIDAS_CATALOGO } from "@/types/liquidacion";

export interface BebidaConfigItem {
  id?: string;
  bebida: string;
  activa: boolean;
  contadorInicial: number;
  ultimoContador?: number;
  insumoId?: string | null;
  insumoNombre?: string | null;
  gramosPorTaza?: number;
  precio: number;
  gramosCafe?: number;
  gramosLeche?: number;
  gramosCocoa?: number;
}

export interface MaquinaItem {
  id: string;
  codigoSerial: string;
  modelo: string;
  ubicacion: string;
  numeroProductos: number;
  contadorActual: number;
  clienteId?: string | null;
  clienteNombre?: string | null;
  rutaId?: string | null;
  rutaNombre: string;
  latitud?: number | null;
  longitud?: number | null;
  activa?: boolean;
  liquidadaHoy?: boolean;
  ultimoConsecutivo?: number | null;
  ultimaLiquidacionId?: string | null;
  configuraciones: BebidaConfigItem[];
}

export interface ClienteItem {
  id: string;
  razonSocial: string;
  sede: string;
  direccion: string;
  contacto: string;
  whatsapp: string;
  activo?: boolean;
  latitud?: number | null;
  longitud?: number | null;
  maquinas: MaquinaItem[];
}

export interface InsumoOption {
  id: string;
  nombre: string;
  codigo: string;
  unidadMedida: string;
}

interface ClientesMaquinasListProps {
  clientes: ClienteItem[];
  maquinasSinAsignar?: MaquinaItem[];
  rutas?: Array<{ id: string; nombre: string }>;
  insumos?: InsumoOption[];
}

export const ClientesMaquinasList: React.FC<ClientesMaquinasListProps> = ({
  clientes,
  maquinasSinAsignar = [],
  rutas = [],
  insumos = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCrearClienteOpen, setIsCrearClienteOpen] = useState(false);
  const [crearMaquinaClienteId, setCrearMaquinaClienteId] = useState<string | null>(null);
  const [isCrearMaquinaOpen, setIsCrearMaquinaOpen] = useState(false);

  const [maquinaParaAsignar, setMaquinaParaAsignar] = useState<MaquinaItem | null>(null);
  const [selectedClienteParaEditar, setSelectedClienteParaEditar] = useState<ClienteItem | null>(null);
  const [selectedMaquinaParaEditar, setSelectedMaquinaParaEditar] = useState<MaquinaItem | null>(null);
  const [maquinaAEliminar, setMaquinaAEliminar] = useState<MaquinaItem | null>(null);
  const [isDeletingMaquina, setIsDeletingMaquina] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  // Estadísticas KPI
  const stats = useMemo(() => {
    const totalClientes = clientes.length;
    let maquinasAsignadas = 0;
    let totalSelecciones = 0;
    const rutasUnicas = new Set<string>();

    clientes.forEach((c) => {
      maquinasAsignadas += c.maquinas.length;
      c.maquinas.forEach((m) => {
        totalSelecciones += m.numeroProductos;
        if (m.rutaId) rutasUnicas.add(m.rutaId);
      });
    });

    return {
      totalClientes,
      maquinasAsignadas,
      maquinasEnBodega: maquinasSinAsignar.length,
      totalSelecciones,
      totalRutas: rutasUnicas.size,
    };
  }, [clientes, maquinasSinAsignar]);

  // Filtro en tiempo real
  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes;
    const term = searchTerm.toLowerCase();

    return clientes.filter((c) => {
      const matchCliente =
        c.razonSocial.toLowerCase().includes(term) ||
        c.sede.toLowerCase().includes(term) ||
        c.direccion.toLowerCase().includes(term) ||
        c.contacto.toLowerCase().includes(term) ||
        c.whatsapp.includes(term);

      const matchMaquina = c.maquinas.some(
        (m) =>
          m.codigoSerial.toLowerCase().includes(term) ||
          m.modelo.toLowerCase().includes(term) ||
          m.ubicacion.toLowerCase().includes(term) ||
          m.rutaNombre.toLowerCase().includes(term)
      );

      return matchCliente || matchMaquina;
    });
  }, [clientes, searchTerm]);

  // Filtro de máquinas en bodega
  const filteredMaquinasBodega = useMemo(() => {
    if (!searchTerm.trim()) return maquinasSinAsignar;
    const term = searchTerm.toLowerCase();
    return maquinasSinAsignar.filter(
      (m) =>
        m.codigoSerial.toLowerCase().includes(term) ||
        m.modelo.toLowerCase().includes(term) ||
        m.ubicacion.toLowerCase().includes(term)
    );
  }, [maquinasSinAsignar, searchTerm]);

  const handleEliminarMaquina = async (accion: "eliminar" | "desasignar") => {
    if (!maquinaAEliminar) return;
    setIsDeletingMaquina(true);
    setMensaje(null);

    const res = await eliminarMaquina(maquinaAEliminar.id, accion);
    setIsDeletingMaquina(false);

    if (res.success) {
      setMensaje({
        tipo: "success",
        texto:
          accion === "desasignar"
            ? `Máquina ${maquinaAEliminar.codigoSerial} desasignada y enviada a Bodega.`
            : `Máquina ${maquinaAEliminar.codigoSerial} eliminada permanentemente.`,
      });
      setMaquinaAEliminar(null);
    } else {
      setMensaje({
        tipo: "error",
        texto: res.error || "Error al procesar la máquina.",
      });
    }
  };

  const cleanWhatsAppNumber = (num: string) => {
    return num.replace(/\D/g, "");
  };

  return (
    <div className="space-y-6">
      {/* Alerta de notificación */}
      {mensaje && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in ${
            mensaje.tipo === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {mensaje.tipo === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{mensaje.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensaje(null)}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tarjetas KPI de Resumen Rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-stone-500 block">
              Total Clientes
            </span>
            <span className="text-lg font-black text-stone-900 dark:text-white">
              {stats.totalClientes}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-coffee-50 dark:bg-amber-950/40 text-coffee-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-stone-500 block">
              Máquinas en Clientes
            </span>
            <span className="text-lg font-black text-stone-900 dark:text-white">
              {stats.maquinasAsignadas}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-stone-500 block">
              Máquinas en Bodega
            </span>
            <span className="text-lg font-black text-stone-900 dark:text-white">
              {stats.maquinasEnBodega}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-stone-500 block">
              Selecciones / Bebidas
            </span>
            <span className="text-lg font-black text-stone-900 dark:text-white">
              {stats.totalSelecciones}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Acciones y Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-xs">
        {/* Input Buscador */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, sede, serial, modelo o ruta..."
            className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs outline-none focus:border-coffee-600 dark:text-white transition-all placeholder:text-stone-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Botones Principales */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsCrearClienteOpen(true)}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 border border-stone-200 dark:border-stone-700"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>+ Nuevo Cliente</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCrearMaquinaOpen(true)}
            className="px-4 py-2 bg-coffee-800 hover:bg-coffee-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-[0.99]"
          >
            <Coffee className="w-4 h-4 text-amber-300" />
            <span>+ Nueva Máquina</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: Máquinas Disponibles en Bodega / Sin Asignar (si existen) */}
      {filteredMaquinasBodega.length > 0 && (
        <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-3xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                <Warehouse className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-amber-950 dark:text-amber-200 flex items-center gap-2">
                  <span>Máquinas en Bodega / Sin Asignar</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                    {filteredMaquinasBodega.length} disponibles
                  </span>
                </h3>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-400">
                  Equipos desasociados o listos para ser instalados en nuevos puntos de venta
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredMaquinasBodega.map((m) => (
              <div
                key={m.id}
                className="bg-white dark:bg-stone-900 border border-amber-200/70 dark:border-stone-800 rounded-2xl p-4 shadow-xs space-y-3 hover:border-amber-400 dark:hover:border-amber-700 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-stone-900 dark:text-white text-xs bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md border border-stone-200 dark:border-stone-700">
                      {m.codigoSerial}
                    </span>
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block mt-1">
                      {m.modelo}
                    </span>
                    <span className="text-[11px] text-stone-500 block">
                      {m.ubicacion || "En Bodega / Taller"}
                    </span>
                    {m.latitud !== null && m.latitud !== undefined && m.longitud !== null && m.longitud !== undefined && (
                      <span
                        className="text-[10px] font-mono text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/60 dark:border-rose-800/60 inline-flex items-center gap-1 mt-1"
                        title={`GPS Bodega: ${m.latitud}, ${m.longitud}`}
                      >
                        <MapPin className="w-2.5 h-2.5 text-rose-600" />
                        <span>GPS {m.latitud.toFixed(4)}, {m.longitud.toFixed(4)}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedMaquinaParaEditar(m)}
                      className="p-1.5 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-lg shadow-2xs transition-colors"
                      title="Editar configuración o premezclas"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaquinaAEliminar(m)}
                      className="p-1.5 bg-stone-50 hover:bg-rose-50 dark:bg-stone-800 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 rounded-lg shadow-2xs transition-colors"
                      title="Eliminar permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Píldoras con Premezclas y Contadores */}
                <div className="flex flex-wrap gap-1 pt-1 border-t border-stone-100 dark:border-stone-800">
                  {m.configuraciones
                    .filter((c) => c.activa)
                    .map((cfg) => {
                      const bInfo = BEBIDAS_CATALOGO.find((b) => b.id === cfg.bebida);
                      return (
                        <span
                          key={cfg.bebida}
                          className="inline-flex items-center gap-1 text-[10px] bg-stone-50 dark:bg-stone-800/80 px-2 py-0.5 rounded-lg border border-stone-200/70 dark:border-stone-700 text-stone-700 dark:text-stone-300"
                        >
                          <span>{bInfo?.icono || "☕"}</span>
                          <span className="font-medium">{bInfo?.nombre || cfg.bebida}</span>
                          <span className="text-[9px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-stone-900 px-1 rounded">
                            {cfg.ultimoContador ?? cfg.contadorInicial ?? 0}
                          </span>
                        </span>
                      );
                    })}
                </div>

                {/* Botón Asignar a Cliente */}
                <button
                  type="button"
                  onClick={() => setMaquinaParaAsignar(m)}
                  className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Asignar a un Cliente</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN 2: Grid de Clientes y sus Máquinas */}
      {filteredClientes.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-10 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-stone-900 dark:text-white text-sm">
            {searchTerm ? "No se encontraron clientes o máquinas" : "No hay clientes registrados"}
          </h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {searchTerm
              ? `No hay coincidencias para "${searchTerm}". Intenta buscar con otro término.`
              : "Comienza registrando tu primer cliente corporativo o punto de venta para asociarle máquinas vending."}
          </p>
          {!searchTerm && (
            <button
              type="button"
              onClick={() => setIsCrearClienteOpen(true)}
              className="mt-2 px-4 py-2 bg-coffee-800 hover:bg-coffee-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4 text-amber-300" />
              <span>Registrar Primer Cliente</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {filteredClientes.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-xs space-y-4 hover:border-coffee-300 dark:hover:border-stone-700 transition-all"
            >
              {/* Header del Cliente */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-base text-stone-900 dark:text-white leading-tight">
                      {c.razonSocial}
                    </h4>
                    {c.activo !== false ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-coffee-700 dark:text-amber-400 font-semibold block mt-0.5">
                    {c.sede}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Botón Asociar Máquina directamente a este cliente */}
                  <button
                    type="button"
                    onClick={() => setCrearMaquinaClienteId(c.id)}
                    className="px-2.5 py-1.5 bg-coffee-50 hover:bg-coffee-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-coffee-800 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border border-coffee-200/80 dark:border-stone-700 shadow-2xs"
                    title="Asociar nueva máquina a este cliente"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
                    <span>+ Máquina</span>
                  </button>

                  {/* Botón Editar Cliente */}
                  <button
                    type="button"
                    onClick={() => setSelectedClienteParaEditar(c)}
                    className="p-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center transition-colors border border-stone-200 dark:border-stone-700 shadow-2xs"
                    title="Editar datos del cliente"
                  >
                    <Pencil className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                  </button>
                </div>
              </div>

              {/* Datos de Contacto */}
              <div className="space-y-1.5 text-xs text-stone-500 bg-stone-50/70 dark:bg-stone-800/40 p-3 rounded-2xl border border-stone-100 dark:border-stone-800">
                <p className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="text-stone-700 dark:text-stone-300 font-medium">
                    {c.direccion}
                  </span>
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>
                      WhatsApp:{" "}
                      <strong className="text-stone-800 dark:text-stone-200 font-bold font-mono">
                        {c.whatsapp}
                      </strong>{" "}
                      <span className="text-stone-400">({c.contacto})</span>
                    </span>
                  </p>
                  {c.whatsapp && (
                    <a
                      href={`https://wa.me/${cleanWhatsAppNumber(c.whatsapp)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                    >
                      <span>Abrir</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Listado de Máquinas Asociadas al Cliente */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                    <Coffee className="w-3 h-3 text-coffee-600 dark:text-amber-400" />
                    Máquinas Instaladas ({c.maquinas.length})
                  </span>
                </div>

                {c.maquinas.length > 0 ? (
                  <div className="space-y-3">
                    {c.maquinas.map((m) => {
                      const activeConfigs = m.configuraciones.filter((cfg) => cfg.activa);

                      return (
                        <div
                          key={m.id}
                          className="bg-stone-50/90 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 p-3.5 rounded-2xl space-y-3 hover:border-coffee-300 dark:hover:border-stone-600 transition-all shadow-2xs"
                        >
                          {/* Cabecera Máquina */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-stone-900 dark:text-white text-xs bg-white dark:bg-stone-900 px-2 py-0.5 rounded-lg border border-stone-200 dark:border-stone-700 shadow-2xs">
                                  {m.codigoSerial}
                                </span>
                                <span className="text-[10px] font-bold text-coffee-800 dark:text-amber-300 bg-coffee-100/80 dark:bg-stone-800 px-2 py-0.5 rounded-md border border-coffee-200 dark:border-stone-700">
                                  {m.numeroProductos} Selecciones
                                </span>
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                                  {m.rutaNombre}
                                </span>
                                {m.latitud !== null && m.latitud !== undefined && m.longitud !== null && m.longitud !== undefined ? (
                                  <span
                                    className="text-[10px] font-mono text-rose-700 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/60 dark:border-rose-800/60 flex items-center gap-1"
                                    title={`GPS Propio de la Máquina: ${m.latitud}, ${m.longitud}`}
                                  >
                                    <MapPin className="w-2.5 h-2.5 text-rose-600" />
                                    <span>GPS {m.latitud.toFixed(3)}, {m.longitud.toFixed(3)}</span>
                                  </span>
                                ) : c.latitud !== null && c.latitud !== undefined && c.longitud !== null && c.longitud !== undefined ? (
                                  <span
                                    className="text-[10px] text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md border border-stone-200/60 dark:border-stone-700 flex items-center gap-1"
                                    title={`Hereda GPS de la sede del cliente: ${c.latitud}, ${c.longitud}`}
                                  >
                                    <MapPin className="w-2.5 h-2.5 text-stone-400" />
                                    <span>GPS Cliente</span>
                                  </span>
                                ) : (
                                  <span
                                    className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-1"
                                    title="Sin coordenadas GPS asignadas"
                                  >
                                    <MapPin className="w-2.5 h-2.5 text-amber-500" />
                                    <span>Sin GPS</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-stone-500 block mt-1">
                                {m.modelo} • <span className="text-stone-700 dark:text-stone-300 font-medium">{m.ubicacion}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Botón Habilitar Re-liquidación si ya fue liquidada hoy */}
                              {m.liquidadaHoy && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const num = m.ultimoConsecutivo
                                      ? `LIQ-${m.ultimoConsecutivo.toString().padStart(4, "0")}`
                                      : "";
                                    if (
                                      !window.confirm(
                                        `¿Estás seguro de habilitar la máquina ${m.codigoSerial} ${num ? `(${num})` : ""} para re-liquidar hoy?\n\nLa liquidación de hoy será anulada y el inventario descontado será restaurado.`
                                      )
                                    ) {
                                      return;
                                    }
                                    const res = await habilitarReliquidacionHoy(m.id);
                                    if (res.success) {
                                      setMensaje({
                                        tipo: "success",
                                        texto:
                                          res.message ||
                                          `Máquina ${m.codigoSerial} habilitada para re-liquidar hoy.`,
                                      });
                                    } else {
                                      setMensaje({
                                        tipo: "error",
                                        texto:
                                          res.error ||
                                          "No se pudo habilitar la re-liquidación.",
                                      });
                                    }
                                  }}
                                  className="p-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 text-amber-700 dark:text-amber-300 rounded-xl shadow-2xs transition-colors"
                                  title="Habilitar re-liquidación de hoy (anula la liquidación actual y restaura inventario)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                </button>
                              )}

                              {/* Botón Editar / Reasignar */}
                              <button
                                type="button"
                                onClick={() => setSelectedMaquinaParaEditar(m)}
                                className="p-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-coffee-500 dark:hover:border-amber-400 text-stone-700 dark:text-stone-300 rounded-xl shadow-2xs transition-colors"
                                title="Editar máquina, reasignar a otro cliente o calibrar premezclas"
                              >
                                <Pencil className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
                              </button>

                              {/* Botón Desasignar / Enviar a Bodega */}
                              <button
                                type="button"
                                onClick={() => setMaquinaAEliminar(m)}
                                className="p-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-rose-400 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl shadow-2xs transition-colors"
                                title="Desasignar de este cliente o eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Píldoras de Bebidas con Premezcla y Contador */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {activeConfigs.length > 0 ? (
                              activeConfigs.map((cfg) => {
                                const bInfo = BEBIDAS_CATALOGO.find(
                                  (b) => b.id === cfg.bebida
                                );
                                return (
                                  <span
                                    key={cfg.bebida}
                                    className="inline-flex items-center gap-1.5 text-[10px] bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 px-2.5 py-1 rounded-xl border border-stone-200 dark:border-stone-700 shadow-2xs"
                                  >
                                    <span>{bInfo?.icono || "☕"}</span>
                                    <span className="font-semibold">{bInfo?.nombre || cfg.bebida}</span>
                                    <span className="text-[9px] text-stone-400 font-mono">
                                      (${cfg.precio.toLocaleString("es-CO")})
                                    </span>
                                    {cfg.insumoNombre && (
                                      <span
                                        className="text-[9px] text-stone-500 font-medium bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded"
                                        title={`Premezcla: ${cfg.insumoNombre} (${cfg.gramosPorTaza || 18}g)`}
                                      >
                                        {cfg.insumoNombre} ({cfg.gramosPorTaza || 18}g)
                                      </span>
                                    )}
                                    <span
                                      className="text-[9px] font-mono font-bold text-coffee-700 dark:text-amber-400 bg-coffee-50 dark:bg-stone-800 px-1.5 py-0.5 rounded-md border border-coffee-200/50 dark:border-stone-700"
                                      title="Último Contador / Contador Inicial configurado"
                                    >
                                      C: {(cfg.ultimoContador ?? cfg.contadorInicial ?? 0).toLocaleString("es-CO")}
                                    </span>
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 italic flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Sin bebidas calibradas. Haz clic en el lápiz para configurar.
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-stone-50/60 dark:bg-stone-800/40 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700/80 text-center space-y-2">
                    <p className="text-xs text-stone-400 italic">
                      No tiene máquinas vending asociadas actualmente.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCrearMaquinaClienteId(c.id)}
                      className="px-3 py-1.5 bg-coffee-50 hover:bg-coffee-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-coffee-800 dark:text-amber-300 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 border border-coffee-200 dark:border-stone-700"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
                      <span>Asociar Máquina a este Cliente</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Crear Nuevo Cliente */}
      {isCrearClienteOpen && (
        <CrearClienteModal
          onClose={() => setIsCrearClienteOpen(false)}
          onSuccess={() => {
            setMensaje({
              tipo: "success",
              texto: "Cliente registrado con éxito.",
            });
          }}
        />
      )}

      {/* Modal para Crear Nueva Máquina */}
      {(isCrearMaquinaOpen || crearMaquinaClienteId) && (
        <CrearMaquinaModal
          clientes={clientes.map((c) => ({
            id: c.id,
            razonSocial: c.razonSocial,
            sede: c.sede,
            latitud: c.latitud,
            longitud: c.longitud,
          }))}
          rutas={rutas}
          insumos={insumos}
          clientePreseleccionadoId={crearMaquinaClienteId || undefined}
          onClose={() => {
            setIsCrearMaquinaOpen(false);
            setCrearMaquinaClienteId(null);
          }}
          onSuccess={() => {
            setMensaje({
              tipo: "success",
              texto: "Máquina y premezclas configuradas con éxito.",
            });
          }}
        />
      )}

      {/* Modal para Asignar Máquina desde Bodega a Cliente */}
      {maquinaParaAsignar && (
        <AsignarMaquinaModal
          maquina={maquinaParaAsignar}
          clientes={clientes.map((c) => ({
            id: c.id,
            razonSocial: c.razonSocial,
            sede: c.sede,
          }))}
          rutas={rutas}
          onClose={() => setMaquinaParaAsignar(null)}
          onSuccess={() => {
            setMensaje({
              tipo: "success",
              texto: `Máquina ${maquinaParaAsignar.codigoSerial} asignada exitosamente al cliente.`,
            });
          }}
        />
      )}

      {/* Modal de Edición de Cliente */}
      {selectedClienteParaEditar && (
        <EditarClienteModal
          cliente={selectedClienteParaEditar}
          onClose={() => setSelectedClienteParaEditar(null)}
        />
      )}

      {/* Modal de Edición / Reasignación de Máquina */}
      {selectedMaquinaParaEditar && (
        <EditarMaquinaModal
          maquina={{
            id: selectedMaquinaParaEditar.id,
            codigoSerial: selectedMaquinaParaEditar.codigoSerial,
            modelo: selectedMaquinaParaEditar.modelo,
            ubicacion: selectedMaquinaParaEditar.ubicacion,
            numeroProductos: selectedMaquinaParaEditar.numeroProductos,
            clienteId: selectedMaquinaParaEditar.clienteId,
            rutaId: selectedMaquinaParaEditar.rutaId,
            latitud: selectedMaquinaParaEditar.latitud,
            longitud: selectedMaquinaParaEditar.longitud,
            liquidadaHoy: selectedMaquinaParaEditar.liquidadaHoy,
            ultimoConsecutivo: selectedMaquinaParaEditar.ultimoConsecutivo,
            configuraciones: selectedMaquinaParaEditar.configuraciones.map((c) => ({
              ...c,
              contadorInicial: c.contadorInicial ?? 0,
              ultimoContador: c.ultimoContador ?? c.contadorInicial ?? 0,
            })),
          }}
          clientes={clientes.map((c) => ({
            id: c.id,
            razonSocial: c.razonSocial,
            sede: c.sede,
            latitud: c.latitud,
            longitud: c.longitud,
          }))}
          rutas={rutas}
          insumos={insumos}
          onClose={() => setSelectedMaquinaParaEditar(null)}
          onSuccess={() => {
            setMensaje({
              tipo: "success",
              texto: "Máquina y calibración actualizadas correctamente.",
            });
          }}
        />
      )}

      {/* Modal de Confirmación para Desasignar o Eliminar Máquina */}
      {maquinaAEliminar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Warehouse className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                ¿Desasignar o Eliminar Máquina?
              </h3>
              <p className="text-xs text-stone-500">
                Máquina <strong className="text-stone-800 dark:text-stone-200">{maquinaAEliminar.codigoSerial}</strong> ({maquinaAEliminar.modelo}).
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleEliminarMaquina("desasignar")}
                disabled={isDeletingMaquina}
                className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingMaquina && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Desasignar y Enviar a Bodega</span>
              </button>

              <button
                type="button"
                onClick={() => handleEliminarMaquina("eliminar")}
                disabled={isDeletingMaquina}
                className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingMaquina && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Eliminar Permanentemente</span>
              </button>

              <button
                type="button"
                onClick={() => setMaquinaAEliminar(null)}
                disabled={isDeletingMaquina}
                className="w-full py-2.5 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
