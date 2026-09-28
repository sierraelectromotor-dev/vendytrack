"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  ArrowLeftRight,
  Banknote,
  Building,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  CreditCard,
  Wallet,
} from "lucide-react";
import { obtenerCuentasBancarias } from "@/actions/cuentasBancarias";
import { registrarTraslado } from "@/actions/traslados";

interface RegistrarTrasladoModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type ModoTraslado = "EFECTIVO_A_BANCO" | "BANCO_A_EFECTIVO" | "ENTRE_BANCOS";

export const RegistrarTrasladoModal: React.FC<RegistrarTrasladoModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [modo, setModo] = useState<ModoTraslado>("EFECTIVO_A_BANCO");
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [cargandoCuentas, setCargandoCuentas] = useState(true);

  const [cuentaOrigenId, setCuentaOrigenId] = useState<string>("");
  const [cuentaDestinoId, setCuentaDestinoId] = useState<string>("");
  const [monto, setMonto] = useState<string>("");
  const [fecha, setFecha] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [concepto, setConcepto] = useState<string>("");
  const [referencia, setReferencia] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadCuentas() {
      setCargandoCuentas(true);
      const res = await obtenerCuentasBancarias();
      if (res.success && res.data) {
        const activas = res.data.filter((c: any) => c.activa);
        setCuentas(activas);
        if (activas.length > 0) {
          setCuentaDestinoId(activas[0].id);
          setCuentaOrigenId(activas[0].id);
          if (activas.length > 1) {
            setCuentaDestinoId(activas[1].id);
          }
        }
      }
      setCargandoCuentas(false);
    }
    loadCuentas();
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const valorMonto = parseFloat(monto);
    if (isNaN(valorMonto) || valorMonto <= 0) {
      setError("Ingresa un monto válido mayor a cero.");
      return;
    }

    let origenTipo: "EFECTIVO" | "BANCO" = "EFECTIVO";
    let destinoTipo: "EFECTIVO" | "BANCO" = "BANCO";
    let origenId: string | null = null;
    let destinoId: string | null = null;

    if (modo === "EFECTIVO_A_BANCO") {
      origenTipo = "EFECTIVO";
      destinoTipo = "BANCO";
      destinoId = cuentaDestinoId;
      if (!destinoId) {
        setError("Selecciona la cuenta bancaria de destino.");
        return;
      }
    } else if (modo === "BANCO_A_EFECTIVO") {
      origenTipo = "BANCO";
      destinoTipo = "EFECTIVO";
      origenId = cuentaOrigenId;
      if (!origenId) {
        setError("Selecciona la cuenta bancaria de origen.");
        return;
      }
    } else {
      origenTipo = "BANCO";
      destinoTipo = "BANCO";
      origenId = cuentaOrigenId;
      destinoId = cuentaDestinoId;
      if (!origenId || !destinoId) {
        setError("Selecciona ambas cuentas bancarias.");
        return;
      }
      if (origenId === destinoId) {
        setError("La cuenta de origen y de destino no pueden ser la misma.");
        return;
      }
    }

    const formData = new FormData();
    formData.append("origenTipo", origenTipo);
    if (origenId) formData.append("cuentaOrigenId", origenId);
    formData.append("destinoTipo", destinoTipo);
    if (destinoId) formData.append("cuentaDestinoId", destinoId);
    formData.append("monto", valorMonto.toString());
    formData.append("fecha", fecha);
    if (concepto.trim()) formData.append("concepto", concepto.trim());
    if (referencia.trim()) formData.append("referencia", referencia.trim());

    startTransition(async () => {
      const res = await registrarTraslado(formData);
      if (res.success) {
        setSuccess(true);
        onSuccess();
        setTimeout(() => {
          onClose();
        }, 700);
      } else {
        setError(res.error || "Error al registrar el traslado");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-blue-500/10 dark:bg-blue-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-sm">
                Registrar Traslado de Fondos
              </h3>
              <p className="text-[11px] text-stone-500">
                Movimiento interno entre efectivo y bancos o entre cuentas
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

        {/* Selector de Tipo de Traslado */}
        <div className="p-4 pb-0">
          <div className="grid grid-cols-3 gap-2 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl text-center text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setModo("EFECTIVO_A_BANCO")}
              className={`py-2 px-1.5 rounded-lg transition-all ${
                modo === "EFECTIVO_A_BANCO"
                  ? "bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Efectivo ➔ Banco
            </button>
            <button
              type="button"
              onClick={() => setModo("BANCO_A_EFECTIVO")}
              className={`py-2 px-1.5 rounded-lg transition-all ${
                modo === "BANCO_A_EFECTIVO"
                  ? "bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Banco ➔ Efectivo
            </button>
            <button
              type="button"
              onClick={() => setModo("ENTRE_BANCOS")}
              className={`py-2 px-1.5 rounded-lg transition-all ${
                modo === "ENTRE_BANCOS"
                  ? "bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Entre Bancos
            </button>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Traslado de fondos registrado exitosamente</span>
            </div>
          )}

          {/* Bloque Visual de Origen y Destino */}
          <div className="p-3.5 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/80 rounded-2xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* Origen */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Origen de los Fondos
                </span>
                {modo === "EFECTIVO_A_BANCO" ? (
                  <div className="p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl flex items-center gap-2 text-stone-800 dark:text-stone-200 font-bold">
                    <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Caja General (Efectivo)</span>
                  </div>
                ) : (
                  <select
                    value={cuentaOrigenId}
                    onChange={(e) => setCuentaOrigenId(e.target.value)}
                    disabled={cargandoCuentas || cuentas.length === 0}
                    className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-200 font-bold outline-none focus:border-blue-500"
                  >
                    {cuentas.length === 0 ? (
                      <option value="">No hay cuentas bancarias registradas</option>
                    ) : (
                      cuentas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.banco} ({c.numeroCuenta})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Destino */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Destino de los Fondos
                </span>
                {modo === "BANCO_A_EFECTIVO" ? (
                  <div className="p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl flex items-center gap-2 text-stone-800 dark:text-stone-200 font-bold">
                    <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Caja General (Efectivo)</span>
                  </div>
                ) : (
                  <select
                    value={cuentaDestinoId}
                    onChange={(e) => setCuentaDestinoId(e.target.value)}
                    disabled={cargandoCuentas || cuentas.length === 0}
                    className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-200 font-bold outline-none focus:border-blue-500"
                  >
                    {cuentas.length === 0 ? (
                      <option value="">No hay cuentas bancarias registradas</option>
                    ) : (
                      cuentas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.banco} ({c.numeroCuenta})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>
            </div>

            {cuentas.length === 0 && modo !== "BANCO_A_EFECTIVO" && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                ⚠️ Para realizar traslados con bancos debes registrar al menos una cuenta bancaria en el botón "Cuentas Bancarias".
              </p>
            )}
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Monto del Traslado ($ COP) *
              </label>
              <input
                type="number"
                step="any"
                required
                min="1"
                placeholder="ej. 500000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-blue-500 font-bold text-sm"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Fecha del Movimiento *
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Concepto / Justificación */}
          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Concepto / Motivo del Traslado
            </label>
            <input
              type="text"
              placeholder={
                modo === "EFECTIVO_A_BANCO"
                  ? "ej. Consignación recaudo de semana"
                  : modo === "BANCO_A_EFECTIVO"
                  ? "ej. Retiro para compras de insumos menores"
                  : "ej. Transferencia por concentración de fondos"
              }
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {/* Referencia o Soporte */}
          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Número de Referencia / Comprobante (Opcional)
            </label>
            <input
              type="text"
              placeholder="ej. Aprobación #192834 o Recibo de consignación"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || (cuentas.length === 0 && modo !== "BANCO_A_EFECTIVO")}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirmar Traslado</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
