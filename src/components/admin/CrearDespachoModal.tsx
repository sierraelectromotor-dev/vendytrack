"use client";

import React, { useState, useMemo } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createOrdenDespacho } from "@/actions/despachos";
import { toast } from "sonner";

type CrearDespachoModalProps = {
  onClose: () => void;
  clientes: any[];
  operadores: any[];
  existencias: any[];
};

export default function CrearDespachoModal({
  onClose,
  clientes,
  operadores,
  existencias,
}: CrearDespachoModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [clienteId, setClienteId] = useState("");
  const [maquinaId, setMaquinaId] = useState("");
  const [operadorId, setOperadorId] = useState("");
  const [tipo, setTipo] = useState("SURTIDO_MAQUINA");
  const [detalles, setDetalles] = useState<
    { existenciaId: string; cantidad: number }[]
  >([]);

  const maquinasDisponibles = useMemo(() => {
    if (!clienteId) return [];
    const cliente = clientes.find((c) => c.id === clienteId);
    return cliente ? cliente.maquinas : [];
  }, [clienteId, clientes]);

  const handleAddInsumo = () => {
    setDetalles([...detalles, { existenciaId: "", cantidad: 1 }]);
  };

  const handleRemoveInsumo = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleInsumoChange = (
    index: number,
    field: "existenciaId" | "cantidad",
    value: string | number
  ) => {
    const newDetalles = [...detalles];
    if (field === "cantidad") {
      newDetalles[index].cantidad = Number(value);
    } else {
      newDetalles[index].existenciaId = value as string;
    }
    setDetalles(newDetalles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId || !operadorId || detalles.length === 0) {
      toast.error("Por favor complete los campos requeridos y añada al menos un insumo.");
      return;
    }

    // Validate quantities
    for (let i = 0; i < detalles.length; i++) {
      const det = detalles[i];
      if (!det.existenciaId || det.cantidad <= 0) {
        toast.error("Seleccione un insumo y cantidad válida para todas las filas.");
        return;
      }
      const existencia = existencias.find((ex) => ex.id === det.existenciaId);
      if (existencia && det.cantidad > existencia.cantidad) {
        toast.error(
          `La cantidad de ${existencia.insumo.nombre} excede el stock disponible (${existencia.cantidad}).`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      
      const mappedDetalles = detalles.map((d) => {
        const ex = existencias.find((e) => e.id === d.existenciaId)!;
        return {
          insumoId: ex.insumoId,
          loteId: ex.loteId,
          cantidad: d.cantidad,
        };
      });

      const data = {
        clienteId,
        maquinaId: maquinaId || undefined,
        operadorId,
        tipo: tipo as any,
        detalles: mappedDetalles,
      };

      const result = await createOrdenDespacho(data);

      if (result.success) {
        toast.success("Orden de despacho creada correctamente");
        router.refresh();
        onClose();
      } else {
        toast.error(result.error || "Error al crear la orden");
      }
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al procesar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">
            Crear Orden de Despacho
          </h2>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Cliente *
              </label>
              <select
                value={clienteId}
                onChange={(e) => {
                  setClienteId(e.target.value);
                  setMaquinaId("");
                }}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500 text-stone-900 dark:text-white"
                required
              >
                <option value="">Seleccionar Cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razonSocial}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Máquina
              </label>
              <select
                value={maquinaId}
                onChange={(e) => setMaquinaId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500 text-stone-900 dark:text-white disabled:opacity-50"
                disabled={!clienteId || maquinasDisponibles.length === 0}
              >
                <option value="">
                  {clienteId
                    ? "Seleccionar Máquina (Opcional)"
                    : "Seleccione un cliente primero"}
                </option>
                {maquinasDisponibles.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.codigoSerial} - {m.modelo}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Operador de Ruta (Rutero) *
              </label>
              <select
                value={operadorId}
                onChange={(e) => setOperadorId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500 text-stone-900 dark:text-white"
                required
              >
                <option value="">Seleccionar Operador</option>
                {operadores.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Tipo de Despacho *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500 text-stone-900 dark:text-white"
                required
              >
                <option value="SURTIDO_MAQUINA">Abastecimiento (Máquina)</option>
                <option value="VENTA_BOLSA">Venta Directa (Cliente)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Insumos a Despachar
              </label>
              <button
                type="button"
                onClick={handleAddInsumo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-coffee-600 bg-coffee-50 hover:bg-coffee-100 dark:text-coffee-400 dark:bg-coffee-900/30 dark:hover:bg-coffee-900/50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Añadir Insumo
              </button>
            </div>

            {detalles.length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-500 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-dashed border-stone-300 dark:border-stone-700">
                No hay insumos añadidos. Haga clic en "Añadir Insumo" para comenzar.
              </div>
            ) : (
              <div className="space-y-3">
                {detalles.map((detalle, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700"
                  >
                    <div className="flex-1 space-y-3">
                      <select
                        value={detalle.existenciaId}
                        onChange={(e) =>
                          handleInsumoChange(index, "existenciaId", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500 text-stone-900 dark:text-white"
                        required
                      >
                        <option value="">Seleccionar Insumo y Lote</option>
                        {existencias.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.insumo.nombre} - Lote: {ex.lote?.numeroLote || "N/A"}{" "}
                            - Disp: {ex.cantidad}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        min="1"
                        value={detalle.cantidad}
                        onChange={(e) =>
                          handleInsumoChange(index, "cantidad", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500 text-stone-900 dark:text-white"
                        placeholder="Cant"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveInsumo(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-coffee-600 hover:bg-coffee-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {isSubmitting ? "Creando..." : "Crear Orden"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
