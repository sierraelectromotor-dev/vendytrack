import React from "react";
import { obtenerRuteros, crearRutero } from "@/actions/admin";
import { formatFechaColombia } from "@/lib/utils";
import { Truck, UserPlus, Shield, MapPin, Mail, Lock, UserCheck } from "lucide-react";

export default async function RuterosPage() {
  const res = await obtenerRuteros();
  const ruteros = res.data || [];

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <Truck className="w-5 h-5 text-coffee-600 dark:text-amber-400" />
          Operadores de Ruta (Ruteros)
        </h2>
        <p className="text-xs text-stone-500">
          Gestión de personal de campo, credenciales de acceso móvil y rutas asignadas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Crear Rutero */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            Crear Nuevo Rutero
          </h3>

          <form
            action={async (formData: FormData) => {
              "use server";
              await crearRutero(formData);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="ej. Juan Pablo Pérez"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Correo Electrónico (Usuario Móvil) *
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="ej. juan.ruta@vendytrack.com"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Contraseña de Acceso *
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-coffee-800 hover:bg-coffee-900 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Guardar y Habilitar Rutero</span>
            </button>
          </form>
        </div>

        {/* Listado de Ruteros */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white">
            Ruteros Registrados ({ruteros.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ruteros.map((r) => (
              <div
                key={r.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black flex items-center justify-center border border-amber-300 text-sm">
                      {r.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 dark:text-white text-xs">
                        {r.name}
                      </h4>
                      <span className="text-[11px] text-stone-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {r.email}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Activo
                  </span>
                </div>

                <div className="bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-lg text-xs space-y-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-coffee-600" />
                    Rutas Asignadas
                  </span>
                  {r.rutas.length > 0 ? (
                    <ul className="text-stone-700 dark:text-stone-300 font-semibold space-y-0.5">
                      {r.rutas.map((ruta: string, idx: number) => (
                        <li key={idx} className="truncate">
                          • {ruta}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-stone-400 italic text-[11px]">
                      Sin rutas asignadas todavía
                    </span>
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
