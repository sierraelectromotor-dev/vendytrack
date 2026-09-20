import React from "react";
import { obtenerInventarioBodega, registrarEntradaBodega } from "@/actions/admin";
import { formatCOP, formatFechaColombia } from "@/lib/utils";
import {
  Package,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  History,
  Boxes,
} from "lucide-react";

export default async function InventarioPage() {
  const res = await obtenerInventarioBodega();
  const insumos = res.data?.insumos || [];
  const movimientos = res.data?.movimientos || [];

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-coffee-600 dark:text-amber-400" />
            Inventario y Bodega de Insumos
          </h2>
          <p className="text-xs text-stone-500">
            Control de existencias, compras a proveedores y Kárdex de consumo teórico
          </p>
        </div>
      </div>

      {/* Grid de Insumos en Bodega */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {insumos.map((i) => {
          const isLowStock = i.stockActual <= i.stockMinimo;

          return (
            <div
              key={i.id}
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden"
            >
              {isLowStock && (
                <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Stock Bajo
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-stone-400 block">
                    {i.codigo}
                  </span>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-0.5">
                    {i.nombre}
                  </h3>
                </div>
                <div className="p-2 bg-coffee-50 dark:bg-stone-800 rounded-xl text-coffee-700 dark:text-amber-400">
                  <Boxes className="w-5 h-5" />
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
                <span>Stock Mínimo: {i.stockMinimo} {i.unidadMedida.toLowerCase()}</span>
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

      {/* Formulario de Entrada / Compra de Mercancía */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-emerald-600" />
          Registrar Entrada de Mercancía a Bodega (Compra)
        </h3>

        <form
          action={async (formData: FormData) => {
            "use server";
            await registrarEntradaBodega(formData);
          }}
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
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              Ingresar a Bodega
            </button>
          </div>
        </form>
      </div>

      {/* Historial de Kárdex */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <History className="w-4 h-4 text-coffee-600 dark:text-amber-400" />
          Kárdex de Movimientos Recientes
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 font-semibold">
                <th className="pb-3">Fecha</th>
                <th className="pb-3">Insumo</th>
                <th className="pb-3">Tipo</th>
                <th className="pb-3 text-right">Cantidad</th>
                <th className="pb-3 text-right">Costo Unit.</th>
                <th className="pb-3">Referencia / Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
              {movimientos.map((m) => {
                const isEntry = m.tipo === "ENTRADA_COMPRA";
                return (
                  <tr key={m.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
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
                        {isEntry ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {isEntry ? "Entrada / Compra" : "Salida Teórica"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-black">
                      {isEntry ? "+" : "-"}
                      {m.cantidad.toLocaleString("es-CO")}
                    </td>
                    <td className="py-2.5 text-right text-stone-500">
                      {m.costoUnitario ? formatCOP(m.costoUnitario) : "-"}
                    </td>
                    <td className="py-2.5 text-stone-500">{m.referencia || "Visita de ruta"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
