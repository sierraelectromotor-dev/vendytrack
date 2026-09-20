"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { TipoVisitaExtra, EstadoVisitaExtra, TipoMovimientoInventario } from "@prisma/client";

export interface VisitaExtraordinariaItem {
  id: string;
  consecutivo: number;
  tipo: TipoVisitaExtra;
  tipoLabel: string;
  estado: EstadoVisitaExtra;
  estadoLabel: string;
  prioridad: string;
  maquinaId: string;
  maquinaSerial: string;
  maquinaUbicacion: string;
  clienteId: string;
  clienteNombre: string;
  clienteSede: string;
  clienteDireccion: string;
  clienteWhatsapp: string;
  operadorId: string;
  operadorNombre: string;
  motivoReporte: string;
  notasAdmin?: string | null;
  solucionAplicada?: string | null;
  fotoEvidenciaUrl?: string | null;
  detallesReposicion?: any;
  fechaCreacion: string;
  fechaCompletada?: string | null;
}

const LABELS_TIPO: Record<string, string> = {
  FALLA_TECNICA: "Falla Técnica / Mantenimiento",
  REPOSICION_URGENTE: "Reposición Urgente de Insumos",
  SEGUNDA_LIQUIDACION: "Segunda Liquidación (Turno Extra)",
};

const LABELS_ESTADO: Record<string, string> = {
  PENDIENTE: "Pendiente de Atención",
  EN_CAMINO: "Operador en Camino",
  COMPLETADA: "Visita Resuelta",
  CANCELADA: "Cancelada",
};

export async function obtenerVisitasExtraordinarias(filtros?: {
  estado?: string;
  operadorId?: string;
  maquinaId?: string;
}): Promise<{ success: boolean; data: VisitaExtraordinariaItem[]; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, data: [], error: "No autenticado" };
    }

    const whereClause: any = {};

    if (filtros?.estado && filtros.estado !== "TODAS") {
      whereClause.estado = filtros.estado as EstadoVisitaExtra;
    }

    // Si el usuario es rutero, solo ve las visitas asignadas a él
    if (user.rol === "OPERADOR_RUTA") {
      whereClause.operadorId = user.id;
    } else if (filtros?.operadorId && filtros.operadorId !== "TODOS") {
      whereClause.operadorId = filtros.operadorId;
    }

    if (filtros?.maquinaId) {
      whereClause.maquinaId = filtros.maquinaId;
    }

    const visitas = await prisma.visitaExtraordinaria.findMany({
      where: whereClause,
      include: {
        maquina: true,
        cliente: true,
        operador: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: visitas.map((v) => ({
        id: v.id,
        consecutivo: v.consecutivo,
        tipo: v.tipo,
        tipoLabel: LABELS_TIPO[v.tipo] || v.tipo,
        estado: v.estado,
        estadoLabel: LABELS_ESTADO[v.estado] || v.estado,
        prioridad: v.prioridad,
        maquinaId: v.maquinaId,
        maquinaSerial: v.maquina.codigoSerial,
        maquinaUbicacion: v.maquina.ubicacion,
        clienteId: v.clienteId,
        clienteNombre: v.cliente.razonSocial,
        clienteSede: v.cliente.sede,
        clienteDireccion: v.cliente.direccion,
        clienteWhatsapp: v.cliente.whatsapp,
        operadorId: v.operadorId,
        operadorNombre: v.operador.name,
        motivoReporte: v.motivoReporte,
        notasAdmin: v.notasAdmin,
        solucionAplicada: v.solucionAplicada,
        fotoEvidenciaUrl: v.fotoEvidenciaUrl,
        detallesReposicion: v.detallesReposicion,
        fechaCreacion: v.createdAt.toISOString(),
        fechaCompletada: v.fechaCompletada?.toISOString() || null,
      })),
    };
  } catch (error: any) {
    if ((error as any)?.digest === "DYNAMIC_SERVER_USAGE") {
      throw error;
    }
    console.error("[obtenerVisitasExtraordinarias] Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

export async function crearVisitaExtraordinaria(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "No autenticado" };
  }

  try {
    const maquinaId = formData.get("maquinaId")?.toString();
    const operadorId = formData.get("operadorId")?.toString() || currentUser.id;
    const tipo = formData.get("tipo")?.toString() as TipoVisitaExtra;
    const prioridad = formData.get("prioridad")?.toString() || "ALTA";
    const motivoReporte = (formData.get("motivoReporte")?.toString() || "Visita extraordinaria registrada en campo").trim();
    const notasAdmin = formData.get("notasAdmin")?.toString()?.trim() || null;

    if (!maquinaId || !tipo) {
      return { success: false, error: "La máquina y el tipo de visita son requeridos" };
    }

    const maquina = await prisma.maquina.findUnique({
      where: { id: maquinaId },
      select: { clienteId: true },
    });

    if (!maquina || !maquina.clienteId) {
      return { success: false, error: "La máquina seleccionada no tiene un cliente asignado" };
    }

    const visita = await prisma.visitaExtraordinaria.create({
      data: {
        tipo,
        prioridad,
        maquinaId,
        clienteId: maquina.clienteId,
        operadorId,
        creadoPorId: currentUser.id,
        motivoReporte,
        notasAdmin,
        estado: EstadoVisitaExtra.PENDIENTE,
      },
    });

    revalidatePath("/admin/rutas");
    revalidatePath("/admin/clientes");
    revalidatePath("/");
    return { success: true, data: visita };
  } catch (error: any) {
    console.error("[crearVisitaExtraordinaria] Error:", error);
    return { success: false, error: error.message || "Error al crear la orden de visita" };
  }
}

export async function completarVisitaExtraordinaria(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "No autenticado" };
  }

  try {
    const id = formData.get("id")?.toString();
    const solucionAplicada = formData.get("solucionAplicada")?.toString().trim() || null;
    const fotoEvidenciaUrl = formData.get("fotoEvidenciaUrl")?.toString() || null;
    const detallesReposicionRaw = formData.get("detallesReposicion")?.toString();

    if (!id) {
      return { success: false, error: "ID de visita requerido" };
    }

    const visita = await prisma.visitaExtraordinaria.findUnique({
      where: { id },
      include: { maquina: true },
    });

    if (!visita) {
      return { success: false, error: "Visita no encontrada" };
    }

    let detallesReposicionParsed = null;

    // Si fue una reposición de insumos, procesamos y descargamos del inventario
    if (visita.tipo === TipoVisitaExtra.REPOSICION_URGENTE && detallesReposicionRaw) {
      try {
        detallesReposicionParsed = JSON.parse(detallesReposicionRaw);
        if (Array.isArray(detallesReposicionParsed)) {
          for (const item of detallesReposicionParsed) {
            const cantidadNum = parseFloat(item.cantidad);
            if (item.insumoId && !isNaN(cantidadNum) && cantidadNum > 0) {
              // 1. Crear movimiento de salida por reposición
              await prisma.movimientoInventario.create({
                data: {
                  insumoId: item.insumoId,
                  tipo: TipoMovimientoInventario.SALIDA_FISICA_REPOSICION,
                  cantidad: cantidadNum,
                  referencia: `Visita Extraordinaria #${visita.consecutivo} (${visita.maquina.codigoSerial})`,
                  operadorId: currentUser.id,
                },
              });

              // 2. Decrementar stock actual de bodega
              await prisma.insumo.update({
                where: { id: item.insumoId },
                data: {
                  stockActual: {
                    decrement: cantidadNum,
                  },
                },
              });
            }
          }
        }
      } catch (e) {
        console.error("Error al procesar detalles de reposición:", e);
      }
    }

    await prisma.visitaExtraordinaria.update({
      where: { id },
      data: {
        estado: EstadoVisitaExtra.COMPLETADA,
        solucionAplicada,
        fotoEvidenciaUrl,
        detallesReposicion: detallesReposicionParsed || undefined,
        fechaCompletada: new Date(),
      },
    });

    revalidatePath("/admin/rutas");
    revalidatePath("/admin/inventario");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("[completarVisitaExtraordinaria] Error:", error);
    return { success: false, error: error.message || "Error al completar la visita" };
  }
}

export async function cancelarVisitaExtraordinaria(id: string) {
  await requireAdmin();

  try {
    await prisma.visitaExtraordinaria.update({
      where: { id },
      data: {
        estado: EstadoVisitaExtra.CANCELADA,
      },
    });

    revalidatePath("/admin/rutas");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("[cancelarVisitaExtraordinaria] Error:", error);
    return { success: false, error: error.message || "Error al cancelar la visita" };
  }
}
