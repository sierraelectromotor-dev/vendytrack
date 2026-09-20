"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  liquidacionFormSchema,
  LiquidacionFormData,
  BEBIDAS_CATALOGO,
  TipoBebidaEnum,
} from "@/types/liquidacion";
import { registrarLiquidacion, obtenerDatosMaquina } from "@/actions/liquidacion";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { formatCOP, formatFechaColombia } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import {
  Coffee,
  Camera,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Send,
  Building2,
  FileText,
  CreditCard,
  ChevronRight,
  Sparkles,
  MapPin,
  Truck,
  Check,
  Loader2,
  ArrowRight,
  Lock,
  Minus,
  Plus,
  RotateCcw,
  BadgeCheck,
} from "lucide-react";

export interface MaquinaRutaItem {
  id: string;
  codigoSerial: string;
  modelo: string;
  ubicacion: string;
  clienteNombre: string;
  clienteWhatsapp?: string | null;
  rutaNombre: string;
  liquidadaHoy: boolean;
  ultimaLiquidacionId?: string | null;
  ultimaLiquidacionFecha?: string | null;
  ultimoTotalFacturado?: number | null;
  ultimoConsecutivo?: number | null;
  ultimoMetodoPago?: "EFECTIVO" | "TRANSFERENCIA" | null;
  ultimoTotalTazas?: number | null;
  ultimoReciboPdfUrl?: string | null;
}

interface MobileLiquidacionFormProps {
  initialMaquinaId?: string;
  maquinasRuta?: MaquinaRutaItem[];
}

export const MobileLiquidacionForm: React.FC<MobileLiquidacionFormProps> = ({
  initialMaquinaId = "maq-demo-01",
  maquinasRuta = [],
}) => {
  const [currentMaquinaId, setCurrentMaquinaId] = useState<string>(initialMaquinaId);
  const [rutaMaquinas, setRutaMaquinas] = useState<MaquinaRutaItem[]>(maquinasRuta);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [clienteInfo, setClienteInfo] = useState<{
    id: string;
    razonSocial: string;
    sede: string;
    direccion: string;
    contacto: string;
    whatsapp: string;
  }>({
    id: "",
    razonSocial: "Cargando cliente...",
    sede: "",
    direccion: "",
    contacto: "",
    whatsapp: "",
  });

  const [maquinaInfo, setMaquinaInfo] = useState<{
    id: string;
    codigoSerial: string;
    modelo: string;
    ubicacion: string;
  }>({
    id: "",
    codigoSerial: "",
    modelo: "",
    ubicacion: "",
  });

  const [counterPhotoPreview, setCounterPhotoPreview] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LiquidacionFormData>({
    resolver: zodResolver(liquidacionFormSchema),
    defaultValues: {
      clienteId: "",
      maquinaId: initialMaquinaId,
      metodoPago: "EFECTIVO",
      detalles: [],
      fotoContadorBase64: "",
      firmaClienteBase64: "",
      notas: "",
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "detalles",
  });

  // useWatch garantiza cálculos en tiempo real instantáneos al modificar cualquier campo
  const watchedDetalles = useWatch({ control, name: "detalles" });
  const watchedMetodoPago = useWatch({ control, name: "metodoPago" });

  useEffect(() => {
    if (initialMaquinaId) setCurrentMaquinaId(initialMaquinaId);
  }, [initialMaquinaId]);

  useEffect(() => {
    if (maquinasRuta && maquinasRuta.length > 0) {
      setRutaMaquinas(maquinasRuta);
    }
  }, [maquinasRuta]);

  // Encontrar la máquina actual en la hoja de ruta
  const maquinaActual = useMemo(() => {
    return rutaMaquinas.find((m) => m.id === currentMaquinaId);
  }, [rutaMaquinas, currentMaquinaId]);

  // Cargar contadores anteriores y precios al montar el componente o cambiar de máquina
  useEffect(() => {
    async function loadData() {
      if (!currentMaquinaId) return;
      setLoadingInitial(true);
      setSubmitError(null);

      const res = await obtenerDatosMaquina(currentMaquinaId);
      if (res.success && res.data) {
        setClienteInfo({
          id: res.data.cliente.id,
          razonSocial: res.data.cliente.razonSocial,
          sede: res.data.cliente.sede,
          direccion: res.data.cliente.direccion,
          contacto: res.data.cliente.contacto,
          whatsapp: res.data.cliente.whatsapp,
        });

        setMaquinaInfo({
          id: res.data.maquina.id,
          codigoSerial: res.data.maquina.codigoSerial,
          modelo: res.data.maquina.modelo,
          ubicacion: res.data.maquina.ubicacion,
        });

        const updatedDetalles = res.data.bebidas.map((b) => ({
          bebida: b.bebida as TipoBebidaEnum,
          contadorAnterior: b.contadorAnterior,
          contadorActual: b.contadorAnterior, // Sugerir el anterior como valor base
          bebidasDanadas: 0,
          precioUnitario: b.precioUnitario,
        }));

        reset({
          clienteId: res.data.cliente.id,
          maquinaId: res.data.maquina.id,
          metodoPago: "EFECTIVO",
          detalles: updatedDetalles,
          fotoContadorBase64: "",
          firmaClienteBase64: "",
          notas: "",
        });
      }
      setLoadingInitial(false);
    }
    loadData();
  }, [currentMaquinaId, reset]);

  // Cálculos matemáticos reactivos instantáneos por cada pulsación
  const calculations = useMemo(() => {
    if (!watchedDetalles || watchedDetalles.length === 0) {
      return {
        lineas: [],
        totalTazasNetas: 0,
        totalFacturado: 0,
      };
    }

    let totalTazasNetas = 0;
    let totalFacturado = 0;

    const lineas = watchedDetalles.map((item) => {
      const ca = Number(item?.contadorActual) || 0;
      const cf = Number(item?.contadorAnterior) || 0;
      const bd = Number(item?.bebidasDanadas) || 0;
      const precio = Number(item?.precioUnitario) || 0;

      const subtotalContador = Math.max(0, ca - cf);
      const tazasNetas = Math.max(0, subtotalContador - bd);
      const valorLinea = tazasNetas * precio;

      totalTazasNetas += tazasNetas;
      totalFacturado += valorLinea;

      return {
        bebida: item?.bebida,
        contadorAnterior: cf,
        contadorActual: ca,
        bebidasDanadas: bd,
        subtotalContador,
        tazasNetas,
        valorLinea,
      };
    });

    return {
      lineas,
      totalTazasNetas,
      totalFacturado,
    };
  }, [watchedDetalles]);

  // Steppers táctiles para bebidas dañadas / purgas
  const handleIncrementDanadas = (index: number) => {
    const current = Number(watchedDetalles?.[index]?.bebidasDanadas) || 0;
    setValue(`detalles.${index}.bebidasDanadas`, current + 1, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleDecrementDanadas = (index: number) => {
    const current = Number(watchedDetalles?.[index]?.bebidasDanadas) || 0;
    if (current > 0) {
      setValue(`detalles.${index}.bebidasDanadas`, current - 1, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  // Manejo de la captura de foto del contador
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setCounterPhotoPreview(base64);
      setValue("fotoContadorBase64", base64, { shouldValidate: true });
    };
    reader.readAsDataURL(file);
  };

  // Manejo de firma táctil
  const handleSignatureSave = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    setValue("firmaClienteBase64", dataUrl, { shouldValidate: true });
  };

  // Envío del formulario
  const onSubmit = async (data: LiquidacionFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    const result = await registrarLiquidacion(data);

    setIsSubmitting(false);
    if (result.success && result.data) {
      // Marcar la máquina como liquidada hoy en el estado local y registrar sus datos
      setRutaMaquinas((prev) =>
        prev.map((m) =>
          m.id === currentMaquinaId
            ? {
                ...m,
                liquidadaHoy: true,
                ultimoConsecutivo:
                  typeof result.data.consecutivo === "number"
                    ? result.data.consecutivo
                    : null,
                ultimoTotalFacturado: result.data.totalFacturado,
                ultimoTotalTazas: result.data.totalTazasNetas,
                ultimoReciboPdfUrl: result.data.pdfUrl || null,
                ultimoMetodoPago: data.metodoPago,
                ultimaLiquidacionFecha: new Date().toISOString(),
              }
            : m
        )
      );
      reset();
      setCounterPhotoPreview(null);
      setSignatureDataUrl("");
    } else {
      setSubmitError(result.error || "Ocurrió un error al procesar la liquidación");
    }
  };

  // Buscar la siguiente máquina pendiente en la ruta
  const siguienteMaquinaPendiente = useMemo(() => {
    return rutaMaquinas.find((m) => m.id !== currentMaquinaId && !m.liquidadaHoy);
  }, [rutaMaquinas, currentMaquinaId]);

  const totalCompletadas = useMemo(() => {
    return rutaMaquinas.filter((m) => m.liquidadaHoy).length;
  }, [rutaMaquinas]);

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 text-coffee-600 animate-spin" />
        <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
          Cargando configuración de la máquina...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto pb-32 space-y-4 px-3 sm:px-4">
      {/* 1. BARRA DE HOJA DE RUTA DEL DÍA */}
      {rutaMaquinas.length > 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200">
              <Truck className="w-4 h-4 text-coffee-600" />
              <span>Hoja de Ruta de Hoy</span>
            </div>
            <span className="font-semibold text-stone-500">
              {totalCompletadas} de {rutaMaquinas.length} completadas
            </span>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  rutaMaquinas.length > 0
                    ? Math.round((totalCompletadas / rutaMaquinas.length) * 100)
                    : 0
                }%`,
              }}
            />
          </div>

          {/* Selector de máquinas en píldoras horizontales */}
          <div className="flex gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            {rutaMaquinas.map((m) => {
              const isCurrent = m.id === currentMaquinaId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (!isCurrent) {
                      setCurrentMaquinaId(m.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border font-medium ${
                    isCurrent
                      ? "bg-coffee-800 text-white border-coffee-800 shadow-md ring-2 ring-coffee-500/30"
                      : m.liquidadaHoy
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                      : "bg-stone-50 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100"
                  }`}
                >
                  {m.liquidadaHoy ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                  )}
                  <span>{m.codigoSerial}</span>
                  <span className="text-[10px] opacity-75 max-w-[90px] truncate">
                    ({m.clienteNombre})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. ENCABEZADO DE LA MÁQUINA SELECCIONADA */}
      <div className="bg-gradient-to-br from-coffee-800 to-coffee-950 text-white rounded-2xl p-4 shadow-mobile space-y-3 border border-coffee-700/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <Coffee className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">
                {maquinaInfo.codigoSerial || maquinaActual?.codigoSerial}
              </h1>
              <span className="text-[11px] text-amber-200/80">
                {maquinaInfo.modelo || maquinaActual?.modelo || "Máquina Vending"}
              </span>
            </div>
          </div>
          {maquinaActual?.liquidadaHoy ? (
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white rounded-full flex items-center gap-1 shadow-sm">
              <BadgeCheck className="w-3.5 h-3.5" /> Liquidada Hoy
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-coffee-950 rounded-full">
              Pendiente
            </span>
          )}
        </div>

        <div className="bg-black/25 rounded-xl p-3 space-y-1 text-xs backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-white font-semibold">
            <Building2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>{clienteInfo.razonSocial}</span>
          </div>
          <p className="text-stone-300 text-[11px] pl-5">
            {clienteInfo.sede} • {clienteInfo.direccion}
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px] text-amber-200">
            <span>Ubicación: <strong>{maquinaInfo.ubicacion || "Punto de café"}</strong></span>
            <span>Ruta: <strong>{maquinaActual?.rutaNombre || "Principal"}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. ESTADO BLOQUEADO: SI LA MÁQUINA YA FUE LIQUIDADA HOY */}
      {maquinaActual?.liquidadaHoy ? (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-stone-900 border border-emerald-500/30 rounded-2xl p-6 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-600">
                Punto de Ruta Liquidado
              </span>
              <h2 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                {maquinaActual.ultimoConsecutivo
                  ? `LIQ-${maquinaActual.ultimoConsecutivo.toString().padStart(4, "0")}`
                  : "Liquidación Registrada"}
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                {maquinaActual.ultimaLiquidacionFecha
                  ? `Registrada el ${formatFechaColombia(maquinaActual.ultimaLiquidacionFecha)}`
                  : "Completada el día de hoy"}
              </p>
            </div>

            {/* Resumen Financiero de la Liquidación */}
            <div className="grid grid-cols-2 gap-3 bg-stone-50 dark:bg-stone-800/60 p-4 rounded-xl text-left text-xs">
              <div>
                <span className="text-stone-500 block">Tazas Netas</span>
                <span className="text-lg font-bold text-stone-900 dark:text-white">
                  {maquinaActual.ultimoTotalTazas ?? "--"} tazas
                </span>
              </div>
              <div>
                <span className="text-stone-500 block">Total Facturado</span>
                <span className="text-lg font-black text-coffee-700 dark:text-amber-400">
                  {formatCOP(maquinaActual.ultimoTotalFacturado || 0)}
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-stone-200 dark:border-stone-700 flex justify-between text-[11px]">
                <span className="text-stone-500">Método de Pago:</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {maquinaActual.ultimoMetodoPago || "EFECTIVO"}
                </span>
              </div>
            </div>

            {/* Acciones del Comprobante */}
            <div className="space-y-2.5 pt-2">
              {/* Botón WhatsApp */}
              {clienteInfo.whatsapp && (
                <a
                  href={buildWhatsAppLink(clienteInfo.whatsapp, {
                    consecutivo: maquinaActual.ultimoConsecutivo || "Comprobante",
                    clienteNombre: clienteInfo.razonSocial,
                    sede: clienteInfo.sede,
                    maquinaSerial: maquinaInfo.codigoSerial,
                    maquinaModelo: maquinaInfo.modelo,
                    totalFacturado: maquinaActual.ultimoTotalFacturado || 0,
                    totalTazasNetas: maquinaActual.ultimoTotalTazas || 0,
                    metodoPago: maquinaActual.ultimoMetodoPago || "EFECTIVO",
                    pdfUrl:
                      maquinaActual.ultimoReciboPdfUrl ||
                      (maquinaActual.ultimaLiquidacionId
                        ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/liquidaciones/${maquinaActual.ultimaLiquidacionId}/pdf`
                        : undefined),
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all text-xs"
                >
                  <Send className="w-4 h-4" />
                  Enviar Comprobante por WhatsApp
                </a>
              )}

              {/* Botón PDF */}
              {maquinaActual.ultimoReciboPdfUrl && (
                <a
                  href={maquinaActual.ultimoReciboPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold rounded-xl text-xs transition-all"
                >
                  <FileText className="w-4 h-4 text-coffee-600" />
                  Ver / Descargar Recibo Oficial (PDF)
                </a>
              )}

              {/* Nota de bloqueo estricto */}
              <div className="p-3 bg-stone-100 dark:bg-stone-800/80 rounded-xl text-[11px] text-stone-600 dark:text-stone-300 flex items-center gap-2 text-left">
                <Lock className="w-4 h-4 text-stone-500 flex-shrink-0" />
                <span>
                  <strong>Punto cerrado:</strong> No se permite re-editar o reenviar. Para registrar otra visita en el mismo día, un administrador debe reasignar la ruta.
                </span>
              </div>

              {/* Botón de Siguiente Máquina */}
              {siguienteMaquinaPendiente ? (
                <button
                  type="button"
                  onClick={() => setCurrentMaquinaId(siguienteMaquinaPendiente.id)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-coffee-800 hover:bg-coffee-900 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] border border-coffee-700 text-xs"
                >
                  <span>Siguiente Máquina: {siguienteMaquinaPendiente.codigoSerial}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-center">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                    🎉 ¡Ruta del Día Completada!
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Todas las máquinas asignadas han sido liquidadas.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 4. FORMULARIO ACTIVO (MÁQUINA PENDIENTE DE LIQUIDAR) */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* CABECERA VIVA DE TOTALES EN TIEMPO REAL */}
          <div className="bg-gradient-to-r from-coffee-50 to-amber-50 dark:from-stone-900 dark:to-stone-800 border-2 border-coffee-200 dark:border-coffee-900/50 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-coffee-700 dark:text-amber-400 tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Total a Cobrar (En Vivo)
                </span>
                <div className="text-2xl font-black text-coffee-900 dark:text-white mt-0.5">
                  {formatCOP(calculations.totalFacturado)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold text-stone-500 block uppercase">
                  Tazas Netas
                </span>
                <div className="text-xl font-black text-stone-800 dark:text-stone-200">
                  {calculations.totalTazasNetas}{" "}
                  <span className="text-xs font-normal text-stone-500">tazas</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-coffee-200/60 dark:border-stone-700 text-[10px] text-coffee-700 dark:text-stone-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Cálculo automático en tiempo real con cada cambio de contador</span>
            </div>
          </div>

          {/* ALERTA DE ERRORES */}
          {(submitError || Object.keys(errors).length > 0) && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">
                  {submitError || "Corrija los siguientes campos antes de continuar:"}
                </p>
                <ul className="list-disc list-inside text-[11px] text-rose-700 dark:text-rose-300 space-y-0.5">
                  {errors.firmaClienteBase64 && <li>Firma del cliente requerida</li>}
                  {errors.detalles && <li>Verifique los contadores ingresados</li>}
                </ul>
              </div>
            </div>
          )}

          {/* LISTADO DE BEBIDAS Y CONTADORES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-coffee-600" />
                Lectura de Contadores ({fields.length} Bebidas Configuradas)
              </h2>
              <span className="text-[11px] text-stone-500">
                Paso 1 de 3
              </span>
            </div>

            {fields.map((field, index) => {
              const bebidaCatalogo = BEBIDAS_CATALOGO.find((b) => b.id === field.bebida);
              const calc = calculations.lineas[index] || {
                subtotalContador: 0,
                tazasNetas: 0,
                valorLinea: 0,
              };
              const errorBebida = errors.detalles?.[index];

              return (
                <div
                  key={field.id}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 shadow-sm space-y-3 transition-all"
                >
                  {/* Cabecera de la Bebida */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" role="img" aria-label="bebida">
                        {bebidaCatalogo?.icono || "☕"}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-stone-900 dark:text-white leading-tight">
                          {bebidaCatalogo?.nombre || field.bebida}
                        </h3>
                        <span className="text-[11px] text-stone-500">
                          Tarifa: <strong>{formatCOP(field.precioUnitario)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-coffee-700 dark:text-amber-400 block">
                        {formatCOP(calc.valorLinea)}
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium">
                        {calc.tazasNetas} netas
                      </span>
                    </div>
                  </div>

                  {/* Campos de Lectura */}
                  <div className="grid grid-cols-12 gap-2 pt-1">
                    {/* Contador Anterior (Fijo / Bloqueado) */}
                    <div className="col-span-4 bg-stone-50 dark:bg-stone-800/70 p-2 rounded-xl border border-stone-200 dark:border-stone-700 flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-stone-500 uppercase flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Anterior
                      </span>
                      <span className="font-mono font-bold text-sm text-stone-700 dark:text-stone-300 mt-1">
                        {field.contadorAnterior}
                      </span>
                    </div>

                    {/* Nuevo Contador Actual (Editable Principal) */}
                    <div className="col-span-4 bg-white dark:bg-stone-950 p-2 rounded-xl border-2 border-coffee-500 dark:border-amber-500/70 shadow-sm focus-within:ring-2 focus-within:ring-coffee-500/30 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-coffee-800 dark:text-amber-300 uppercase">
                        Actual *
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={field.contadorAnterior}
                        placeholder={String(field.contadorAnterior)}
                        {...register(`detalles.${index}.contadorActual`, {
                          valueAsNumber: true,
                        })}
                        className="w-full bg-transparent font-mono font-black text-base text-stone-900 dark:text-white outline-none mt-1"
                      />
                    </div>

                    {/* Dañadas / Purgas con Steppers táctiles */}
                    <div className="col-span-4 bg-stone-50 dark:bg-stone-800/70 p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 flex flex-col justify-between">
                      <span className="text-[9px] font-semibold text-stone-500 uppercase text-center block">
                        Dañadas
                      </span>
                      <div className="flex items-center justify-between gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => handleDecrementDanadas(index)}
                          className="w-7 h-7 bg-white dark:bg-stone-700 hover:bg-stone-100 rounded-lg border border-stone-300 dark:border-stone-600 flex items-center justify-center text-stone-700 dark:text-stone-200 active:scale-95 transition-all"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold text-xs text-stone-800 dark:text-stone-100 w-5 text-center">
                          {watchedDetalles?.[index]?.bebidasDanadas || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIncrementDanadas(index)}
                          className="w-7 h-7 bg-white dark:bg-stone-700 hover:bg-stone-100 rounded-lg border border-stone-300 dark:border-stone-600 flex items-center justify-center text-stone-700 dark:text-stone-200 active:scale-95 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desglose Matemático de la Fila */}
                  <div className="flex items-center justify-between text-[11px] bg-stone-50 dark:bg-stone-800/50 px-3 py-1.5 rounded-xl text-stone-600 dark:text-stone-300 border border-stone-100 dark:border-stone-800">
                    <span>
                      Diferencia: <strong>{calc.subtotalContador}</strong>
                    </span>
                    <span>-</span>
                    <span>
                      Dañadas: <strong>{calc.bebidasDanadas}</strong>
                    </span>
                    <span>=</span>
                    <span className="font-bold text-coffee-800 dark:text-amber-400">
                      {calc.tazasNetas} tazas netas
                    </span>
                  </div>

                  {errorBebida && (
                    <p className="text-[10px] text-rose-500 font-medium">
                      {errorBebida.contadorActual?.message || errorBebida.bebidasDanadas?.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* MÉTODO DE PAGO */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-coffee-600" />
                Paso 2: Método de Pago *
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  watchedMetodoPago === "EFECTIVO"
                    ? "border-coffee-600 bg-coffee-50 dark:bg-coffee-950/40 text-coffee-900 dark:text-coffee-200 font-bold"
                    : "border-stone-200 dark:border-stone-800 text-stone-600 hover:border-stone-300"
                }`}
              >
                <input
                  type="radio"
                  value="EFECTIVO"
                  {...register("metodoPago")}
                  className="hidden"
                />
                <Banknote className="w-5 h-5 text-coffee-600" />
                <span className="text-xs">Efectivo</span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  watchedMetodoPago === "TRANSFERENCIA"
                    ? "border-coffee-600 bg-coffee-50 dark:bg-coffee-950/40 text-coffee-900 dark:text-coffee-200 font-bold"
                    : "border-stone-200 dark:border-stone-800 text-stone-600 hover:border-stone-300"
                }`}
              >
                <input
                  type="radio"
                  value="TRANSFERENCIA"
                  {...register("metodoPago")}
                  className="hidden"
                />
                <CreditCard className="w-5 h-5 text-coffee-600" />
                <span className="text-xs">Transferencia</span>
              </label>
            </div>
          </div>

          {/* PAD DE FIRMA TÁCTIL */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-coffee-600" />
                Paso 3: Firma del Cliente *
              </label>
              <span className="text-[10px] text-stone-500">Obligatorio</span>
            </div>
            <SignaturePad onSave={handleSignatureSave} initialValue={signatureDataUrl} />
          </div>

          {/* FOTO CONTADOR (OPCIONAL) */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-coffee-600" />
                Foto de Contador (Evidencia Opcional)
              </label>
              {counterPhotoPreview && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Adjunta
                </span>
              )}
            </div>

            {counterPhotoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-stone-300 dark:border-stone-700 aspect-video group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={counterPhotoPreview}
                  alt="Foto del contador"
                  className="w-full h-full object-cover"
                />
                <label className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/70 hover:bg-black text-white text-xs font-semibold rounded-lg cursor-pointer backdrop-blur-sm transition-all flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> Cambiar foto
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 cursor-pointer transition-colors group">
                <div className="p-2.5 bg-white dark:bg-stone-800 rounded-full shadow-sm text-coffee-600 group-hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200 mt-2">
                  Tomar foto del reloj / contador
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* OBSERVACIONES */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 shadow-sm">
            <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300 block mb-1">
              Observaciones de la visita (opcional):
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Limpieza general realizada, se ajustó molienda..."
              {...register("notas")}
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-2 text-xs text-stone-900 dark:text-white outline-none focus:border-coffee-600"
            />
          </div>

          {/* BARRA INFERIOR FIJA (STICKY BOTTOM ACTION BAR) */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 px-4 py-3 shadow-2xl max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-2 text-xs">
              <div>
                <span className="text-stone-500 block text-[10px]">Total a Cobrar</span>
                <span className="text-lg font-black text-coffee-800 dark:text-amber-400">
                  {formatCOP(calculations.totalFacturado)}
                </span>
              </div>

              <div className="text-right text-xs">
                <span className="text-stone-500 block text-[10px]">Tazas Netas</span>
                <span className="text-base font-bold text-stone-800 dark:text-stone-200">
                  {calculations.totalTazasNetas} tazas
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-coffee-800 hover:bg-coffee-900 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-coffee-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
                  <span>Registrando y generando recibo...</span>
                </>
              ) : (
                <>
                  <span>Registrar y Liquidar Visita</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
