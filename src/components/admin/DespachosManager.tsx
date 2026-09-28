"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Plus, Package, MapPin, CheckCircle, Clock } from "lucide-react";
import CrearDespachoModal from "./CrearDespachoModal";

export default function DespachosManager({
  ordenes,
  clientes,
  operadores,
  existencias,
}: {
  ordenes: any[];
  clientes: any[];
  operadores: any[];
  existencias: any[];
}) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
            Órdenes de Despacho
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Gestiona los despachos de insumos a máquinas y clientes.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-coffee-600 hover:bg-coffee-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Orden</span>
        </button>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        {ordenes.length === 0 ? (
          <div className="p-12 text-center text-stone-500 flex flex-col items-center">
            <Package className="w-12 h-12 mb-4 text-stone-300" />
            <p>No hay órdenes de despacho creadas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="px-6 py-4 font-semibold text-stone-900 dark:text-stone-300">
                    ID
                  </th>
                  <th className="px-6 py-4 font-semibold text-stone-900 dark:text-stone-300">
                    Fecha
                  </th>
                  <th className="px-6 py-4 font-semibold text-stone-900 dark:text-stone-300">
                    Destino
                  </th>
                  <th className="px-6 py-4 font-semibold text-stone-900 dark:text-stone-300">
                    Operador
                  </th>
                  <th className="px-6 py-4 font-semibold text-stone-900 dark:text-stone-300">
                    Insumos
                  </th>
                  <th className="px-6 py-4 font-semibold text-stone-900 dark:text-stone-300">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {ordenes.map((orden) => (
                  <tr
                    key={orden.id}
                    className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-stone-900 dark:text-stone-300">
                      #{orden.consecutivo}
                    </td>
                    <td className="px-6 py-4 text-stone-500">
                      {format(
                        new Date(orden.fechaCreacion),
                        "dd/MM/yyyy HH:mm"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-stone-900 dark:text-white">
                        {orden.maquina ? `${orden.maquina.codigoSerial} - ${orden.maquina.modelo}` : orden.cliente?.razonSocial}
                      </div>
                      <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {orden.cliente?.razonSocial}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-stone-600 dark:text-stone-400">
                      {orden.operador?.name}
                    </td>
                    <td className="px-6 py-4 text-stone-600 dark:text-stone-400">
                      {orden.detalles.length} ítem(s)
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          orden.estado === "CREADA"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            : orden.estado === "EN_RUTA"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            : orden.estado === "ENTREGADA"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        }`}
                      >
                        {orden.estado === "CREADA" && (
                          <Clock className="w-3 h-3" />
                        )}
                        {orden.estado === "ENTREGADA" && (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        {orden.estado.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreating && (
        <CrearDespachoModal
          onClose={() => setIsCreating(false)}
          clientes={clientes}
          operadores={operadores}
          existencias={existencias}
        />
      )}
    </div>
  );
}
