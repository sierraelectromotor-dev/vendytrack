"use client";

import React, { useState } from "react";
import {
  Truck,
  Shield,
  UserPlus,
  Mail,
  MapPin,
  Lock,
  UserCheck,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  Loader2,
  User,
} from "lucide-react";
import {
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} from "@/actions/admin";

export interface UsuarioItem {
  id: string;
  name: string;
  email: string;
  rol: "ADMIN" | "OPERADOR_RUTA" | "CLIENTE";
  rutas: string[];
  totalLiquidaciones: number;
  createdAt: string;
}

interface UsuariosManagerProps {
  usuarios: UsuarioItem[];
  currentUserId?: string;
}

export const UsuariosManager: React.FC<UsuariosManagerProps> = ({
  usuarios,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<"TODOS" | "RUTEROS" | "ADMINS">(
    "TODOS"
  );
  const [selectedUserToEdit, setSelectedUserToEdit] =
    useState<UsuarioItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UsuarioItem | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Filtro por rol
  const filteredUsers = usuarios.filter((u) => {
    if (activeTab === "RUTEROS") return u.rol === "OPERADOR_RUTA";
    if (activeTab === "ADMINS") return u.rol === "ADMIN";
    return true;
  });

  const ruterosCount = usuarios.filter((u) => u.rol === "OPERADOR_RUTA").length;
  const adminsCount = usuarios.filter((u) => u.rol === "ADMIN").length;

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUserToEdit) return;

    setIsSaving(true);
    setEditError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name")?.toString() || "";
    const email = formData.get("email")?.toString() || "";
    const password = formData.get("password")?.toString() || "";

    const res = await actualizarUsuario(selectedUserToEdit.id, {
      name,
      email,
      password: password || undefined,
    });

    setIsSaving(false);
    if (res.success) {
      setEditSuccess(true);
      setTimeout(() => {
        setEditSuccess(false);
        setSelectedUserToEdit(null);
        window.location.reload();
      }, 1200);
    } else {
      setEditError(res.error || "Error al actualizar");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    const res = await eliminarUsuario(userToDelete.id);
    setIsDeleting(false);

    if (res.success) {
      setUserToDelete(null);
      window.location.reload();
    } else {
      setDeleteError(res.error || "Error al eliminar usuario");
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de pestañas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("TODOS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "TODOS"
                ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            Todos ({usuarios.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("RUTEROS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === "RUTEROS"
                ? "bg-coffee-800 text-white dark:bg-amber-400 dark:text-stone-900 shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Ruteros de Campo ({ruterosCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ADMINS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === "ADMINS"
                ? "bg-purple-700 text-white dark:bg-purple-500 dark:text-white shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Administradores ({adminsCount})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Crear Usuario (Rutero o Admin) */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              Crear Nuevo Usuario
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Habilita acceso para personal de ruta o nuevos administradores
            </p>
          </div>

          <form
            action={async (formData: FormData) => {
              await crearUsuario(formData);
              window.location.reload();
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Rol del Usuario *
              </label>
              <select
                name="rol"
                required
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 font-semibold"
              >
                <option value="OPERADOR_RUTA">🚚 Operador de Ruta (Rutero)</option>
                <option value="ADMIN">🛡️ Administrador del Sistema</option>
              </select>
            </div>

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
                Correo Electrónico (Login) *
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="ej. juan@vendytrack.com"
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
              <span>Guardar y Habilitar Usuario</span>
            </button>
          </form>
        </div>

        {/* Listado de Usuarios */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">
              Usuarios Activos ({filteredUsers.length})
            </h3>
            <span className="text-xs text-stone-400">
              Puedes modificar nombres o eliminar usuarios sin liquidaciones históricas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredUsers.map((u) => {
              const isAdmin = u.rol === "ADMIN";
              const initials = u.name
                .split(" ")
                .filter(Boolean)
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={u.id}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3 hover:border-stone-300 dark:hover:border-stone-700 transition-all"
                >
                  {/* Header de la Tarjeta con Badges Claramente Ubicados */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm border ${
                          isAdmin
                            ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                            : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                        }`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-stone-900 dark:text-white text-xs truncate leading-tight">
                          {u.name}
                        </h4>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate block mt-0.5">
                          {u.email}
                        </span>
                      </div>
                    </div>

                    {/* Insignias de Estado y Rol (Bien Ubicadas Arriba a la Derecha) */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Activo
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider ${
                          isAdmin
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                            : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                        }`}
                      >
                        {isAdmin ? "Admin" : "Rutero"}
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo de la Tarjeta */}
                  <div className="bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-xl text-xs space-y-1">
                    {isAdmin ? (
                      <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300 text-[11px]">
                        <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Acceso total a inventario, clientes y tarifas</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold text-stone-400 uppercase flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-coffee-600" />
                          Rutas Asignadas ({u.rutas.length})
                        </span>
                        {u.rutas.length > 0 ? (
                          <ul className="text-stone-700 dark:text-stone-300 font-semibold space-y-0.5 text-[11px]">
                            {u.rutas.map((r, idx) => (
                              <li key={idx} className="truncate">
                                • {r}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-stone-400 italic text-[11px] block">
                            Sin rutas asignadas todavía
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Botones de Acción: Editar y Eliminar */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-stone-400">
                      {isAdmin ? "Administrador" : `${u.totalLiquidaciones} liquidaciones`}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedUserToEdit(u)}
                        className="px-2.5 py-1 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1"
                        title="Modificar Nombre, Correo o Contraseña"
                      >
                        <Edit2 className="w-3 h-3 text-stone-500" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setUserToDelete(u);
                        }}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Eliminar Usuario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal de Edición de Usuario (Permite cambiar el nombre del administrador o rutero) */}
      {selectedUserToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-coffee-100 dark:bg-stone-800 text-coffee-800 dark:text-amber-300 rounded-xl">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                    Editar Usuario
                  </h3>
                  <span className="text-[11px] text-stone-400">
                    {selectedUserToEdit.rol === "ADMIN"
                      ? "Perfil de Administrador"
                      : "Operador de Ruta"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserToEdit(null)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                ¡Usuario actualizado exitosamente!
              </div>
            )}

            {editError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={selectedUserToEdit.name}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={selectedUserToEdit.email}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Nueva Contraseña (dejar en blanco para mantener la actual)
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-coffee-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setSelectedUserToEdit(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-coffee-800 hover:bg-coffee-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Usuario */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                ¿Eliminar este usuario?
              </h3>
              <p className="text-xs text-stone-500">
                Estás a punto de eliminar a <strong>{userToDelete.name}</strong> ({userToDelete.email}).
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-xl text-xs text-rose-800 dark:text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Sí, Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
