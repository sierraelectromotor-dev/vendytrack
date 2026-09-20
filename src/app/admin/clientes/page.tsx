import React from "react";
import { obtenerClientes, obtenerRutas } from "@/actions/admin";
import { Building2 } from "lucide-react";
import { ClientesMaquinasList } from "@/components/admin/ClientesMaquinasList";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const [clientesRes, rutasRes] = await Promise.all([
    obtenerClientes(),
    obtenerRutas(),
  ]);

  const clientes = clientesRes.data || [];
  const maquinasSinAsignar = (clientesRes as any).maquinasSinAsignar || [];
  const insumos = (clientesRes as any).insumos || [];
  const rutas = rutasRes.data || [];

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div>
        <h2 className="text-xl font-black text-stone-900 dark:text-white flex items-center gap-2 tracking-tight">
          <Building2 className="w-6 h-6 text-coffee-700 dark:text-amber-400" />
          Gestión de Clientes y Parque de Máquinas
        </h2>
        <p className="text-xs text-stone-500">
          Administración de clientes corporativos, sedes, rutas operativas y configuración técnica de máquinas vending
        </p>
      </div>

      {/* Vista Principal Interactiva: KPIs, Buscador, Modales y Tarjetas */}
      <ClientesMaquinasList
        clientes={clientes}
        maquinasSinAsignar={maquinasSinAsignar}
        rutas={rutas}
        insumos={insumos}
      />
    </div>
  );
}
