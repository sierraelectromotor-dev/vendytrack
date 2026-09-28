import { getTareasUnificadas } from "@/actions/rutero";
import Link from "next/link";
import { CheckCircle2, Package, Coins, Map, User, LogOut, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logoutAction } from "@/actions/auth";

export const dynamic = "force-dynamic";

export default async function RuteroDashboard({ searchParams }: { searchParams: { op?: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const isAdmin = user.rol === "ADMIN";
  const simulatedOpId = searchParams.op || undefined;
  
  const tareas = await getTareasUnificadas(simulatedOpId);
  const despachos = tareas.filter(t => t.tipo === "DESPACHO");
  const liquidaciones = tareas.filter(t => t.tipo === "LIQUIDACION");

  let operadores: any[] = [];
  if (isAdmin) {
    operadores = await prisma.user.findMany({ where: { rol: "OPERADOR_RUTA" }, orderBy: { name: 'asc' }});
  }

  const currentDate = new Intl.DateTimeFormat('es-CO', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }).format(new Date());

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 pb-24 font-sans">
      {/* HEADER */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-10 shadow-sm">
        <div className="px-5 py-4 max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-stone-900 dark:text-white leading-tight">Mi Ruta</h1>
              <p className="text-[11px] font-medium text-stone-500 capitalize">{currentDate}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="text-stone-400 hover:text-red-500 transition-colors p-2">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      <div className="px-5 py-6 max-w-md mx-auto space-y-6">
        {/* WIDGET PERFIL */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-stone-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-stone-500 font-medium">Bienvenido,</p>
            <h2 className="text-base font-bold text-stone-900 dark:text-white">{user.name}</h2>
          </div>
        </div>

        {/* ADMIN SIMULATION */}
        {isAdmin && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl">
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-500 mb-2 uppercase tracking-wider">
              Modo Administrador (Simular Operador)
            </p>
            <form className="flex gap-2">
              <select 
                name="op" 
                defaultValue={simulatedOpId || ""}
                className="flex-1 bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Ver mis propias tareas --</option>
                {operadores.map((op: any) => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
              <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                Ver
              </button>
            </form>
          </div>
        )}

        {/* TAREAS PENDIENTES */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-wider">Tareas de Hoy</h3>
            <span className="bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold px-2.5 py-1 rounded-full">
              {tareas.length} pendientes
            </span>
          </div>

          {tareas.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="w-12 h-12 text-stone-300 dark:text-stone-700 mb-3" />
              <p className="text-stone-900 dark:text-white font-bold mb-1">Â¡DÃ­a libre!</p>
              <p className="text-stone-500 text-sm">No tienes tareas asignadas para hoy.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* LIQUIDACIONES */}
              {liquidaciones.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-stone-500 flex items-center gap-2">
                    <Coins className="w-4 h-4" /> Recaudos y Liquidaciones
                  </h4>
                  {liquidaciones.map(tarea => (
                    <Link
                      key={tarea.id}
                      href={tarea.url}
                      className="group flex items-center p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm hover:shadow-md transition-all "
                    >
                      <div className="flex-1">
                        <h3 className="font-bold text-stone-900 dark:text-white text-sm">{tarea.titulo}</h3>
                        <p className="text-xs text-stone-500 mt-0.5">{tarea.subtitulo}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
                        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* DESPACHOS */}
              {despachos.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-stone-500 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Ã“rdenes de Despacho
                  </h4>
                  {despachos.map(tarea => (
                    <Link
                      key={tarea.id}
                      href={tarea.url}
                      className="group flex items-center p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm hover:shadow-md transition-all "
                    >
                      <div className="flex-1">
                        <h3 className="font-bold text-stone-900 dark:text-white text-sm">{tarea.titulo}</h3>
                        <p className="text-xs text-stone-500 mt-0.5">{tarea.subtitulo}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
                        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FIXED BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 p-4 pb-safe flex justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <Link
          href="/rutero/conciliacion"
          className="w-full max-w-md bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity "
        >
          Cerrar Turno / Conciliar <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}


