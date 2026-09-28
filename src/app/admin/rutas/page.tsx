import React from "react";
import {
  obtenerRutas,
  obtenerRuteros,
  obtenerBodegaPrincipal,
  crearRuta,
  asignarOperadorRuta,
} from "@/actions/admin";
import { obtenerVisitasExtraordinarias } from "@/actions/visitas";
import MapaRutasWrapper from "@/components/admin/MapaRutasWrapper";
import RutasExtraordinariasSection from "@/components/admin/RutasExtraordinariasSection";
import { OrdenamientoMaquinasRuta } from "@/components/admin/OrdenamientoMaquinasRuta";
import { MapPin, PlusCircle, Truck, Coffee, Calendar, Info } from "lucide-react";
import { BotonEliminarRuta } from "@/components/admin/BotonEliminarRuta";

export const dynamic = "force-dynamic";

export default async function RutasPage() {
  const [rutasRes, ruterosRes, bodegaRes, visitasRes] = await Promise.all([
    obtenerRutas(),
    obtenerRuteros(),
    obtenerBodegaPrincipal(),
    obtenerVisitasExtraordinarias(),
  ]);

  const rutas = (rutasRes.success ? rutasRes.data : []) as any[];
  const ruteros = ruterosRes.success ? ruterosRes.data : [];
  const bodega = bodegaRes.success ? bodegaRes.data : null;
  const visitas = visitasRes.success ? visitasRes.data : [];

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-black text-stone-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          Rutas y Logística
        </h2>
        <p className="text-xs text-stone-500">
          Gestiona las rutas, asocia máquinas y asigna operadores. Visualiza la distribución geográfica.
        </p>
      </div>

      {bodega && (
        <MapaRutasWrapper bodega={bodega as any} rutas={rutas as any[]} />
      )}

      <RutasExtraordinariasSection initialVisitas={visitas} maquinas={rutas.flatMap(r => r.maquinas)} ruteros={ruteros} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-amber-600" />
            Crear Nueva Ruta
          </h3>
          <form
            action={async (formData: FormData) => {
              "use server";
              await crearRuta(formData);
            }}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Nombre de la Ruta
              </label>
              <input
                type="text"
                name="nombre"
                required
                placeholder="ej. Ruta 3 - Sur"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Días de Visita (Frecuencia)
              </label>
              <input
                type="text"
                name="diasFrecuencia"
                placeholder="ej. LUNES - MIÉRCOLES"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Operador Responsable
              </label>
              <select
                name="operadorId"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 text-xs"
              >
                <option value="none">Sin Asignar</option>
                {ruteros.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Notas / Descripción
              </label>
              <textarea
                name="descripcion"
                rows={2}
                placeholder="Opcional..."
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2 outline-none focus:border-coffee-600 text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-coffee-800 hover:bg-coffee-900 text-white font-bold text-xs rounded-xl transition-all"
            >
              Guardar Ruta
            </button>
          </form>
        </div>

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
                    {r.descripcion && <p className="text-xs text-stone-500 mt-0.5">{r.descripcion}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {r.diasFrecuencia && (
                      <span className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold rounded-lg flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        {r.diasFrecuencia}
                      </span>
                    )}
                    <BotonEliminarRuta rutaId={r.id} nombre={r.nombre} />
                  </div>
                </div>

                <div className="bg-amber-50/60 dark:bg-stone-800/60 border border-amber-200/50 dark:border-stone-700 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase block font-bold">Rutero Responsable</span>
                      <span className="font-bold text-stone-900 dark:text-white">{r.operadorNombre}</span>
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
                        <option key={rut.id} value={rut.id}>{rut.name}</option>
                      ))}
                    </select>
                    <button type="submit" className="px-2.5 py-1.5 bg-coffee-800 hover:bg-coffee-900 text-white rounded-lg text-xs font-bold">
                      Asignar
                    </button>
                  </form>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                    Máquinas y Orden de Visita ({r.maquinas.length})
                  </span>
                  {r.maquinas.length > 0 ? (
                    <OrdenamientoMaquinasRuta rutaId={r.id} maquinasInciales={r.maquinas} />
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


