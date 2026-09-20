"use client";

import React, { useState } from "react";
import { formatCOP, formatFechaColombia } from "@/lib/utils";
import {
  crearInsumo,
  cargarInsumosEstandar,
  registrarEntradaBodega,
  eliminarInsumo,
} from "@/actions/admin";
import {
  Package,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  History,
  Boxes,
  Sparkles,
  Inbox,
  X,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { EditarInsumoModal } from "./EditarInsumoModal";

export interface InsumoItem {
  id: string;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  costoPromedio: number;
}

export interface MovimientoItem {
  id: string;
  insumoNombre: string;
  unidadMedida?: string;
  tipo: string;
  cantidad: number;
  costoUnitario: number | null;
  referencia: string | null;
  fecha: string;
}

interface InventarioBodegaManagerProps {
  initialData: {
    insumos: InsumoItem[];
    movimientos: MovimientoItem[];
  };
}

export const InventarioBodegaManager: React.FC<InventarioBodegaManagerProps> = ({
  initialData,
}) => {
  const { insumos, movimientos } = initialData;

  const [isCreatingInsumo, setIsCreatingInsumo] = useState(false);
  const [selectedInsumoParaEditar, setSelectedInsumoParaEditar] = useState<InsumoItem | null>(null);
  const [insumoAEliminar, setInsumoAEliminar] = useState<InsumoItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingStandard, setLoadingStandard] = useState(false);
  const [submittingInsumo, setSubmittingInsumo] = useState(false);
  const [submittingCompra, setSubmittingCompra] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Manejar creación de insumo personalizado
  const handleCrearInsumo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingInsumo(true);
    setMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await crearInsumo(formData);
    setSubmittingInsumo(false);

    if (res.success) {
      setIsCreatingInsumo(false);
      setMessage({
        type: "success",
        text: "Insumo registrado exitosamente en la bodega.",
      });
      form.reset();
    } else {
      setMessage({
        type: "error",
        text: res.error || "Error al crear el insumo.",
      });
    }
  };

  // Manejar carga de los 5 insumos estándar en 1 clic
  const handleCargarEstandar = async () => {
    setLoadingStandard(true);
    setMessage(null);

    const res = await cargarInsumosEstandar();
    setLoadingStandard(false);

    if (res.success) {
      setMessage({
        type: "success",
        text: `Se han configurado ${res.creados} insumos estándar de café vending en la bodega.`,
      });
    } else {
      setMessage({
        type: "error",
        text: res.error || "Error al cargar los insumos estándar.",
      });
    }
  };

  // Manejar registro de compra / entrada
  const handleRegistrarCompra = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingCompra(true);
    setMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await registrarEntradaBodega(formData);
    setSubmittingCompra(false);

    if (res.success) {
      setMessage({
        type: "success",
        text: "Entrada de mercancía registrada exitosamente en el Kárdex.",
      });
      form.reset();
    } else {
      setMessage({
        type: "error",
        text: res.error || "Error al registrar la entrada.",
      });
    }
  };

  // Manejar eliminación de insumo
  const handleEliminarInsumo = async () => {
    if (!insumoAEliminar) return;
    setIsDeleting(true);
    setMessage(null);

    const res = await eliminarInsumo(insumoAEliminar.id);
    setIsDeleting(false);

    if (res.success) {
      setMessage({
        type: "success",
        text: `Insumo "${insumoAEliminar.nombre}" eliminado exitosamente de la bodega.`,
      });
      setInsumoAEliminar(null);
    } else {
      setMessage({
        type: "error",
        text: res.error || "Error al eliminar el insumo.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Mensaje de alerta */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-stone-400 hover:text-stone-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabecera y Botones de Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-coffee-700 dark:text-amber-400" />
            Inventario y Bodega de Insumos
          </h2>
          <p className="text-xs text-stone-500">
            Control de existencias, compras a proveedores y Kárdex de consumo teórico
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Cargar Insumos Estándar (1 Clic) */}
          <button
            type="button"
            onClick={handleCargarEstandar}
            disabled={loadingStandard}
            className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 text-amber-900 dark:text-amber-300 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {loadingStandard ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
            <span>Cargar Insumos Estándar (1 Clic)</span>
          </button>

          {/* Botón Crear Insumo */}
          <button
            type="button"
            onClick={() => setIsCreatingInsumo(true)}
            className="px-3.5 py-2 bg-coffee-800 hover:bg-coffee-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-amber-300" />
            <span>+ Crear Nuevo Insumo</span>
          </button>
        </div>
      </div>

      {/* Si la bodega está vacía */}
      {insumos.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
            <Inbox className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-stone-900 dark:text-white">
              No hay insumos registrados en bodega
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Para que el sistema descuente automáticamente café, leche, cocoa y vasos en cada liquidación, debes registrar los insumos de tu operación.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleCargarEstandar}
              disabled={loadingStandard}
              className="w-full sm:w-auto px-5 py-2.5 bg-coffee-800 hover:bg-coffee-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Cargar 5 Insumos Estándar (Recomendado)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingInsumo(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Crear Insumo Manualmente</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Explicación Didáctica del Costo Promedio Ponderado */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-stone-900 dark:to-stone-900/80 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 text-xs space-y-2 text-stone-700 dark:text-stone-300">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs">
              <HelpCircle className="w-4 h-4 text-coffee-600 dark:text-amber-400 shrink-0" />
              <span>¿Cómo se calcula el Costo Promedio en VendyTrack? (Método Promedio Ponderado)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
              Cada vez que registras una nueva compra de insumos a un precio distinto, el sistema actualiza automáticamente el costo unitario para que tus costos y márgenes de ganancia reflejen la realidad:
            </p>
            <div className="bg-white/90 dark:bg-stone-800/90 rounded-xl p-2.5 font-mono text-[11px] text-coffee-950 dark:text-amber-200 border border-amber-200/60 dark:border-stone-700 shadow-2xs">
              Nuevo Costo Promedio = [ (Stock Previo × Costo Previo) + (Cantidad Entrada × Costo Compra) ] ÷ Nuevo Stock Total
            </div>
            <p className="text-[10px] text-stone-500 italic">
              <strong>Ejemplo práctico:</strong> Si tienes 10 kg en bodega a $30.000 ($300.000) y compras 10 kg a $40.000 ($400.000), tendrás 20 kg valorados en $700.000. El nuevo costo promedio automático será <strong>$35.000 / kg</strong>.
            </p>
          </div>

          {/* Grid de Insumos en Bodega */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {insumos.map((i) => {
            const isLowStock = i.stockActual <= i.stockMinimo;

            return (
              <div
                key={i.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-coffee-300 transition-colors"
              >
                {isLowStock && (
                  <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Stock Bajo
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-coffee-600 dark:text-amber-400 block">
                      {i.codigo}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-0.5">
                      {i.nombre}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedInsumoParaEditar(i)}
                      className="p-1.5 text-stone-400 hover:text-coffee-700 dark:hover:text-amber-300 hover:bg-coffee-50 dark:hover:bg-stone-800 rounded-lg transition-colors border border-transparent hover:border-coffee-200 dark:hover:border-stone-700 shadow-xs"
                      title="Editar insumo"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInsumoAEliminar(i)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900 shadow-xs"
                      title="Eliminar insumo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
                  <div>
                    <span className="text-[11px] text-stone-500 block">Stock Actual</span>
                    <span
                      className={`text-lg font-black ${
                        isLowStock
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-stone-900 dark:text-white"
                      }`}
                    >
                      {i.stockActual.toLocaleString("es-CO")}{" "}
                      <span className="text-xs font-semibold text-stone-500">
                        {i.unidadMedida.toLowerCase()}
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-stone-500 block">Costo Promedio</span>
                    <span className="text-sm font-bold text-coffee-700 dark:text-amber-300">
                      {formatCOP(i.costoPromedio)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                  <span>
                    Mínimo: <strong>{i.stockMinimo} {i.unidadMedida.toLowerCase()}</strong>
                  </span>
                  {isLowStock ? (
                    <span className="text-rose-500 font-semibold">Reponer urgente</span>
                  ) : (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Óptimo
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Formulario de Entrada / Compra de Mercancía */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-emerald-600" />
          Registrar Entrada de Mercancía a Bodega (Compra a Proveedor)
        </h3>

        {insumos.length === 0 ? (
          <p className="text-xs text-stone-400">
            Primero debes registrar o cargar insumos para poder ingresar compras.
          </p>
        ) : (
          <form
            onSubmit={handleRegistrarCompra}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs"
          >
            <div>
              <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Insumo *
              </label>
              <select
                name="insumoId"
                required
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              >
                {insumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} ({i.unidadMedida})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Cantidad Recibida *
              </label>
              <input
                type="number"
                step="any"
                name="cantidad"
                placeholder="ej. 25"
                required
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Costo Unitario ($ COP) *
              </label>
              <input
                type="number"
                step="any"
                name="costoUnitario"
                placeholder="ej. 42000"
                required
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Proveedor / Factura
              </label>
              <input
                type="text"
                name="proveedor"
                placeholder="ej. Colcafé / FAC-102"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submittingCompra}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submittingCompra && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ingresar a Bodega</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Historial de Kárdex */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <History className="w-4 h-4 text-coffee-600 dark:text-amber-400" />
          Kárdex de Movimientos Recientes
        </h3>

        {movimientos.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">
            No hay movimientos registrados en el Kárdex aún.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 font-semibold">
                  <th className="pb-3">Fecha</th>
                  <th className="pb-3">Insumo</th>
                  <th className="pb-3">Tipo</th>
                  <th className="pb-3 text-right">Cantidad / Unidad</th>
                  <th className="pb-3 text-right">Costo Unit.</th>
                  <th className="pb-3">Referencia / Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {movimientos.map((m) => {
                  const isEntry = m.tipo === "ENTRADA_COMPRA";
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30"
                    >
                      <td className="py-2.5 text-stone-500">
                        {formatFechaColombia(m.fecha)}
                      </td>
                      <td className="py-2.5 font-bold text-stone-800 dark:text-stone-200">
                        {m.insumoNombre}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            isEntry
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                          }`}
                        >
                          {isEntry ? (
                            <TrendingUp className="w-2.5 h-2.5" />
                          ) : (
                            <TrendingDown className="w-2.5 h-2.5" />
                          )}
                          {isEntry ? "Entrada / Compra" : "Salida Teórica"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-black">
                        {isEntry ? "+" : "-"}
                        {m.cantidad.toLocaleString("es-CO")}{" "}
                        <span className="text-[10px] text-stone-400 font-normal">
                          {m.unidadMedida || ""}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-stone-500">
                        {m.costoUnitario ? formatCOP(m.costoUnitario) : "-"}
                      </td>
                      <td className="py-2.5 text-stone-500">
                        {m.referencia || "Visita de ruta"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Crear Nuevo Insumo */}
      {isCreatingInsumo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  Crear Nuevo Insumo de Bodega
                </h3>
                <span className="text-xs text-stone-400">
                  Materia prima o consumible para las máquinas vending
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingInsumo(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearInsumo} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Nombre del Insumo *
                </label>
                <input
                  type="text"
                  name="nombre"
                  placeholder="ej. Café Soluble Liofilizado"
                  required
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 outline-none focus:border-coffee-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Código Interno
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    placeholder="ej. INS-CAFE-SOLUBLE"
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 outline-none focus:border-coffee-600 font-mono"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">
                    Opcional (se autogenera)
                  </span>
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Unidad de Medida *
                  </label>
                  <select
                    name="unidadMedida"
                    defaultValue="KG"
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 outline-none focus:border-coffee-600"
                  >
                    <option value="KG">Kilogramos (KG)</option>
                    <option value="GRAMOS">Gramos (GRAMOS)</option>
                    <option value="UNIDADES">Unidades (UNIDADES)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Stock Inicial
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="stockInicial"
                    defaultValue="0"
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 outline-none focus:border-coffee-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="stockMinimo"
                    defaultValue="5"
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 outline-none focus:border-coffee-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Costo Compra ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="costoPromedio"
                    defaultValue="0"
                    placeholder="ej. 35000"
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 outline-none focus:border-coffee-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Factura de Compra / Referencia
                </label>
                <input
                  type="text"
                  name="facturaCompra"
                  placeholder="ej. FACT-2024-889 o Saldo Inicial"
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 outline-none focus:border-coffee-600 font-mono"
                />
                <span className="text-[10px] text-stone-400 block mt-0.5">
                  Número de factura o documento soporte para la entrada inicial al Kárdex
                </span>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingInsumo(false)}
                  className="px-4 py-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingInsumo}
                  className="px-4 py-2 bg-coffee-800 hover:bg-coffee-900 text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingInsumo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Insumo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Insumo */}
      {selectedInsumoParaEditar && (
        <EditarInsumoModal
          insumo={selectedInsumoParaEditar}
          onClose={() => setSelectedInsumoParaEditar(null)}
          onSuccess={() => {
            setMessage({
              type: "success",
              text: "Insumo actualizado exitosamente.",
            });
          }}
        />
      )}

      {/* Modal Confirmación Eliminar Insumo */}
      {insumoAEliminar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                ¿Eliminar Insumo?
              </h3>
              <p className="text-xs text-stone-500">
                Estás a punto de eliminar <strong className="text-stone-800 dark:text-stone-200">{insumoAEliminar.nombre}</strong> ({insumoAEliminar.codigo}).
                Esta acción borrará también su historial asociado en Kárdex.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInsumoAEliminar(null)}
                disabled={isDeleting}
                className="flex-1 py-2 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminarInsumo}
                disabled={isDeleting}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Sí, Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
