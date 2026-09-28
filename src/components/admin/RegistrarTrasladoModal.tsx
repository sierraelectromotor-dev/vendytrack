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
  ArrowUpDown,
  FileText,
} from "lucide-react";
import { obtenerCuentasBancarias } from "@/actions/cuentasBancarias";
import { registrarTraslado } from "@/actions/traslados";

interface RegistrarTrasladoModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const RegistrarTrasladoModal: React.FC<RegistrarTrasladoModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [cargandoCuentas, setCargandoCuentas] = useState(true);

  // Origen y Destino: "EFECTIVO" o el id de una cuenta bancaria
  const [origen, setOrigen] = useState<string>("EFECTIVO");
  const [destino, setDestino] = useState<string>("");

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
          // Destino por defecto: la primera cuenta bancaria activa
          setDestino(activas[0].id);
        }
      }
      setCargandoCuentas(false);
    }
    loadCuentas();
  }, []);

  const formatearDinero = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleIntercambiar = () => {
    setError(null);
    const prevOrigen = origen;
    const prevDestino = destino;
    setOrigen(prevDestino);
    setDestino(prevOrigen);
  };

  // Obtener cuenta de origen y destino si son bancos
  const cuentaOrigenObj = cuentas.find((c) => c.id === origen);
  const cuentaDestinoObj = cuentas.find((c) => c.id === destino);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const valorMonto = parseFloat(monto);
    if (isNaN(valorMonto) || valorMonto <= 0) {
      setError("Ingresa un monto válido mayor a cero.");
      return;
    }

    if (!origen) {
      setError("Selecciona el fondo o cuenta de origen.");
      return;
    }

    if (!destino) {
      setError("Selecciona el fondo o cuenta de destino.");
      return;
    }

    if (origen === destino) {
      setError("El origen y el destino no pueden ser el mismo fondo o cuenta.");
      return;
    }

    const origenTipo = origen === "EFECTIVO" ? "EFECTIVO" : "BANCO";
    const cuentaOrigenId = origen === "EFECTIVO" ? null : origen;

    const destinoTipo = destino === "EFECTIVO" ? "EFECTIVO" : "BANCO";
    const cuentaDestinoId = destino === "EFECTIVO" ? null : destino;

    const formData = new FormData();
    formData.append("origenTipo", origenTipo);
    if (cuentaOrigenId) formData.append("cuentaOrigenId", cuentaOrigenId);
    formData.append("destinoTipo", destinoTipo);
    if (cuentaDestinoId) formData.append("cuentaDestinoId", cuentaDestinoId);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-blue-500/10 dark:bg-blue-950/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-sm">
                Traslado entre Cuentas / Fondos
              </h3>
              <p className="text-[11px] text-stone-500">
                Mueve fondos entre efectivo y bancos, o entre cuentas bancarias
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

        {/* Formulario con scroll independiente si es pantalla pequeña */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Traslado registrado exitosamente</span>
            </div>
          )}

          {/* Bloque Unificado: Origen ➔ Destino */}
          <div className="p-4 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/80 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Selector Origen */}
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1">
                  <span>Desde (Origen) *</span>
                </label>
                <div className="relative">
                  <select
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-200 font-bold outline-none focus:border-blue-500 shadow-xs appearance-none pr-8 text-xs cursor-pointer"
                  >
                    <option value="EFECTIVO">💵 Caja General (Efectivo)</option>
                    {cuentas.length > 0 && (
                      <optgroup label="Cuentas Bancarias">
                        {cuentas.map((c) => (
                          <option key={c.id} value={c.id}>
                            🏦 {c.banco} ({c.tipoCuenta || "Cuenta"}) - {c.numeroCuenta}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                    ▼
                  </div>
                </div>
                {cuentaOrigenObj && (
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block pl-0.5">
                    Saldo registrado: <strong className="text-emerald-600 dark:text-emerald-400">{formatearDinero(Number(cuentaOrigenObj.saldoActual || 0))}</strong>
                  </span>
                )}
              </div>

              {/* Botón Intercambiar Origen / Destino */}
              <div className="flex items-center justify-center pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={handleIntercambiar}
                  className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-800 shadow-xs transition-all active:scale-95"
                  title="Invertir origen y destino"
                >
                  <ArrowUpDown className="w-4 h-4 sm:hidden" />
                  <ArrowLeftRight className="w-4 h-4 hidden sm:block" />
                </button>
              </div>

              {/* Selector Destino */}
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1">
                  <span>Hacia (Destino) *</span>
                </label>
                <div className="relative">
                  <select
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-200 font-bold outline-none focus:border-blue-500 shadow-xs appearance-none pr-8 text-xs cursor-pointer"
                  >
                    <option value="" disabled>Seleccionar destino...</option>
                    <option value="EFECTIVO">💵 Caja General (Efectivo)</option>
                    {cuentas.length > 0 && (
                      <optgroup label="Cuentas Bancarias">
                        {cuentas.map((c) => (
                          <option key={c.id} value={c.id}>
                            🏦 {c.banco} ({c.tipoCuenta || "Cuenta"}) - {c.numeroCuenta}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                    ▼
                  </div>
                </div>
                {cuentaDestinoObj && (
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block pl-0.5">
                    Saldo registrado: <strong className="text-emerald-600 dark:text-emerald-400">{formatearDinero(Number(cuentaDestinoObj.saldoActual || 0))}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Aviso si Origen y Destino coinciden */}
            {origen && destino && origen === destino && (
              <p className="text-[11px] text-rose-500 dark:text-rose-400 font-bold flex items-center gap-1 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                El origen y el destino no pueden ser el mismo fondo o cuenta.
              </p>
            )}
          </div>

          {/* Monto del Traslado */}
          <div className="space-y-1">
            <label className="font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
              <span>Monto a Trasladar ($ COP) *</span>
              {parseFloat(monto) > 0 && (
                <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px]">
                  {formatearDinero(parseFloat(monto))}
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-sm">
                $
              </span>
              <input
                type="number"
                step="any"
                required
                min="1"
                placeholder="ej. 350000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 pl-7 outline-none focus:border-blue-500 font-bold text-sm text-stone-900 dark:text-white"
              />
            </div>
          </div>

          {/* Fecha del Movimiento */}
          <div className="space-y-1">
            <label className="font-semibold text-stone-700 dark:text-stone-300 block">
              Fecha del Traslado *
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-blue-500 text-stone-900 dark:text-white font-medium"
              />
            </div>
          </div>

          {/* Concepto / Motivo */}
          <div className="space-y-1">
            <label className="font-semibold text-stone-700 dark:text-stone-300 block">
              Concepto / Motivo del Traslado
            </label>
            <input
              type="text"
              placeholder={
                origen === "EFECTIVO"
                  ? "ej. Consignación recaudo de semana"
                  : destino === "EFECTIVO"
                  ? "ej. Retiro para compras de insumos menores"
                  : "ej. Transferencia interbancaria por concentración de fondos"
              }
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium text-stone-900 dark:text-white"
            />
          </div>

          {/* Referencia o Comprobante */}
          <div className="space-y-1">
            <label className="font-semibold text-stone-700 dark:text-stone-300 block">
              Número de Referencia / Comprobante (Opcional)
            </label>
            <input
              type="text"
              placeholder="ej. Aprobación #192834 o Recibo de consignación"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-blue-500 text-stone-900 dark:text-white"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || origen === destino || !monto || parseFloat(monto) <= 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Registrar Traslado</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
