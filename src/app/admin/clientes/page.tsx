import React from "react";
import { obtenerClientes, crearCliente, crearMaquina, obtenerRutas } from "@/actions/admin";
import {
  Building2,
  PlusCircle,
  Coffee,
  Phone,
  MapPin,
  Tag,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { ClientesMaquinasList } from "@/components/admin/ClientesMaquinasList";

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

      {/* Formularios de Creación: 1. Cliente, 2. Máquina */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        {/* Formulario Crear Máquina */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
          <h3 className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Coffee className="w-4 h-4 text-coffee-600" />
            Asociar Máquina a Cliente
          </h3>

          <form
            action={async (formData: FormData) => {
              "use server";
              await crearMaquina(formData);
            }}
            className="space-y-2.5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Modelo *
                </label>
                <input
                  type="text"
                  name="modelo"
                  required
                  placeholder="ej. Bianchi Soluble 4 Tolvas"
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Ubicación en el Local *
                </label>
                <input
                  type="text"
                  name="ubicacion"
                  required
                  placeholder="ej. Piso 3 Cafetería Médicos"
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Número de Productos (Selecciones) *
                </label>
                <select
                  name="numeroProductos"
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600 font-bold"
                >
                  <option value="3">3 Productos / Bebidas</option>
                  <option value="4">4 Productos / Bebidas</option>
                  <option value="6">6 Productos / Bebidas</option>
                  <option value="7">7 Productos / Bebidas</option>
                  <option value="8">8 Productos / Bebidas</option>
                </select>
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
                  {rutas.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all"
            >
              Asociar Máquina
            </button>
          </form>
        </div>
      </div>

      {/* Listado Interactivo de Clientes con sus Máquinas y Calibrador */}
      <ClientesMaquinasList clientes={clientes} />
    </div>
  );
}
