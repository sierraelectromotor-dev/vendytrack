"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { TipoOrigenDestino } from "@prisma/client";

export interface TrasladoItem {
  id: string;
  origenTipo: "EFECTIVO" | "BANCO";
  cuentaOrigenId?: string | null;
  cuentaOrigenNombre?: string;
  destinoTipo: "EFECTIVO" | "BANCO";
  cuentaDestinoId?: string | null;
  cuentaDestinoNombre?: string;
  monto: number;
  fecha: string;
  concepto: string;
  referencia?: string | null;
  comprobanteUrl?: string | null;
  creadoPorNombre?: string | null;
}

/**
 * Obtiene los traslados de fondos de la empresa activa en el periodo especificado
 */
export async function obtenerTraslados(filtros?: { mes?: number; anio?: number }) {
  try {
    const currentUser = await requireAdmin();
    const hoy = new Date();
    const mes = filtros?.mes !== undefined ? filtros.mes : hoy.getMonth();
    const anio = filtros?.anio !== undefined ? filtros.anio : hoy.getFullYear();

    const inicioMes = new Date(anio, mes, 1, 0, 0, 0, 0);
    const finMes = new Date(anio, mes + 1, 0, 23, 59, 59, 999);

    const traslados = await prisma.trasladoFondos.findMany({
      where: {
        empresaId: currentUser.empresaId,
        fecha: {
          gte: inicioMes,
          lte: finMes,
        },
      },
      include: {
        cuentaOrigen: true,
        cuentaDestino: true,
        creadoPor: { select: { name: true } },
      },
      orderBy: { fecha: "desc" },
    });

    const data: TrasladoItem[] = traslados.map((t) => ({
      id: t.id,
      origenTipo: t.origenTipo,
      cuentaOrigenId: t.cuentaOrigenId,
      cuentaOrigenNombre:
        t.origenTipo === "EFECTIVO"
          ? "Caja General (Efectivo)"
          : t.cuentaOrigen
          ? `${t.cuentaOrigen.banco} (${t.cuentaOrigen.numeroCuenta})`
          : "Cuenta Bancaria",
      destinoTipo: t.destinoTipo,
      cuentaDestinoId: t.cuentaDestinoId,
      cuentaDestinoNombre:
        t.destinoTipo === "EFECTIVO"
          ? "Caja General (Efectivo)"
          : t.cuentaDestino
          ? `${t.cuentaDestino.banco} (${t.cuentaDestino.numeroCuenta})`
          : "Cuenta Bancaria",
      monto: Number(t.monto),
      fecha: t.fecha.toISOString(),
      concepto: t.concepto,
      referencia: t.referencia,
      comprobanteUrl: t.comprobanteUrl,
      creadoPorNombre: t.creadoPor?.name || "Administrador",
    }));

    return { success: true, data };
  } catch (error: any) {
    console.error("[obtenerTraslados] Error:", error);
    return { success: false, error: error.message || "Error al obtener traslados", data: [] };
  }
}

/**
 * Registra un traslado de fondos entre bancos o entre efectivo y banco
 */
export async function registrarTraslado(formData: FormData) {
  try {
    const currentUser = await requireAdmin();

    const origenTipo = formData.get("origenTipo")?.toString() as TipoOrigenDestino;
    const cuentaOrigenId = formData.get("cuentaOrigenId")?.toString() || null;
    const destinoTipo = formData.get("destinoTipo")?.toString() as TipoOrigenDestino;
    const cuentaDestinoId = formData.get("cuentaDestinoId")?.toString() || null;
    const montoRaw = formData.get("monto")?.toString();
    const fechaRaw = formData.get("fecha")?.toString();
    const concepto = formData.get("concepto")?.toString().trim();
    const referencia = formData.get("referencia")?.toString().trim() || null;

    if (!origenTipo || !destinoTipo || !montoRaw) {
      return { success: false, error: "Origen, destino y monto son obligatorios." };
    }

    if (origenTipo === "EFECTIVO" && destinoTipo === "EFECTIVO") {
      return { success: false, error: "El origen y destino no pueden ser ambos Efectivo." };
    }

    if (origenTipo === "BANCO" && !cuentaOrigenId) {
      return { success: false, error: "Debes seleccionar la cuenta bancaria de origen." };
    }

    if (destinoTipo === "BANCO" && !cuentaDestinoId) {
      return { success: false, error: "Debes seleccionar la cuenta bancaria de destino." };
    }

    if (origenTipo === "BANCO" && destinoTipo === "BANCO" && cuentaOrigenId === cuentaDestinoId) {
      return { success: false, error: "La cuenta de origen y destino deben ser diferentes." };
    }

    const monto = parseFloat(montoRaw);
    if (isNaN(monto) || monto <= 0) {
      return { success: false, error: "El monto debe ser un número positivo mayor a cero." };
    }

    const fecha = fechaRaw ? new Date(fechaRaw) : new Date();

    // Generar concepto por defecto si viene vacío
    let conceptoFinal = concepto;
    if (!conceptoFinal) {
      if (origenTipo === "EFECTIVO" && destinoTipo === "BANCO") {
        conceptoFinal = "Consignación de efectivo en cuenta bancaria";
      } else if (origenTipo === "BANCO" && destinoTipo === "EFECTIVO") {
        conceptoFinal = "Retiro bancario para caja general / efectivo";
      } else {
        conceptoFinal = "Transferencia interbancaria entre cuentas";
      }
    }

    // Transacción atómica que actualiza saldos bancarios y guarda el registro
    const nuevoTraslado = await prisma.$transaction(async (tx) => {
      // 1. Descontar saldo de la cuenta de origen si es banco
      if (origenTipo === "BANCO" && cuentaOrigenId) {
        await tx.cuentaBancaria.update({
          where: { id: cuentaOrigenId, empresaId: currentUser.empresaId },
          data: {
            saldoActual: { decrement: monto },
          },
        });
      }

      // 2. Aumentar saldo de la cuenta de destino si es banco
      if (destinoTipo === "BANCO" && cuentaDestinoId) {
        await tx.cuentaBancaria.update({
          where: { id: cuentaDestinoId, empresaId: currentUser.empresaId },
          data: {
            saldoActual: { increment: monto },
          },
        });
      }

      // 3. Crear el registro del traslado de fondos
      return await tx.trasladoFondos.create({
        data: {
          empresaId: currentUser.empresaId,
          origenTipo,
          cuentaOrigenId: origenTipo === "BANCO" ? cuentaOrigenId : null,
          destinoTipo,
          cuentaDestinoId: destinoTipo === "BANCO" ? cuentaDestinoId : null,
          monto,
          fecha,
          concepto: conceptoFinal,
          referencia,
          creadoPorId: currentUser.id,
        },
        include: {
          cuentaOrigen: true,
          cuentaDestino: true,
        },
      });
    });

    revalidatePath("/admin/contabilidad");
    return { success: true, data: nuevoTraslado };
  } catch (error: any) {
    console.error("[registrarTraslado] Error:", error);
    return { success: false, error: error.message || "Error al registrar el traslado de fondos" };
  }
}

/**
 * Elimina un traslado de fondos y reversa los saldos bancarios de forma segura
 */
export async function eliminarTraslado(id: string) {
  try {
    const currentUser = await requireAdmin();

    const traslado = await prisma.trasladoFondos.findUnique({
      where: { id },
    });

    if (!traslado) {
      return { success: false, error: "Traslado no encontrado" };
    }

    if (traslado.empresaId !== currentUser.empresaId) {
      return { success: false, error: "No tienes permisos para eliminar este traslado." };
    }

    const monto = Number(traslado.monto);

    await prisma.$transaction(async (tx) => {
      // 1. Reversar origen si era banco (devolver el saldo que salió)
      if (traslado.origenTipo === "BANCO" && traslado.cuentaOrigenId) {
        await tx.cuentaBancaria.update({
          where: { id: traslado.cuentaOrigenId },
          data: {
            saldoActual: { increment: monto },
          },
        });
      }

      // 2. Reversar destino si era banco (restar el saldo que había entrado)
      if (traslado.destinoTipo === "BANCO" && traslado.cuentaDestinoId) {
        await tx.cuentaBancaria.update({
          where: { id: traslado.cuentaDestinoId },
          data: {
            saldoActual: { decrement: monto },
          },
        });
      }

      // 3. Eliminar el traslado
      await tx.trasladoFondos.delete({
        where: { id },
      });
    });

    revalidatePath("/admin/contabilidad");
    return { success: true };
  } catch (error: any) {
    console.error("[eliminarTraslado] Error:", error);
    return { success: false, error: error.message || "Error al eliminar el traslado" };
  }
}
