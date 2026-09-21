"use client";

import React, { useState, useTransition } from "react";
import { X, Building2, Phone, MapPin, User, CheckCircle2, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { actualizarCliente, eliminarCliente } from "@/actions/admin";

interface EditarClienteModalProps {
  cliente: {
    id: string;
    razonSocial: string;
    sede: string;
    direccion: string;
    contacto: string;
    whatsapp: string;
    activo?: boolean;
    latitud?: number | null;
    longitud?: number | null;
  };
  onClose: () => void;
}

export const EditarClienteModal: React.FC<EditarClienteModalProps> = ({
  cliente,
  onClose,
}) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleEliminar = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await eliminarCliente(cliente.id);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || "Error al eliminar el cliente");
        setShowConfirmDelete(false);
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error inesperado al eliminar el cliente");
      setShowConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.append("id", cliente.id);

    startTransition(async () => {
      const res = await actualizarCliente(formData);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setError(res.error || "Error al actualizar los datos del cliente");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-coffee-100 dark:bg-amber-950/60 flex items-center justify-center text-coffee-700 dark:text-amber-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-sm">
                Editar Cliente
              </h3>
              <p className="text-[11px] text-stone-500">
                {cliente.razonSocial} • {cliente.sede}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Cliente actualizado correctamente!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Razón Social *
              </label>
              <input
                type="text"
                name="razonSocial"
                required
                defaultValue={cliente.razonSocial}
                placeholder="ej. Clínica Sanitas"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
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
                defaultValue={cliente.sede}
                placeholder="ej. Sede Norte"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Dirección Física *
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="direccion"
                  required
                  defaultValue={cliente.direccion}
                  placeholder="ej. Calle 127 # 19-45"
                  className="w-full pl-8 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                WhatsApp (+57) *
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="whatsapp"
                  required
                  defaultValue={cliente.whatsapp}
                  placeholder="+573001234567"
                  className="w-full pl-8 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Latitud GPS (Opcional)
              </label>
              <input
                type="number"
                step="any"
                name="latitud"
                defaultValue={cliente.latitud ?? ""}
                placeholder="ej. 4.6543"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Longitud GPS (Opcional)
              </label>
              <input
                type="number"
                step="any"
                name="longitud"
                defaultValue={cliente.longitud ?? ""}
                placeholder="ej. -74.0892"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Nombre de Contacto / Encargado *
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="contacto"
                required
                defaultValue={cliente.contacto}
                placeholder="ej. Dra. María Fernanda"
                className="w-full pl-8 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 dark:text-white"
              />
            </div>
          </div>

          {/* Estado Activo */}
          <div className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/70 dark:border-stone-700/60">
            <input
              type="checkbox"
              id="cliente-activo"
              name="activo"
              defaultChecked={cliente.activo ?? true}
              className="w-4 h-4 rounded text-coffee-600 focus:ring-coffee-500 border-stone-300"
            />
            <label htmlFor="cliente-activo" className="cursor-pointer select-none">
              <span className="font-bold text-stone-800 dark:text-stone-200 block">
                Cliente Activo
              </span>
              <span className="text-[11px] text-stone-500 block">
                Si se desmarca, el cliente y sus máquinas no aparecerán para nuevas rutas operativas
              </span>
            </label>
          </div>

          {/* Confirmación de Eliminación */}
          {showConfirmDelete && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl space-y-2 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-700 dark:text-red-300">
                  <p className="font-bold">¿Seguro que deseas eliminar este cliente?</p>
                  <p className="text-[11px] text-red-600/90 dark:text-red-400/90 mt-0.5">
                    Esta acción desvinculará sus máquinas asignadas (enviándolas a Bodega) y eliminará el registro de forma permanente.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                  className="px-2.5 py-1 text-xs font-semibold text-stone-600 hover:text-stone-800 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEliminar}
                  disabled={isDeleting}
                  className="px-3 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-1 shadow-sm transition-colors disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Sí, Eliminar Cliente</span>
                </button>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              disabled={isPending || isDeleting || showConfirmDelete}
              className="py-2 px-3 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all font-semibold flex items-center gap-1.5 text-xs disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Cliente</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending || isDeleting}
                className="py-2 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || isDeleting}
                className="py-2 px-5 bg-coffee-800 hover:bg-coffee-900 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Cambios</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
