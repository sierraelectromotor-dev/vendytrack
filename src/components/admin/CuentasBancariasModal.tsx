"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  Banknote,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  CreditCard,
  Star,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  obtenerCuentasBancarias,
  crearCuentaBancaria,
  eliminarCuentaBancaria,
  toggleCuentaBancariaActiva,
} from "@/actions/cuentasBancarias";

interface CuentasBancariasModalProps {
  onClose: () => void;
}

const BANCOS_POPULARES = [
  "Bancolombia",
  "Davivienda",
  "Nequi",
  "Daviplata",
  "Banco de Bogotá",
  "BBVA",
  "Banco de Occidente",
  "Scotiabank Colpatria",
  "Nu Colombia",
  "Banco Agrario",
  "Banco Popular",
  "Lulo Bank",
  "Otro",
];

export const CuentasBancariasModal: React.FC<CuentasBancariasModalProps> = ({ onClose }) => {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Form state
  const [banco, setBanco] = useState("Bancolombia");
  const [otroBanco, setOtroBanco] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState("AHORROS");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [titular, setTitular] = useState("");
  const [nitTitular, setNitTitular] = useState("");
  const [esPrincipal, setEsPrincipal] = useState(false);

  const cargarCuentas = async () => {
    setCargando(true);
    const res = await obtenerCuentasBancarias();
    if (res.success && res.data) {
      setCuentas(res.data);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarCuentas();
  }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const bancoFinal = banco === "Otro" ? otroBanco.trim() : banco;
    if (!bancoFinal) {
      setError("Debes indicar el nombre del banco.");
      return;
    }

    const formData = new FormData();
    formData.append("banco", bancoFinal);
    formData.append("tipoCuenta", tipoCuenta);
    formData.append("numeroCuenta", numeroCuenta);
    formData.append("titular", titular);
    if (nitTitular) formData.append("nitTitular", nitTitular);
    if (esPrincipal) formData.append("esPrincipal", "true");

    startTransition(async () => {
      const res = await crearCuentaBancaria(formData);
      if (res.success) {
        setSuccess("Cuenta bancaria registrada exitosamente.");
        setMostrarFormulario(false);
        setNumeroCuenta("");
        setTitular("");
        setNitTitular("");
        setOtroBanco("");
        setEsPrincipal(false);
        await cargarCuentas();
      } else {
        setError(res.error || "Error al crear la cuenta bancaria.");
      }
    });
  };

  const handleToggleActiva = async (id: string, actual: boolean) => {
    startTransition(async () => {
      const res = await toggleCuentaBancariaActiva(id, !actual);
      if (res.success) {
        setCuentas((prev) =>
          prev.map((c) => (c.id === id ? { ...c, activa: !actual } : c))
        );
      } else {
        setError(res.error || "No se pudo cambiar el estado.");
      }
    });
  };

  const handleEliminar = async (id: string, nombreBanco: string) => {
    if (!confirm(`¿Eliminar la cuenta de ${nombreBanco}? Esta acción no se puede deshacer.`)) {
      return;
    }
    startTransition(async () => {
      const res = await eliminarCuentaBancaria(id);
      if (res.success) {
        setCuentas((prev) => prev.filter((c) => c.id !== id));
        setSuccess("Cuenta bancaria eliminada.");
      } else {
        setError(res.error || "No se pudo eliminar la cuenta.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="p-5 sm:p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                Cuentas Bancarias para Recaudos
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Administra las cuentas donde tus clientes realizan transferencias y pagos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Botón para desplegar formulario */}
          {!mostrarFormulario && (
            <button
              onClick={() => setMostrarFormulario(true)}
              className="w-full py-3 px-4 border-2 border-dashed border-stone-200 dark:border-stone-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl text-stone-600 dark:text-stone-300 font-bold flex items-center justify-center gap-2 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>Agregar Nueva Cuenta Bancaria</span>
            </button>
          )}

          {/* Formulario nuevo */}
          {mostrarFormulario && (
            <form
              onSubmit={handleCrear}
              className="p-4 sm:p-5 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 rounded-2xl space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Nueva Cuenta Bancaria
                </span>
                <button
                  type="button"
                  onClick={() => setMostrarFormulario(false)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Banco */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    Entidad Bancaria / Billetera
                  </label>
                  <select
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl font-medium text-stone-800 dark:text-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {BANCOS_POPULARES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {banco === "Otro" && (
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                      Nombre del Banco
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Banco Itaú"
                      value={otroBanco}
                      onChange={(e) => setOtroBanco(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl font-medium text-stone-800 dark:text-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {/* Tipo de Cuenta */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    Tipo de Cuenta
                  </label>
                  <select
                    value={tipoCuenta}
                    onChange={(e) => setTipoCuenta(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl font-medium text-stone-800 dark:text-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="AHORROS">Cuenta de Ahorros</option>
                    <option value="CORRIENTE">Cuenta Corriente</option>
                    <option value="BILLETERA_DIGITAL">Billetera Digital / Depósito</option>
                  </select>
                </div>

                {/* Número de Cuenta */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    Número de Cuenta / Teléfono
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. 123-456789-00"
                    value={numeroCuenta}
                    onChange={(e) => setNumeroCuenta(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl font-medium text-stone-800 dark:text-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                {/* Titular */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    Titular de la Cuenta
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Distribuciones Vending S.A.S"
                    value={titular}
                    onChange={(e) => setTitular(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl font-medium text-stone-800 dark:text-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* NIT / Cédula Titular */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    NIT o Cédula Titular (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="ej. 900.123.456-7"
                    value={nitTitular}
                    onChange={(e) => setNitTitular(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl font-medium text-stone-800 dark:text-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Es Principal */}
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="esPrincipalCheck"
                    checked={esPrincipal}
                    onChange={(e) => setEsPrincipal(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label
                    htmlFor="esPrincipalCheck"
                    className="text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer"
                  >
                    Cuenta bancaria principal (Predeterminada)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarFormulario(false)}
                  className="px-3.5 py-1.5 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-600 dark:text-stone-300 font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cuenta</span>
                </button>
              </div>
            </form>
          )}

          {/* Listado de cuentas registradas */}
          <div className="space-y-3">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 flex items-center justify-between text-xs sm:text-sm">
              <span>Cuentas Registradas ({cuentas.length})</span>
            </h3>

            {cargando ? (
              <div className="py-8 flex flex-col items-center justify-center text-stone-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs">Cargando cuentas bancarias...</span>
              </div>
            ) : cuentas.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl p-6">
                <Building className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                <p className="font-semibold text-stone-700 dark:text-stone-300">
                  No hay cuentas bancarias registradas
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  Agrega una cuenta para que aparezca configurada en el módulo de recaudo.
                </p>
              </div>
            ) : (
              cuentas.map((c) => (
                <div
                  key={c.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    c.activa
                      ? "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs"
                      : "bg-stone-50 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 opacity-60"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-stone-900 dark:text-white text-sm">
                        {c.banco}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                        {c.tipoCuenta === "AHORROS"
                          ? "Ahorros"
                          : c.tipoCuenta === "CORRIENTE"
                          ? "Corriente"
                          : "Billetera"}
                      </span>
                      {c.esPrincipal && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Principal
                        </span>
                      )}
                      {!c.activa && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                          Inactiva
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {c.numeroCuenta}
                    </div>

                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      Titular: <span className="font-medium text-stone-700 dark:text-stone-300">{c.titular}</span>
                      {c.nitTitular && ` · NIT: ${c.nitTitular}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleActiva(c.id, c.activa)}
                      title={c.activa ? "Desactivar cuenta" : "Activar cuenta"}
                      className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                    >
                      {c.activa ? (
                        <ToggleRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-stone-400" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEliminar(c.id, c.banco)}
                      title="Eliminar cuenta"
                      className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-stone-800 flex justify-end bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold rounded-xl text-xs sm:text-sm hover:bg-stone-800 dark:hover:bg-stone-100 transition shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
