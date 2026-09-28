"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { updateEstadoDespacho } from "@/actions/despachos";
import { CheckCircle, Truck, AlertCircle } from "lucide-react";

export function EntregaForm({ ordenId, estadoActual, tipoDespacho, totalSugerido }: { ordenId: string, estadoActual: string, tipoDespacho: string, totalSugerido?: number }) {
  const router = useRouter();
  const [firma, setFirma] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totalFacturado, setTotalFacturado] = useState<number>(totalSugerido || 0);
  const [montoAbonado, setMontoAbonado] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<string>("EFECTIVO");

  const handleMarcarEnRuta = async () => {
    setLoading(true);
    setError(null);
    const res = await updateEstadoDespacho(ordenId, "EN_RUTA");
    setLoading(false);
    if (res.success) {
      router.refresh();
    } else {
      setError(res.error || "Error al actualizar la orden");
    }
  };

  const handleEntregar = async () => {
    if (!firma) {
      setError("Debe proporcionar una firma para completar la entrega.");
      return;
    }
    
    setLoading(true);
    setError(null);
    const res = await updateEstadoDespacho(ordenId, "ENTREGADA", firma, {
      totalFacturado,
      montoAbonado,
      metodoPago,
    });
    setLoading(false);
    if (res.success) {
      router.refresh();
    } else {
      setError(res.error || "Error al procesar la entrega");
    }
  };

  if (estadoActual === "CREADA") {
    return (
      <div className="mt-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        <button
          onClick={handleMarcarEnRuta}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          <Truck className="w-5 h-5" />
          {loading ? "Actualizando..." : "Iniciar Ruta (Marcar En Camino)"}
        </button>
      </div>
    );
  }

  if (estadoActual === "EN_RUTA") {
    return (
      <div className="mt-6 space-y-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {tipoDespacho === "VENTA_BOLSA" && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-stone-900 dark:text-white">Datos de Pago</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Total de la Venta ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalFacturado || ""}
                  onChange={(e) => setTotalFacturado(Number(e.target.value) || 0)}
                  readOnly={!!totalSugerido}
                  className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    totalSugerido 
                      ? "bg-stone-100 dark:bg-stone-800 border-transparent text-stone-600 cursor-not-allowed" 
                      : "bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700"
                  }`}
                  placeholder="0"
                />
                {!!totalSugerido && (
                  <p className="text-xs text-stone-500 mt-1">Calculado automáticamente según precios de inventario.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Monto Pagado / Abonado ahora ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={montoAbonado || ""}
                  onChange={(e) => setMontoAbonado(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Método de Pago
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </div>
              
              <div className="pt-2 border-t border-stone-200 dark:border-stone-700">
                <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
                  Saldo que quedará en Cartera: <strong className="text-stone-900 dark:text-white">${Math.max(0, totalFacturado - montoAbonado)}</strong>
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-stone-900 dark:text-white mb-4">Firma de Recibido</h3>
          <SignaturePad
            onSave={(val) => setFirma(val)}
            onClear={() => setFirma("")}
            disabled={loading}
          />
        </div>

        <button
          onClick={handleEntregar}
          disabled={loading || !firma}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          <CheckCircle className="w-5 h-5" />
          {loading ? "Procesando Entrega..." : "Completar Entrega"}
        </button>
      </div>
    );
  }

  return null;
}
