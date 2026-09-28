"use server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function surtirMaquina(maquinaId: string, loteId: string, insumoId: string, cantidad: number) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.rol !== 'ADMIN') return { success: false, error: 'No autorizado' };

    await prisma.$transaction(async (tx) => {
      // 1. Get Principal Bodega
      const bodegaPrincipal = await tx.bodega.findFirst({ where: {
          empresaId: currentUser.empresaId,
        tipo: 'PRINCIPAL' } });
      if (!bodegaPrincipal) throw new Error("Bodega principal no encontrada");
      
      const maquina = await tx.maquina.findUnique({ where: { id: maquinaId } });
      if (!maquina) throw new Error("Mquina no encontrada");

      let bodegaMaquina = await tx.bodega.findUnique({ where: { maquinaId } });
      if (!bodegaMaquina) {
        bodegaMaquina = await tx.bodega.create({
          data: {
              empresaId: currentUser.empresaId,
            nombre: `Bodega Mq. ${maquina.codigoSerial}`,
            tipo: 'MAQUINA',
            maquinaId: maquina.id,
          }
        });
      }

      // 2. Restar de Principal
      const extPrin = await tx.existencia.findUnique({
        where: { bodegaId_loteId_insumoId: { bodegaId: bodegaPrincipal.id, loteId, insumoId } }
      });
      if (!extPrin || Number(extPrin.cantidad) < cantidad) {
        throw new Error("Stock insuficiente en bodega principal para este lote");
      }
      await tx.existencia.update({
        where: {
            empresaId: currentUser.empresaId,
            id: extPrin.id },
        data: { cantidad: { decrement: cantidad } }
      });

      // 3. Sumar a MÃ¡quina
      await tx.existencia.upsert({
        where: { bodegaId_loteId_insumoId: { bodegaId: bodegaMaquina.id, loteId, insumoId } },
        create: {
            empresaId: currentUser.empresaId,
            bodegaId: bodegaMaquina.id, loteId, insumoId, cantidad },
        update: { cantidad: { increment: cantidad } }
      });

      // 4. Registro Movimiento
      await tx.movimientoInventario.create({
        data: {
            empresaId: currentUser.empresaId,
            insumoId,
          tipo: 'TRASLADO_A_MAQUINA',
          cantidad,
          operadorId: currentUser.id,
          loteId,
          bodegaOrigenId: bodegaPrincipal.id,
          bodegaDestinoId: bodegaMaquina.id
        }
      });
    });
    revalidatePath('/admin/inventario');
    return { success: true };
  } catch(e: any) {
    return { success: false, error: e.message };
  }
}

export async function getMaquinas() {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('No autorizado');
  const maquinas = await prisma.maquina.findMany({
      where: { empresaId: currentUser.empresaId },
    select: { id: true, codigoSerial: true }
  });
  return maquinas;
}

export async function getLotesForInsumo(insumoId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("No auth");
  const bodegaPrincipal = await prisma.bodega.findFirst({ where: {
      empresaId: currentUser.empresaId,
    tipo: 'PRINCIPAL' } });
  if (!bodegaPrincipal) return [];

  const existencias = await prisma.existencia.findMany({
    where: {
        empresaId: currentUser.empresaId,
        bodegaId: bodegaPrincipal.id, insumoId },
    include: { lote: true }
  });

  return existencias;
}

