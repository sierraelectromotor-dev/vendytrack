"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type TareaUnificada = {
  id: string;
  tipo: "DESPACHO" | "LIQUIDACION";
  titulo: string;
  subtitulo: string;
  url: string;
};

export async function getTareasUnificadas(simulatedOperadorId?: string): Promise<TareaUnificada[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.rol !== "OPERADOR_RUTA" && currentUser.rol !== "ADMIN")) {
    return [];
  }

  const targetUserId = (currentUser.rol === "ADMIN" && simulatedOperadorId) ? simulatedOperadorId : currentUser.id;
  
  console.log("getTareasUnificadas triggered!", { userId: currentUser.id, rol: currentUser.rol, simulatedOperadorId, targetUserId });

  const tareas: TareaUnificada[] = [];

  // Fetch Despachos pendientes
  const despachos = await prisma.ordenDespacho.findMany({
    where: {
        empresaId: currentUser.empresaId,
        operadorId: targetUserId,
      estado: {
        not: "ENTREGADA",
      },
    },
    include: {
      cliente: true,
      maquina: true,
    },
  });

  console.log("Found despachos:", despachos.length);

  for (const despacho of despachos) {
    tareas.push({
      id: despacho.id,
      tipo: "DESPACHO",
      titulo: `Despacho: ${despacho.cliente?.razonSocial || 'Sin Cliente'}`,
      subtitulo: despacho.maquina ? despacho.maquina.ubicacion : "Venta Directa",
      url: `/rutero/despachos/${despacho.id}`,
    });
  }

  // Fetch Maquinas para liquidar (assigned to this rutero)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const maquinas = await prisma.maquina.findMany({
    where: {
        empresaId: currentUser.empresaId,
        activa: true,
      ruta: {
        operadorId: targetUserId,
      },
      liquidaciones: {
        none: {
          fecha: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      },
    },
    include: {
      cliente: true,
    },
  });

  for (const maquina of maquinas) {
    if (maquina.cliente) {
      tareas.push({
        id: maquina.id,
        tipo: "LIQUIDACION",
        titulo: `Liquidar: ${maquina.cliente.razonSocial}`,
        subtitulo: maquina.ubicacion,
        url: `/rutero/liquidaciones/nueva?maquinaId=${maquina.id}`,
      });
    }
  }

  return tareas;
}

export async function getResumenDia() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { totalEfectivo: 0, totalTransferencias: 0 };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const abonos = await prisma.abono.findMany({
    where: {
        empresaId: currentUser.empresaId,
        registradoPorId: currentUser.id,
      fecha: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  let totalEfectivo = 0;
  let totalTransferencias = 0;

  for (const abono of abonos) {
    if (abono.metodoPago === "EFECTIVO") {
      totalEfectivo += Number(abono.monto);
    } else if (abono.metodoPago === "TRANSFERENCIA") {
      totalTransferencias += Number(abono.monto);
    }
  }

  return { totalEfectivo, totalTransferencias };
}

export async function cerrarTurno(
  totalEfectivo: number,
  totalTransferencias: number,
  observaciones: string,
  firmaBase64: string
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("No autenticado");
  }

  const conciliacion = await prisma.conciliacionTurno.create({
    data: {
        empresaId: currentUser.empresaId,
        operadorId: currentUser.id,
      totalEfectivo,
      totalTransferencias,
      observaciones,
      firmaAdminUrl: firmaBase64,
    },
  });

  revalidatePath("/rutero");
  revalidatePath("/rutero/conciliacion");

  return { success: true, conciliacionId: conciliacion.id };
}
