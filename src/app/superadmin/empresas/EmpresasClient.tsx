"use client";

import { useState, useTransition } from "react";
import {
  crearEmpresa,
  toggleEmpresaEstado,
  crearAdministradorEmpresa,
} from "@/actions/superadmin";
import {
  Building2,
  Power,
  PowerOff,
  Plus,
  UserPlus,
  Shield,
  Users,
  KeyRound,
  X,
  Mail,
  User,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function EmpresasClient({ initialEmpresas }: { initialEmpresas: any[] }) {
  const [empresas, setEmpresas] = useState(initialEmpresas);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Estado para crear administrador de una empresa específica
  const [empresaSeleccionadaParaAdmin, setEmpresaSeleccionadaParaAdmin] = useState<any | null>(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Toggle sección de admin en creación de empresa
  const [mostrarCamposAdminNuevo, setMostrarCamposAdminNuevo] = useState(false);

  const handleSubmitEmpresa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await crearEmpresa(formData);
    if (res.success && res.data) {
      alert("Empresa creada exitosamente" + (formData.get("adminEmail") ? " junto con su Administrador" : ""));
      setEmpresas([
        ...empresas,
        {
          ...res.data,
          usuarios: res.data.usuarios || [],
          _count: res.data._count || { usuarios: 0, clientes: 0, maquinas: 0 },
        },
      ]);
      form.reset();
      setMostrarCamposAdminNuevo(false);
    } else {
      alert(res.error || "Error al crear la empresa");
    }
    setIsSubmitting(false);
  };

  const handleToggleEstado = async (id: string, current: boolean) => {
    const res = await toggleEmpresaEstado(id, !current);
    if (res.success) {
      alert(current ? "Empresa desactivada" : "Empresa activada");
      setEmpresas(empresas.map((e) => (e.id === id ? { ...e, activa: !current } : e)));
    } else {
      alert(res.error || "Error al cambiar estado");
    }
  };

  const handleCrearAdminModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaSeleccionadaParaAdmin) return;
    setErrorModal(null);

    const formData = new FormData();
    formData.append("name", adminName);
    formData.append("email", adminEmail);
    formData.append("password", adminPassword);

    startTransition(async () => {
      const res = await crearAdministradorEmpresa(empresaSeleccionadaParaAdmin.id, formData);
      if (res.success && res.data) {
        alert("Administrador creado exitosamente.");
        setEmpresas((prev) =>
          prev.map((emp) => {
            if (emp.id === empresaSeleccionadaParaAdmin.id) {
              return {
                ...emp,
                usuarios: [...(emp.usuarios || []), res.data],
                _count: {
                  ...emp._count,
                  usuarios: (emp._count?.usuarios || 0) + 1,
                },
              };
            }
            return emp;
          })
        );
        setEmpresaSeleccionadaParaAdmin(null);
        setAdminName("");
        setAdminEmail("");
        setAdminPassword("");
      } else {
        setErrorModal(res.error || "Error al crear administrador");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-stone-800 flex items-center gap-2">
            <Building2 className="text-amber-500" /> Empresas e Inquilinos (Tenants)
          </h2>
          <p className="text-sm text-stone-500">
            Administra las empresas clientes y crea sus usuarios administradores de acceso.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Formulario Nueva Empresa */}
        <div className="lg:col-span-1">
          <form
            onSubmit={handleSubmitEmpresa}
            className="bg-white p-6 rounded-3xl shadow-xs border border-stone-200 space-y-4 sticky top-6"
          >
            <h3 className="font-bold text-stone-900 flex items-center gap-2 text-base">
              <Plus className="w-5 h-5 text-amber-600" /> Nueva Empresa
            </h3>

            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                Nombre de la Empresa *
              </label>
              <input
                name="nombre"
                required
                placeholder="ej. Café Express del Valle"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                NIT o Identificación (Opcional)
              </label>
              <input
                name="nit"
                placeholder="ej. 901.234.567-8"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
              />
            </div>

            {/* Opción para crear admin inicial de una vez */}
            <div className="pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setMostrarCamposAdminNuevo(!mostrarCamposAdminNuevo)}
                className="w-full flex items-center justify-between py-2 text-xs font-bold text-stone-700 hover:text-amber-600 transition"
              >
                <span className="flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-amber-500" />
                  Crear Administrador Inicial
                </span>
                {mostrarCamposAdminNuevo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {mostrarCamposAdminNuevo && (
                <div className="mt-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Nombre del Administrador
                    </label>
                    <input
                      name="adminName"
                      placeholder="ej. Carlos Pérez"
                      className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Correo Electrónico (Login)
                    </label>
                    <input
                      name="adminEmail"
                      type="email"
                      placeholder="admin@cafeexpress.com"
                      className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Contraseña Temporal
                    </label>
                    <input
                      name="adminPassword"
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              disabled={isSubmitting}
              className="w-full bg-stone-900 text-white font-bold py-2.5 rounded-xl hover:bg-stone-800 disabled:opacity-50 text-sm shadow-xs transition"
            >
              {isSubmitting ? "Creando..." : "Crear Empresa"}
            </button>
          </form>
        </div>

        {/* Listado de Empresas */}
        <div className="lg:col-span-2 space-y-4">
          {empresas.map((empresa) => (
            <div
              key={empresa.id}
              className={`bg-white p-5 sm:p-6 rounded-3xl shadow-xs border transition-all ${
                empresa.activa ? "border-stone-200" : "border-red-200 opacity-75 bg-stone-50/50"
              }`}
            >
              {/* Cabecera de la empresa */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-lg text-stone-900">{empresa.nombre}</h4>
                    {empresa.activa ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        Activa
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-red-100 text-red-800">
                        Inactiva
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 font-mono mt-0.5">
                    ID: {empresa.id} {empresa.nit && `· NIT: ${empresa.nit}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      setEmpresaSeleccionadaParaAdmin(empresa);
                      setErrorModal(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200/80 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Crear Admin</span>
                  </button>

                  <button
                    onClick={() => handleToggleEstado(empresa.id, empresa.activa)}
                    title={empresa.activa ? "Desactivar empresa" : "Activar empresa"}
                    className={`p-2 rounded-xl border transition ${
                      empresa.activa
                        ? "text-red-600 border-red-100 hover:bg-red-50"
                        : "text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                    }`}
                  >
                    {empresa.activa ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Métricas rápidas */}
              <div className="grid grid-cols-3 gap-2 py-3 border-b border-stone-100 text-center">
                <div className="p-2 bg-stone-50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Usuarios</span>
                  <span className="text-base font-black text-stone-800">
                    {empresa.usuarios?.length || empresa._count?.usuarios || 0}
                  </span>
                </div>
                <div className="p-2 bg-stone-50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Clientes</span>
                  <span className="text-base font-black text-stone-800">
                    {empresa._count?.clientes || 0}
                  </span>
                </div>
                <div className="p-2 bg-stone-50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Máquinas</span>
                  <span className="text-base font-black text-stone-800">
                    {empresa._count?.maquinas || 0}
                  </span>
                </div>
              </div>

              {/* Usuarios asignados a esta empresa */}
              <div className="pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    Usuarios con Acceso ({empresa.usuarios?.length || 0})
                  </span>
                </div>

                {empresa.usuarios && empresa.usuarios.length > 0 ? (
                  <div className="divide-y divide-stone-100 border border-stone-100 rounded-xl overflow-hidden">
                    {empresa.usuarios.map((u: any) => (
                      <div key={u.id} className="p-2.5 bg-stone-50/50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-[11px]">
                            {u.name?.slice(0, 1) || "U"}
                          </div>
                          <div>
                            <span className="font-bold text-stone-800 block">{u.name}</span>
                            <span className="text-stone-400 font-mono text-[11px]">{u.email}</span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                            u.rol === "SUPERADMIN"
                              ? "bg-purple-100 text-purple-800"
                              : u.rol === "ADMIN"
                              ? "bg-amber-100 text-amber-800"
                              : u.rol === "OPERADOR_RUTA"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-stone-200 text-stone-800"
                          }`}
                        >
                          {u.rol}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/60 border border-dashed border-amber-200 rounded-xl text-center">
                    <p className="text-xs text-amber-800 font-medium">
                      Esta empresa aún no tiene usuarios administradores registrados.
                    </p>
                    <button
                      onClick={() => {
                        setEmpresaSeleccionadaParaAdmin(empresa);
                        setErrorModal(null);
                      }}
                      className="mt-1.5 text-xs text-amber-900 font-bold underline hover:no-underline"
                    >
                      + Crear su primer Administrador ahora
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal para Crear Administrador de una Empresa */}
      {empresaSeleccionadaParaAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Nuevo Usuario Administrador</h3>
                  <p className="text-xs text-stone-500">
                    Para: <strong className="text-stone-800">{empresaSeleccionadaParaAdmin.nombre}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmpresaSeleccionadaParaAdmin(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearAdminModal} className="p-5 space-y-4">
              {errorModal && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
                  {errorModal}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="ej. Mariana Gómez"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Correo Electrónico (Para Iniciar Sesión)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="admin@empresa.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Contraseña Temporal
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
                <span className="text-[11px] text-stone-400 mt-1 block">
                  El usuario podrá ingresar con este correo y contraseña para administrar exclusivamente esta empresa.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmpresaSeleccionadaParaAdmin(null)}
                  className="px-4 py-2 border border-stone-200 text-stone-600 font-bold rounded-xl text-xs hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs disabled:opacity-50"
                >
                  {isPending ? "Creando..." : "Crear Administrador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
