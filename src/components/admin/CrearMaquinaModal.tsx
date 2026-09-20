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
  PlusCircle,
  Layers,
  MapPin,
  Tag,
} from "lucide-react";
import { BEBIDAS_CATALOGO } from "@/types/liquidacion";
import { crearMaquina } from "@/actions/admin";

interface ClienteOption {
  id: string;
  razonSocial: string;
  sede: string;
}

interface RutaOption {
  id: string;
  nombre: string;
}

interface CrearMaquinaModalProps {
  clientes: ClienteOption[];
  rutas: RutaOption[];
  clientePreseleccionadoId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SlotBebida {
  bebida: string;
  contadorInicial: number;
  precio: number;
  gramosCafe: number;
  gramosLeche: number;
  gramosCocoa: number;
}

const DEFAULT_RECIPES: Record<
  string,
  { precio: number; cafe: number; leche: number; cocoa: number }
> = {
  CAFE_LARGO_TINTO: { precio: 1800, cafe: 2.2, leche: 0, cocoa: 0 },
  CAFE_CORTO_EXPRESO: { precio: 1800, cafe: 2.0, leche: 0, cocoa: 0 },
  CAPUCHINO_TRADICIONAL: { precio: 2500, cafe: 2.0, leche: 12.0, cocoa: 0 },
  CHOCOLATE_CHOCOMILK: { precio: 2400, cafe: 0, leche: 6.0, cocoa: 16.0 },
  CAPUCHINO_VAINILLA: { precio: 2500, cafe: 1.8, leche: 12.0, cocoa: 0 },
  MOCACCINO: { precio: 2800, cafe: 1.8, leche: 8.0, cocoa: 10.0 },
  LATTE: { precio: 2600, cafe: 1.5, leche: 15.0, cocoa: 0 },
};

export const CrearMaquinaModal: React.FC<CrearMaquinaModalProps> = ({
  clientes,
  rutas,
  clientePreseleccionadoId,
  onClose,
  onSuccess,
}) => {
  const [isPending, startTransition] = useTransition();
  const [selectedClienteId, setSelectedClienteId] = useState<string>(
    clientePreseleccionadoId || (clientes[0]?.id ?? "")
  );
  const [numProductos, setNumProductos] = useState<number>(4);
  const [slots, setSlots] = useState<SlotBebida[]>([]);
  const [mensaje, setMensaje] = useState<{
    tipo: "success" | "error";
    texto: string;
  } | null>(null);

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
          const rec =
            DEFAULT_RECIPES[bebidaKey] || {
              precio: 2500,
              cafe: 2.0,
              leche: 0,
              cocoa: 0,
            };
          newSlots.push({
            bebida: bebidaKey,
            contadorInicial: 0,
            precio: rec.precio,
            gramosCafe: rec.cafe,
            gramosLeche: rec.leche,
            gramosCocoa: rec.cocoa,
          });
        }
      }
      return newSlots;
    });
  }, [numProductos]);

  const handleBebidaChange = (index: number, newBebida: string) => {
    const rec =
      DEFAULT_RECIPES[newBebida] || {
        precio: 2500,
        cafe: 2.0,
        leche: 0,
        cocoa: 0,
      };
    setSlots((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        bebida: newBebida,
        precio: rec.precio,
        gramosCafe: rec.cafe,
        gramosLeche: rec.leche,
        gramosCocoa: rec.cocoa,
      };
      return updated;
    });
  };

  const handleSlotFieldChange = (
    index: number,
    field: keyof SlotBebida,
    value: number
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
                Asociar Máquina a Cliente y Configurar Bebidas
              </h3>
              <p className="text-xs text-stone-500">
                Define serial, ubicación, contadores iniciales y recetas en un solo paso
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
                  Cliente Asignado *
                </label>
                <select
                  name="clienteId"
                  required
                  value={selectedClienteId}
                  onChange={(e) => setSelectedClienteId(e.target.value)}
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
                  placeholder="ej. Bianchi BVM 951"
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Ubicación en Local *
                </label>
                <input
                  type="text"
                  name="ubicacion"
                  required
                  placeholder="ej. Piso 2 Cafetería"
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
          </div>

          {/* Sección 2: Configuración de Ranuras de Bebidas (Cuadrícula Espaciosa) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 dark:text-white flex items-center gap-2 text-xs">
                <Sliders className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
                Configuración de Bebidas y Contadores Iniciales ({slots.length} ranuras)
              </h4>
              <span className="text-[11px] text-stone-500">
                Cada ranura tiene su propio sabor, contador inicial y calibración
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

                    {/* Sabor y Contador Inicial */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-1">
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
                        <label className="text-[10px] font-bold text-stone-900 dark:text-white block mb-1">
                          Contador Inicial *
                        </label>
                        <div className="relative">
                          <Hash className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
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
                            placeholder="ej. 0"
                            className="w-full pl-7 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2 text-xs font-mono font-black text-stone-900 dark:text-white outline-none focus:border-coffee-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                          Precio Unitario ($ COP)
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
                          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2 text-xs font-mono font-bold text-coffee-700 dark:text-amber-300 outline-none"
                        />
                      </div>
                    </div>

                    {/* Gramajes de Receta */}
                    <div className="pt-2 border-t border-stone-200/50 dark:border-stone-700/50">
                      <span className="text-[10px] font-semibold text-stone-500 block mb-1.5">
                        Calibración Inicial de Gramajes:
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white dark:bg-stone-900 p-1.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
                          <label className="text-[10px] text-stone-500 block">
                            Café (g):
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={slot.gramosCafe}
                            onChange={(e) =>
                              handleSlotFieldChange(
                                idx,
                                "gramosCafe",
                                parseFloat(e.target.value || "0")
                              )
                            }
                            className="w-full bg-transparent font-mono font-bold text-xs outline-none dark:text-white mt-0.5"
                          />
                        </div>
                        <div className="bg-white dark:bg-stone-900 p-1.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
                          <label className="text-[10px] text-stone-500 block">
                            Leche (g):
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={slot.gramosLeche}
                            onChange={(e) =>
                              handleSlotFieldChange(
                                idx,
                                "gramosLeche",
                                parseFloat(e.target.value || "0")
                              )
                            }
                            className="w-full bg-transparent font-mono font-bold text-xs outline-none dark:text-white mt-0.5"
                          />
                        </div>
                        <div className="bg-white dark:bg-stone-900 p-1.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
                          <label className="text-[10px] text-stone-500 block">
                            Cocoa (g):
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={slot.gramosCocoa}
                            onChange={(e) =>
                              handleSlotFieldChange(
                                idx,
                                "gramosCocoa",
                                parseFloat(e.target.value || "0")
                              )
                            }
                            className="w-full bg-transparent font-mono font-bold text-xs outline-none dark:text-white mt-0.5"
                          />
                        </div>
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
                  <span>Guardando Máquina y Calibración...</span>
                </>
              ) : (
                <span>Guardar Máquina y Contadores Iniciales</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
