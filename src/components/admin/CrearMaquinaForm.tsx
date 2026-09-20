"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Coffee, PlusCircle, Sliders, CheckCircle2, AlertCircle, Loader2, Sparkles, Hash } from "lucide-react";
import { BEBIDAS_CATALOGO, TipoBebidaEnum } from "@/types/liquidacion";
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

interface CrearMaquinaFormProps {
  clientes: ClienteOption[];
  rutas: RutaOption[];
}

interface SlotBebida {
  bebida: string;
  contadorInicial: number;
  precio: number;
  gramosCafe: number;
  gramosLeche: number;
  gramosCocoa: number;
}

const DEFAULT_RECIPES: Record<string, { precio: number; cafe: number; leche: number; cocoa: number }> = {
  CAFE_LARGO_TINTO: { precio: 1800, cafe: 2.2, leche: 0, cocoa: 0 },
  CAFE_CORTO_EXPRESO: { precio: 1800, cafe: 2.0, leche: 0, cocoa: 0 },
  CAPUCHINO_TRADICIONAL: { precio: 2500, cafe: 2.0, leche: 12.0, cocoa: 0 },
  CHOCOLATE_CHOCOMILK: { precio: 2400, cafe: 0, leche: 6.0, cocoa: 16.0 },
  CAPUCHINO_VAINILLA: { precio: 2500, cafe: 1.8, leche: 12.0, cocoa: 0 },
  MOCACCINO: { precio: 2800, cafe: 1.8, leche: 8.0, cocoa: 10.0 },
  LATTE: { precio: 2600, cafe: 1.5, leche: 15.0, cocoa: 0 },
};

export const CrearMaquinaForm: React.FC<CrearMaquinaFormProps> = ({
  clientes,
  rutas,
}) => {
  const [isPending, startTransition] = useTransition();
  const [numProductos, setNumProductos] = useState<number>(4);
  const [slots, setSlots] = useState<SlotBebida[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

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
          const rec = DEFAULT_RECIPES[bebidaKey] || { precio: 2500, cafe: 2.0, leche: 0, cocoa: 0 };
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
    const rec = DEFAULT_RECIPES[newBebida] || { precio: 2500, cafe: 2.0, leche: 0, cocoa: 0 };
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

  const handleSlotFieldChange = (index: number, field: keyof SlotBebida, value: number) => {
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
        form.reset();
        // Reset slots con contadores en 0
        setSlots((prev) => prev.map((s) => ({ ...s, contadorInicial: 0 })));
      } else {
        setMensaje({
          tipo: "error",
          texto: res.error || "Error al registrar la máquina",
        });
      }
    });
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <Coffee className="w-4 h-4 text-coffee-600 dark:text-amber-400" />
          Asociar Máquina a Cliente y Configurar Bebidas
        </h3>
        <span className="text-[11px] text-stone-400">
          Define contadores iniciales y recetas en 1 solo paso
        </span>
      </div>

      {mensaje && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 ${
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
          <span>{mensaje.texto}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Datos Básicos de la Máquina */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Cliente *
            </label>
            <select
              name="clienteId"
              required
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600"
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
              name="codigoSerial"
              required
              placeholder="ej. MAQ-2024-099"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Modelo *
            </label>
            <input
              type="text"
              name="modelo"
              required
              placeholder="ej. Bianchi Soluble 4T"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600"
            />
          </div>

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Ubicación en Local *
            </label>
            <input
              type="text"
              name="ubicacion"
              required
              placeholder="ej. Piso 2 Cafetería"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600"
            />
          </div>

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Ruta Asignada
            </label>
            <select
              name="rutaId"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600"
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

        {/* Selector de Número de Selecciones / Productos */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between mb-2">
            <label className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5 text-xs">
              <Sliders className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
              Número de Productos / Selecciones de la Máquina:
            </label>
            <select
              name="numeroProductos"
              value={numProductos}
              onChange={(e) => setNumProductos(parseInt(e.target.value, 10))}
              className="bg-coffee-50 dark:bg-stone-800 border border-coffee-200 dark:border-stone-700 rounded-lg px-2.5 py-1 font-bold text-coffee-800 dark:text-amber-300 text-xs outline-none"
            >
              <option value={3}>3 Productos</option>
              <option value={4}>4 Productos</option>
              <option value={6}>6 Productos</option>
              <option value={7}>7 Productos</option>
              <option value={8}>8 Productos</option>
            </select>
          </div>

          {/* Ranuras de Bebidas Dinámicas */}
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {slots.map((slot, idx) => {
              const info = BEBIDAS_CATALOGO.find((b) => b.id === slot.bebida);

              return (
                <div
                  key={idx}
                  className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-700/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-coffee-700 dark:text-amber-400 flex items-center gap-1.5 text-[11px]">
                      <span className="w-5 h-5 rounded-full bg-coffee-100 dark:bg-stone-700 flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <span>Selección {idx + 1}: {info?.icono} {info?.nombre}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Sabor */}
                    <div>
                      <label className="text-[10px] font-semibold text-stone-500 block mb-0.5">
                        Sabor / Bebida
                      </label>
                      <select
                        value={slot.bebida}
                        onChange={(e) => handleBebidaChange(idx, e.target.value)}
                        className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-1.5 text-xs outline-none"
                      >
                        {BEBIDAS_CATALOGO.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.icono} {b.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Contador Inicial */}
                    <div>
                      <label className="text-[10px] font-semibold text-stone-700 dark:text-stone-300 block mb-0.5">
                        Contador Inicial *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={slot.contadorInicial}
                        onChange={(e) =>
                          handleSlotFieldChange(idx, "contadorInicial", parseInt(e.target.value || "0", 10))
                        }
                        placeholder="ej. 1450"
                        className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-1.5 text-xs font-mono font-bold text-stone-900 dark:text-white outline-none focus:border-coffee-600"
                      />
                    </div>

                    {/* Precio Unitario */}
                    <div>
                      <label className="text-[10px] font-semibold text-stone-500 block mb-0.5">
                        Precio Unitario ($ COP)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        required
                        value={slot.precio}
                        onChange={(e) =>
                          handleSlotFieldChange(idx, "precio", parseFloat(e.target.value || "0"))
                        }
                        className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-1.5 text-xs font-mono font-semibold text-coffee-700 dark:text-amber-300 outline-none"
                      />
                    </div>
                  </div>

                  {/* Gramajes */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-stone-200/50 dark:border-stone-700/50 text-[10px]">
                    <div>
                      <label className="text-stone-500 block">Café (g):</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={slot.gramosCafe}
                        onChange={(e) =>
                          handleSlotFieldChange(idx, "gramosCafe", parseFloat(e.target.value || "0"))
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
                        value={slot.gramosLeche}
                        onChange={(e) =>
                          handleSlotFieldChange(idx, "gramosLeche", parseFloat(e.target.value || "0"))
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
                        value={slot.gramosCocoa}
                        onChange={(e) =>
                          handleSlotFieldChange(idx, "gramosCocoa", parseFloat(e.target.value || "0"))
                        }
                        className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-1 font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-coffee-800 hover:bg-coffee-900 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Guardando Máquina y Calibración...</span>
            </>
          ) : (
            <span>Guardar Máquina y Contadores Iniciales</span>
          )}
        </button>
      </form>
    </div>
  );
};
