"use client";

import React, { useState, useTransition, useEffect } from "react";
import {
  Coffee,
  X,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Hash,
  Sparkles,
  Package,
  PlusCircle,
  Layers,
  MapPin,
  Tag,
  Navigation,
} from "lucide-react";
import { BEBIDAS_CATALOGO } from "@/types/liquidacion";
import { crearMaquina } from "@/actions/admin";

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

interface CrearMaquinaModalProps {
  clientes: ClienteOption[];
  rutas: RutaOption[];
  insumos?: InsumoOption[];
  clientePreseleccionadoId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SlotBebida {
  bebida: string;
  insumoId: string | null;
  gramosPorTaza: number;
  contadorInicial: number;
  precio: number;
}

const DEFAULT_PREMIX_RECIPES: Record<
  string,
  { precio: number; gramos: number; matchCode: string }
> = {
  CAFE_LARGO_TINTO: { precio: 1800, gramos: 2.2, matchCode: "INS-CAFE-SOLUBLE" },
  CAFE_CORTO_EXPRESO: { precio: 1800, gramos: 2.0, matchCode: "INS-CAFE-SOLUBLE" },
  CAPUCHINO_TRADICIONAL: { precio: 2500, gramos: 18.0, matchCode: "INS-PREM-CAPUCHINO-TRAD" },
  CHOCOLATE_CHOCOMILK: { precio: 2400, gramos: 20.0, matchCode: "INS-PREM-CHOCOLATE" },
  CAPUCHINO_VAINILLA: { precio: 2500, gramos: 18.0, matchCode: "INS-PREM-CAPUCHINO-VAINILLA" },
  MOCACCINO: { precio: 2800, gramos: 18.0, matchCode: "INS-PREM-MOCACCINO" },
  LATTE: { precio: 2600, gramos: 18.0, matchCode: "INS-LECHE-POLVO" },
};

export const CrearMaquinaModal: React.FC<CrearMaquinaModalProps> = ({
  clientes,
  rutas,
  insumos = [],
  clientePreseleccionadoId,
  onClose,
  onSuccess,
}) => {
  const [isPending, startTransition] = useTransition();
  const [selectedClienteId, setSelectedClienteId] = useState<string>(
    clientePreseleccionadoId || (clientes[0]?.id ?? "none")
  );
  const [numProductos, setNumProductos] = useState<number>(4);
  const [slots, setSlots] = useState<SlotBebida[]>([]);
  const [latitud, setLatitud] = useState<string>("");
  const [longitud, setLongitud] = useState<string>("");

  const handleCopiarCoordenadasCliente = () => {
    const c = clientes.find((cli) => cli.id === selectedClienteId);
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

  const [mensaje, setMensaje] = useState<{
    tipo: "success" | "error";
    texto: string;
  } | null>(null);

  // Helper para buscar insumo por código preferido o nombre
  const findInsumoIdForBebida = (bebidaKey: string): string | null => {
    const rec = DEFAULT_PREMIX_RECIPES[bebidaKey];
    if (rec && insumos.length > 0) {
      const matchByCode = insumos.find((i) => i.codigo === rec.matchCode);
      if (matchByCode) return matchByCode.id;

      // Buscar por coincidencia parcial de nombre
      if (bebidaKey.includes("CAPUCHINO")) {
        const matchCap = insumos.find((i) => i.nombre.toLowerCase().includes("capuchino"));
        if (matchCap) return matchCap.id;
      }
      if (bebidaKey.includes("CHOCOLATE")) {
        const matchChoc = insumos.find((i) => i.nombre.toLowerCase().includes("chocolate") || i.nombre.toLowerCase().includes("cocoa"));
        if (matchChoc) return matchChoc.id;
      }
      if (bebidaKey.includes("CAFE")) {
        const matchCafe = insumos.find((i) => i.nombre.toLowerCase().includes("café") || i.nombre.toLowerCase().includes("cafe"));
        if (matchCafe) return matchCafe.id;
      }
    }
    return insumos[0]?.id || null;
  };

  // Inicializar ranuras según numProductos
  useEffect(() => {
    const defaultBebidasOrder = [
      "CAFE_LARGO_TINTO",
      "CAFE_CORTO_EXPRESO",
      "CAPUCHINO_TRADICIONAL",
      "CHOCOLATE_CHOCOMILK",
      "CAPUCHINO_VAINILLA",
      "MOCACCINO",
      "LATTE",
    ];

    setSlots((prev) => {
      const newSlots: SlotBebida[] = [];
      for (let i = 0; i < numProductos; i++) {
        if (prev[i]) {
          newSlots.push(prev[i]);
        } else {
          const bebidaKey = defaultBebidasOrder[i % defaultBebidasOrder.length];
          const rec = DEFAULT_PREMIX_RECIPES[bebidaKey] || {
            precio: 2500,
            gramos: 18.0,
            matchCode: "",
          };
          const matchedInsumoId = findInsumoIdForBebida(bebidaKey);

          newSlots.push({
            bebida: bebidaKey,
            insumoId: matchedInsumoId,
            gramosPorTaza: rec.gramos,
            contadorInicial: 0,
            precio: rec.precio,
          });
        }
      }
      return newSlots;
    });
  }, [numProductos, insumos]);

  const handleBebidaChange = (index: number, newBebida: string) => {
    const rec = DEFAULT_PREMIX_RECIPES[newBebida] || {
      precio: 2500,
      gramos: 18.0,
      matchCode: "",
    };
    const matchedInsumoId = findInsumoIdForBebida(newBebida);

    setSlots((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        bebida: newBebida,
        insumoId: matchedInsumoId,
        gramosPorTaza: rec.gramos,
        precio: rec.precio,
      };
      return updated;
    });
  };

  const handleSlotFieldChange = (
    index: number,
    field: keyof SlotBebida,
    value: any
  ) => {
    setSlots((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensaje(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append("bebidasJson", JSON.stringify(slots));

    startTransition(async () => {
      const res = await crearMaquina(formData);
      if (res.success) {
        setMensaje({
          tipo: "success",
          texto: "¡Máquina y contadores iniciales configurados exitosamente!",
        });
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setMensaje({
          tipo: "error",
          texto: res.error || "Error al registrar la máquina",
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-coffee-100 dark:bg-amber-950/60 flex items-center justify-center text-coffee-700 dark:text-amber-400">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-base">
                Registrar Máquina y Configurar Premezclas
              </h3>
              <p className="text-xs text-stone-500">
                Define premezclas por contenedor/ranura, contadores iniciales y calibración en un solo paso
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {mensaje && (
            <div
              className={`p-3.5 rounded-2xl flex items-center gap-2.5 ${
                mensaje.tipo === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              }`}
            >
              {mensaje.tipo === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-medium">{mensaje.texto}</span>
            </div>
          )}

          {/* Sección 1: Información General de la Máquina */}
          <div className="bg-stone-50/80 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700/80 rounded-2xl p-4 space-y-3.5">
            <h4 className="font-bold text-stone-900 dark:text-white flex items-center gap-2 text-xs">
              <Tag className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
              Datos Generales de la Máquina
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Cliente Asignado
                </label>
                <select
                  name="clienteId"
                  value={selectedClienteId}
                  onChange={(e) => setSelectedClienteId(e.target.value)}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
                >
                  <option value="none">-- Dejar en Bodega (Sin Asignar) --</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razonSocial} ({c.sede})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Código Serial / Placa *
                </label>
                <input
                  type="text"
                  name="codigoSerial"
                  required
                  placeholder="ej. MAQ-2024-099"
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Modelo *
                </label>
                <input
                  type="text"
                  name="modelo"
                  required
                  placeholder="ej. Bianchi BVM 951 Soluble"
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Ubicación en Local
                </label>
                <input
                  type="text"
                  name="ubicacion"
                  placeholder={selectedClienteId === "none" ? "En Bodega / Taller" : "ej. Piso 2 Cafetería"}
                  defaultValue={selectedClienteId === "none" ? "En Bodega / Taller" : "Piso 1 Principal"}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Ruta / Circuito Asignado
                </label>
                <select
                  name="rutaId"
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

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Número de Selecciones / Productos *
                </label>
                <select
                  name="numeroProductos"
                  value={numProductos}
                  onChange={(e) => setNumProductos(parseInt(e.target.value, 10))}
                  className="w-full bg-coffee-50 dark:bg-stone-800 border border-coffee-200 dark:border-stone-700 rounded-xl p-2.5 font-bold text-coffee-800 dark:text-amber-300 outline-none"
                >
                  <option value={3}>3 Productos</option>
                  <option value={4}>4 Productos</option>
                  <option value={6}>6 Productos</option>
                  <option value={7}>7 Productos</option>
                  <option value={8}>8 Productos</option>
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
                    Permite ubicar exactamente la máquina en el mapa de rutas.
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedClienteId !== "none" && (
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
                    name="latitud"
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
                    name="longitud"
                    value={longitud}
                    onChange={(e) => setLongitud(e.target.value)}
                    placeholder="ej. -74.112340"
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2 text-xs outline-none focus:border-coffee-600 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sección 2: Configuración de Ranuras con Premezclas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 dark:text-white flex items-center gap-2 text-xs">
                <Sliders className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
                Configuración de Premezclas y Contadores ({slots.length} ranuras)
              </h4>
              <span className="text-[11px] text-stone-500">
                Selecciona la premezcla de bodega y su gramaje por taza
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {slots.map((slot, idx) => {
                const info = BEBIDAS_CATALOGO.find((b) => b.id === slot.bebida);

                return (
                  <div
                    key={idx}
                    className="p-4 bg-stone-50/70 dark:bg-stone-800/60 rounded-2xl border border-stone-200/80 dark:border-stone-700/80 space-y-3 hover:border-coffee-300 dark:hover:border-stone-600 transition-all shadow-2xs"
                  >
                    {/* Header de Ranura */}
                    <div className="flex items-center justify-between border-b border-stone-200/50 dark:border-stone-700/50 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-coffee-100 dark:bg-stone-700 font-bold text-coffee-800 dark:text-amber-300 flex items-center justify-center text-xs">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-stone-900 dark:text-white text-xs flex items-center gap-1.5">
                          <span>{info?.icono || "☕"}</span>
                          <span>{info?.nombre || slot.bebida}</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">
                        Ranura {idx + 1}
                      </span>
                    </div>

                    {/* Fila 1: Sabor de Bebida y Premezcla de Bodega */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                          Sabor / Bebida
                        </label>
                        <select
                          value={slot.bebida}
                          onChange={(e) => handleBebidaChange(idx, e.target.value)}
                          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2 text-xs outline-none"
                        >
                          {BEBIDAS_CATALOGO.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.icono} {b.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1 flex items-center gap-1">
                          <Package className="w-3 h-3 text-coffee-600 dark:text-amber-400" />
                          Premezcla / Insumo
                        </label>
                        <select
                          value={slot.insumoId || ""}
                          onChange={(e) =>
                            handleSlotFieldChange(idx, "insumoId", e.target.value || null)
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
                    </div>

                    {/* Fila 2: Gramaje, Contador Inicial y Precio */}
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                          Gramaje (g) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            required
                            value={slot.gramosPorTaza}
                            onChange={(e) =>
                              handleSlotFieldChange(
                                idx,
                                "gramosPorTaza",
                                parseFloat(e.target.value || "0")
                              )
                            }
                            placeholder="18"
                            className="w-full pr-6 pl-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono font-bold text-stone-900 dark:text-white outline-none focus:border-coffee-600"
                          />
                          <span className="text-[10px] text-stone-400 absolute right-2 top-1/2 -translate-y-1/2">
                            g
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-900 dark:text-white block mb-1">
                          Contador Inicial *
                        </label>
                        <div className="relative">
                          <Hash className="w-3 h-3 text-stone-400 absolute left-2 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            min="0"
                            required
                            value={slot.contadorInicial}
                            onChange={(e) =>
                              handleSlotFieldChange(
                                idx,
                                "contadorInicial",
                                parseInt(e.target.value || "0", 10)
                              )
                            }
                            placeholder="0"
                            className="w-full pl-6 pr-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono font-black text-stone-900 dark:text-white outline-none focus:border-coffee-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                          Precio ($ COP)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          required
                          value={slot.precio}
                          onChange={(e) =>
                            handleSlotFieldChange(
                              idx,
                              "precio",
                              parseFloat(e.target.value || "0")
                            )
                          }
                          className="w-full px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono font-bold text-coffee-700 dark:text-amber-300 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer / Botones */}
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
              className="py-2.5 px-6 bg-coffee-800 hover:bg-coffee-900 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando Máquina y Premezclas...</span>
                </>
              ) : (
                <span>Guardar Máquina y Calibración</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
