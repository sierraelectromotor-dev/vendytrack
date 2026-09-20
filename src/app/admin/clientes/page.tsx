import React from "react";
import { obtenerClientes, crearCliente, obtenerRutas } from "@/actions/admin";
import {
  Building2,
  PlusCircle,
} from "lucide-react";
import { ClientesMaquinasList } from "@/components/admin/ClientesMaquinasList";
import { CrearMaquinaForm } from "@/components/admin/CrearMaquinaForm";

export default async function ClientesPage() {
  const [clientesRes, rutasRes] = await Promise.all([
    obtenerClientes(),
    obtenerRutas(),
  ]);

  const clientes = clientesRes.data || [];
  const rutas = rutasRes.data || [];

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-coffee-600 dark:text-amber-400" />
          Clientes y Máquinas Instaladas
        </h2>
        <p className="text-xs text-stone-500">
          Registro de clientes corporativos, sedes, números de WhatsApp y máquinas vending asignadas
        </p>
      </div>

      {/* Formularios de Creación: 1. Cliente, 2. Máquina con contadores y calibración */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Formulario Crear Cliente */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
          <h3 className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            Registrar Nuevo Cliente
          </h3>

          <form
            action={async (formData: FormData) => {
              "use server";
              await crearCliente(formData);
            }}
            className="space-y-2.5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Razón Social / Negocio *
                </label>
                <input
                  type="text"
                  name="razonSocial"
                  required
                  placeholder="ej. Clínica Sanitas"
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Sede / Sucursal *
                </label>
                <input
                  type="text"
                  name="sede"
                  required
                  placeholder="ej. Sede Norte"
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Dirección Física *
                </label>
                <input
                  type="text"
                  name="direccion"
                  required
                  placeholder="ej. Calle 127 # 19-45"
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  WhatsApp (+57) *
                </label>
                <input
                  type="text"
                  name="whatsapp"
                  required
                  placeholder="+573001234567"
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Nombre de Contacto / Encargado *
              </label>
              <input
                type="text"
                name="contacto"
                required
                placeholder="ej. Dra. María Fernanda"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-coffee-800 hover:bg-coffee-900 text-white font-bold rounded-xl shadow-sm transition-all"
            >
              Guardar Cliente
            </button>
          </form>
        </div>

        {/* Formulario Crear Máquina Interactivo con Contadores por Bebida */}
        <CrearMaquinaForm clientes={clientes} rutas={rutas} />
      </div>

      {/* Listado Interactivo de Clientes con sus Máquinas, Edición y Borrado */}
      <ClientesMaquinasList clientes={clientes} rutas={rutas} />
    </div>
  );
}
