"use client";

import React, { useState, useTransition } from "react";
import {
  AlertTriangle,
  X,
  Lock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Flame,
  Check,
} from "lucide-react";
import { reiniciarSistemaTotal } from "@/actions/sistema";

interface ReinicioSistemaModalProps {
  onClose: () => void;
}

export const ReinicioSistemaModal: React.FC<ReinicioSistemaModalProps> = ({ onClose }) => {
  const [frase, setFrase] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const FRASE_REQUERIDA = "REINICIAR SISTEMA";
  const puedeProceder = frase.trim().toUpperCase() === FRASE_REQUERIDA && password.length > 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!puedeProceder) {
      setError("Debes escribir la frase exacta y tu contraseña de administrador.");
      return;
    }

    const formData = new FormData();
    formData.set("fraseConfirmacion", frase.trim().toUpperCase());
    formData.set("password", password);

    startTransition(async () => {
      const res = await reiniciarSistemaTotal(formData);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          // Recargar la ventana completa para inicializar todos los estados
          window.location.href = "/admin";
        }, 1500);
      } else {
        setError(res.error || "Ocurrió un error al reiniciar el sistema.");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-rose-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Cabecera de Peligro */}
        <div className="p-5 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base leading-tight">Zona de Peligro</h3>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-white/25 px-2 py-0.5 rounded-full">
                  Acción Crítica
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                Reinicio Total de Fábrica (Clean System)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 flex items-center gap-3 animate-in zoom-in-95">
              <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600" />
              <div>
                <strong className="block text-sm">¡Sistema reiniciado con éxito!</strong>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  La base de datos está limpia. Redirigiendo al panel...
                </span>
              </div>
            </div>
          )}

          {/* Advertencia de impacto */}
          <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Esta acción es irreversible y eliminará todos los datos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="space-y-1 bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40">
                <span className="font-bold text-rose-600 block">🔴 Se borrarán:</span>
                <ul className="list-disc list-inside space-y-0.5 text-stone-600 dark:text-stone-400">
                  <li>Todas las liquidaciones y recibos</li>
                  <li>Todos los clientes y máquinas</li>
                  <li>Insumos y stock de bodega</li>
                  <li>Rutas y asignaciones</li>
                  <li>Contabilidad y gastos fijos</li>
                  <li>Visitas y órdenes técnicas</li>
                  <li>Operadores y usuarios clientes</li>
                </ul>
              </div>

              <div className="space-y-1 bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                <span className="font-bold text-emerald-600 block">🟢 Se conservará:</span>
                <ul className="list-disc list-inside space-y-0.5 text-stone-600 dark:text-stone-400">
                  <li>
                    <strong>Tu cuenta de Administrador</strong> (para que sigas teniendo acceso total)
                  </li>
                  <li>Configuración del sistema</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Campo 1: Frase de confirmación */}
            <div>
              <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                1. Para confirmar, escribe exactamente:{" "}
                <code className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/60 select-all font-mono">
                  {FRASE_REQUERIDA}
                </code>
              </label>
              <input
                type="text"
                value={frase}
                onChange={(e) => setFrase(e.target.value)}
                placeholder="Escribe REINICIAR SISTEMA"
                disabled={isPending || success}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl p-3 outline-none focus:border-rose-500 font-mono text-stone-900 dark:text-white uppercase tracking-wider"
              />
            </div>

            {/* Campo 2: Contraseña de Administrador */}
            <div>
              <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                2. Ingresa tu contraseña de Administrador:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  disabled={isPending || success}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl p-3 pl-9 outline-none focus:border-rose-500 text-stone-900 dark:text-white"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Botón de Borrado */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending || success}
                className="w-1/3 py-3 rounded-xl border border-stone-300 dark:border-stone-700 font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={!puedeProceder || isPending || success}
                className="w-2/3 py-3 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 text-sm"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Borrando datos...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Borrar Todo y Reiniciar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
