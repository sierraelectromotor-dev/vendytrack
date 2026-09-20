"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  liquidacionFormSchema,
  LiquidacionFormData,
  BEBIDAS_CATALOGO,
  TipoBebidaEnum,
} from "@/types/liquidacion";
import { registrarLiquidacion, obtenerDatosMaquina } from "@/actions/liquidacion";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { formatCOP } from "@/lib/utils";
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
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

interface MobileLiquidacionFormProps {
  initialMaquinaId?: string;
}

export const MobileLiquidacionForm: React.FC<MobileLiquidacionFormProps> = ({
  initialMaquinaId = "maq-demo-01",
}) => {
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    consecutivo?: number | string;
    totalFacturado?: number;
    totalTazasNetas?: number;
    pdfUrl?: string;
    whatsappLink?: string;
    error?: string;
  } | null>(null);

  const [clienteInfo, setClienteInfo] = useState<{
    razonSocial: string;
    sede: string;
    direccion: string;
    contacto: string;
    whatsapp: string;
  }>({
    razonSocial: "Hospital Universitario San José",
    sede: "Sede Centro",
    direccion: "Calle 10 # 5-22",
    contacto: "Dra. Claudia Pérez",
    whatsapp: "+573005559876",
  });

  const [maquinaInfo, setMaquinaInfo] = useState<{
    codigoSerial: string;
    modelo: string;
    ubicacion: string;
  }>({
    codigoSerial: "MAQ-COL-2024-089",
    modelo: "Bianchi Soluble 4 Tolvas",
    ubicacion: "Cafetería Principal Piso 2",
  });

  const [counterPhotoPreview, setCounterPhotoPreview] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LiquidacionFormData>({
    resolver: zodResolver(liquidacionFormSchema),
    defaultValues: {
      clienteId: "cli-demo-01",
      maquinaId: initialMaquinaId,
      metodoPago: "EFECTIVO",
      detalles: BEBIDAS_CATALOGO.map((b) => ({
        bebida: b.id,
        contadorAnterior: 0,
        contadorActual: 0,
        bebidasDanadas: 0,
        precioUnitario: 2500,
      })),
      fotoContadorBase64: "",
      firmaClienteBase64: "",
      notas: "",
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "detalles",
  });

  // Cargar contadores anteriores y precios al montar el componente
  useEffect(() => {
    async function loadData() {
      setLoadingInitial(true);
      const res = await obtenerDatosMaquina(initialMaquinaId);
      if (res.success && res.data) {
        setClienteInfo(res.data.cliente);
        setMaquinaInfo({
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
  }, [initialMaquinaId, reset]);

  // Observar valores en tiempo real para cálculos reactivos
  const watchedDetalles = watch("detalles");
  const watchedMetodoPago = watch("metodoPago");

  // Cálculos reactivos instantáneos
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
      const ca = Number(item.contadorActual) || 0;
      const cf = Number(item.contadorAnterior) || 0;
      const bd = Number(item.bebidasDanadas) || 0;
      const precio = Number(item.precioUnitario) || 0;

      const subtotalContador = Math.max(0, ca - cf);
      const tazasNetas = Math.max(0, subtotalContador - bd);
      const valorLinea = tazasNetas * precio;

      totalTazasNetas += tazasNetas;
      totalFacturado += valorLinea;

      return {
        bebida: item.bebida,
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
    setSubmitResult(null);

    const result = await registrarLiquidacion(data);

    setIsSubmitting(false);
    if (result.success && result.data) {
      setSubmitResult({
        success: true,
        consecutivo: result.data.consecutivo,
        totalFacturado: result.data.totalFacturado,
        totalTazasNetas: result.data.totalTazasNetas,
        pdfUrl: result.data.pdfUrl,
        whatsappLink: result.data.whatsappLink,
      });
    } else {
      setSubmitResult({
        success: false,
        error: result.error || "Ocurrió un error al procesar la liquidación",
      });
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 text-coffee-600 animate-spin" />
        <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
          Cargando contadores anteriores y tarifas...
        </p>
      </div>
    );
  }

  // Pantalla de Éxito / Resumen con Botón de WhatsApp
  if (submitResult?.success) {
    const consecutivoStr = typeof submitResult.consecutivo === "number"
      ? `LIQ-${submitResult.consecutivo.toString().padStart(4, "0")}`
      : submitResult.consecutivo;

    return (
      <div className="w-full max-w-lg mx-auto p-4 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white dark:bg-stone-900 border border-emerald-500/30 rounded-2xl p-6 shadow-mobile text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-600">
              Liquidación Registrada
            </span>
            <h2 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
              {consecutivoStr}
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              {clienteInfo.razonSocial} • {maquinaInfo.codigoSerial}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-stone-50 dark:bg-stone-800/60 p-4 rounded-xl text-left text-xs">
            <div>
              <span className="text-stone-500 block">Tazas Netas</span>
              <span className="text-lg font-bold text-stone-900 dark:text-white">
                {submitResult.totalTazasNetas}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block">Total Facturado</span>
              <span className="text-lg font-black text-coffee-700 dark:text-amber-400">
                {formatCOP(submitResult.totalFacturado || 0)}
              </span>
            </div>
          </div>

          {/* Botones de acción directa: WhatsApp y PDF */}
          <div className="space-y-3 pt-2">
            {submitResult.whatsappLink && (
              <a
                href={submitResult.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98]"
              >
                <Send className="w-5 h-5" />
                Enviar Comprobante por WhatsApp
              </a>
            )}

            {submitResult.pdfUrl && (
              <a
                href={submitResult.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold rounded-xl text-sm transition-all"
              >
                <FileText className="w-4 h-4 text-coffee-600" />
                Ver / Descargar Recibo Oficial (PDF)
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setSubmitResult(null);
                reset();
                setCounterPhotoPreview(null);
                setSignatureDataUrl("");
              }}
              className="w-full py-2.5 text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
            >
              Nueva Liquidación de Ruta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-lg mx-auto pb-28 space-y-5 px-3 sm:px-4"
    >
      {/* Encabezado Mobile de la Visita */}
      <div className="bg-gradient-to-br from-coffee-800 to-coffee-950 text-white rounded-2xl p-4 shadow-mobile space-y-3 border border-coffee-700/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <Coffee className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">VendyTrack Móvil</h1>
              <span className="text-[11px] text-amber-200/80">Liquidación en Campo</span>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-coffee-950 rounded-full">
            Ruta Activa
          </span>
        </div>

        <div className="bg-black/25 rounded-xl p-3 space-y-1.5 text-xs backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-white font-semibold">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{clienteInfo.razonSocial}</span>
          </div>
          <p className="text-stone-300 text-[11px] pl-5">
            {clienteInfo.sede} • {clienteInfo.direccion}
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px] text-amber-200">
            <span>Máquina: <strong>{maquinaInfo.codigoSerial}</strong></span>
            <span>{maquinaInfo.ubicacion}</span>
          </div>
        </div>
      </div>

      {/* Alerta de errores de validación generales */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Corrija los siguientes campos antes de continuar:</p>
            <ul className="list-disc list-inside text-[11px] text-rose-700 dark:text-rose-300 space-y-0.5">
              {errors.firmaClienteBase64 && <li>Firma del cliente requerida</li>}
              {errors.detalles && <li>Verifique los contadores ingresados</li>}
            </ul>
          </div>
        </div>
      )}

      {/* SECCIÓN: Ingreso de Contadores por Bebida */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-coffee-600" />
            Lectura de Contadores ({fields.length} Bebidas)
          </h2>
          <span className="text-[11px] text-stone-500">C.F = Contador Anterior</span>
        </div>

        <div className="space-y-3">
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
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 shadow-sm space-y-2.5 transition-all"
              >
                {/* Cabecera de la bebida */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base" role="img" aria-label="bebida">
                      {bebidaCatalogo?.icono}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-stone-900 dark:text-white leading-tight">
                        {bebidaCatalogo?.nombre}
                      </h3>
                      <span className="text-[10px] text-stone-500">
                        Tarifa: {formatCOP(field.precioUnitario)}
                      </span>
                    </div>
                  </div>

                  {/* Valor acumulado en vivo para esta bebida */}
                  <div className="text-right">
                    <span className="text-xs font-black text-coffee-700 dark:text-coffee-300">
                      {formatCOP(calc.valorLinea)}
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      {calc.tazasNetas} tazas netas
                    </span>
                  </div>
                </div>

                {/* Grilla de Entradas: C.F (fijo), C.A (editable), B.D (editable) */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Contador Anterior (C.F) */}
                  <div className="bg-stone-50 dark:bg-stone-800/70 p-2 rounded-lg border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] font-semibold text-stone-500 uppercase block">
                      C. Anterior (C.F)
                    </span>
                    <input
                      type="number"
                      readOnly
                      {...register(`detalles.${index}.contadorAnterior`, {
                        valueAsNumber: true,
                      })}
                      className="w-full bg-transparent font-bold text-xs text-stone-700 dark:text-stone-300 outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Contador Actual (C.A) */}
                  <div className="bg-white dark:bg-stone-900 p-2 rounded-lg border-2 border-coffee-400/80 focus-within:border-coffee-600 transition-colors">
                    <span className="text-[10px] font-bold text-coffee-700 dark:text-coffee-300 uppercase block">
                      C. Actual (C.A) *
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={field.contadorAnterior}
                      placeholder="0"
                      {...register(`detalles.${index}.contadorActual`, {
                        valueAsNumber: true,
                      })}
                      className="w-full bg-transparent font-black text-sm text-stone-900 dark:text-white outline-none"
                    />
                  </div>

                  {/* Bebidas Dañadas / Purgas (B.D) */}
                  <div className="bg-stone-50 dark:bg-stone-800/70 p-2 rounded-lg border border-stone-200 dark:border-stone-700 focus-within:border-stone-400">
                    <span className="text-[10px] font-semibold text-stone-500 uppercase block">
                      Dañadas (B.D)
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="0"
                      {...register(`detalles.${index}.bebidasDanadas`, {
                        valueAsNumber: true,
                      })}
                      className="w-full bg-transparent font-bold text-xs text-stone-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                {/* Resumen de cálculo reactivo para la fila */}
                <div className="flex items-center justify-between text-[10px] bg-stone-50 dark:bg-stone-800/40 px-2.5 py-1 rounded-md text-stone-500">
                  <span>
                    Subtotal: <strong>{calc.subtotalContador}</strong> (C.A - C.F)
                  </span>
                  <span>-</span>
                  <span>
                    Dañadas: <strong>{watchedDetalles?.[index]?.bebidasDanadas || 0}</strong>
                  </span>
                  <span>=</span>
                  <span className="text-stone-800 dark:text-stone-200 font-bold">
                    Netas: {calc.tazasNetas}
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
      </div>

      {/* SECCIÓN: Evidencia Fotográfica (Foto del Contador) */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-stone-700 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-coffee-600" />
            Foto de los Contadores de la Máquina (Opcional)
          </label>
          {counterPhotoPreview && (
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cargada
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
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 cursor-pointer transition-colors group">
            <div className="p-3 bg-white dark:bg-stone-800 rounded-full shadow-sm text-coffee-600 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 mt-2">
              Tomar foto con la cámara
            </span>
            <span className="text-[10px] text-stone-500">
              Se almacenará directamente en Vercel Blob
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

      {/* SECCIÓN: Método de Pago */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-sm space-y-3">
        <label className="text-xs font-bold text-stone-700 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
          <Banknote className="w-3.5 h-3.5 text-coffee-600" />
          Método de Pago *
        </label>

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
            <Banknote className="w-4 h-4 text-coffee-600" />
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
            <CreditCard className="w-4 h-4 text-coffee-600" />
            <span className="text-xs">Transferencia</span>
          </label>
        </div>
      </div>

      {/* SECCIÓN: Pad de Firma Táctil */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-sm space-y-2">
        <SignaturePad
          onSave={handleSignatureSave}
          initialValue={signatureDataUrl}
        />
      </div>

      {/* SECCIÓN: Notas u Observaciones */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 shadow-sm">
        <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300 block mb-1">
          Observaciones de la visita (opcional):
        </label>
        <textarea
          rows={2}
          placeholder="Ej. Se realizó limpieza de tolvas y calibración de molino..."
          {...register("notas")}
          className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-2 text-xs text-stone-900 dark:text-white outline-none focus:border-coffee-600"
        />
      </div>

      {/* BARRA INFERIOR FIJA (STICKY): Totales Consolidados y Botón de Envío */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 px-4 py-3 shadow-2xl max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2 text-xs">
          <div>
            <span className="text-stone-500 block text-[10px]">Total Facturado</span>
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
              <span>Procesando y generando recibo...</span>
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
  );
};
