import React from "react";
import {
  obtenerRutas,
  obtenerRuteros,
  obtenerClientes,
  crearRuta,
  asignarOperadorRuta,
  asignarMaquinaARuta,
} from "@/actions/admin";
import {
  MapPin,
  PlusCircle,
  Truck,
  Coffee,
  Calendar,
  UserCheck,
  Building2,
  CheckCircle2,
} from "lucide-react";

export default async function RutasPage() {
  const [rutasRes, ruterosRes, clientesRes] = await Promise.all([
    obtenerRutas(),
    obtenerRuteros(),
    obtenerClientes(),
  ]);

  const rutas = rutasRes.data || [];
  const ruteros = ruterosRes.data || [];
  const clientes = clientesRes.data || [];

  // Todas las máquinas de todos los clientes para asignación
  const todasLasMaquinas = clientes.flatMap((c: any) =>
    c.maquinas.map((m: any) => ({
      ...m,
      clienteNombre: c.razonSocial,
      sede: c.sede,
    }))
  );

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-coffee-600 dark:text-amber-400" />
          Configuración de Rutas y Asignación de Ruteros
        </h2>
        <p className="text-xs text-stone-500">
          Crea circuitos de visita, asigna máquinas vending a cada ruta y designa al rutero responsable
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario Crear Nueva Ruta */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4 h-fit text-xs">
          <h3 className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            Crear Nueva Ruta de Atención
          </h3>

          <form
            action={async (formData: FormData) => {
              "use server";
              await crearRuta(formData);
            }}
            className="space-y-3"
          >
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Nombre de la Ruta *
              </label>
              <input
                type="text"
                name="nombre"
                required
                placeholder="ej. Ruta 3 - Hospitales y Clínicas Sur"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Frecuencia / Días de Visita
              </label>
              <input
                type="text"
                name="diasFrecuencia"
                placeholder="ej. LUNES - MIÉRCOLES - VIERNES"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Rutero Asignado Responsable
              </label>
              <select
                name="operadorId"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              >
                <option value="none">Sin Asignar (Pendiente)</option>
                {ruteros.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Descripción / Notas de Ruta
              </label>
              <textarea
                rows={2}
                name="descripcion"
                placeholder="ej. Iniciar en Kennedy a las 7am y finalizar en Restrepo..."
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-coffee-800 hover:bg-coffee-900 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              Guardar Ruta
            </button>
          </form>
        </div>

        {/* Listado de Rutas Activas */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white">
            Rutas Configuradas ({rutas.length})
          </h3>

          <div className="space-y-4">
            {rutas.map((r: any) => (
              <div
                key={r.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-coffee-600" />
                      {r.nombre}
                    </h4>
                    {r.descripcion && (
                      <p className="text-xs text-stone-500 mt-0.5">{r.descripcion}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {r.diasFrecuencia && (
                      <span className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold rounded-lg flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        {r.diasFrecuencia}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rutero Responsable con selector para reasignación rápida */}
                <div className="bg-amber-50/60 dark:bg-stone-800/60 border border-amber-200/50 dark:border-stone-700 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase block font-bold">
                        Rutero Responsable
                      </span>
                      <span className="font-bold text-stone-900 dark:text-white">
                        {r.operadorNombre}
                      </span>
                    </div>
                  </div>

                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      const opId = formData.get("operadorId")?.toString() || "";
                      await asignarOperadorRuta(r.id, opId);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <select
                      name="operadorId"
                      defaultValue={r.operadorId || "none"}
                      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-1.5 text-xs font-semibold outline-none"
                    >
                      <option value="none">Sin Asignar</option>
                      {ruteros.map((rut: any) => (
                        <option key={rut.id} value={rut.id}>
                          {rut.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 bg-coffee-800 hover:bg-coffee-900 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Asignar
                    </button>
                  </form>
                </div>

                {/* Máquinas en esta ruta */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                    Máquinas y Puntos en esta Ruta ({r.maquinas.length})
                  </span>

                  {r.maquinas.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {r.maquinas.map((m: any) => (
                        <div
                          key={m.id}
                          className="bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-800 flex items-start gap-2 text-xs"
                        >
                          <Coffee className="w-3.5 h-3.5 text-coffee-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-stone-900 dark:text-white block">
                              {m.codigoSerial}
                            </span>
                            <span className="text-stone-500 text-[11px] block">
                              {m.clienteNombre} ({m.sede})
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {m.ubicacion}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 italic">
                      Aún no hay máquinas agregadas a esta ruta. Puedes asignarlas en la sección de Clientes y Máquinas.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
