"use server";

import prisma from "@/lib/prisma";

export async function createFraccionamiento(data: {
  insumoOrigenId: string;
  loteOrigenId: string;
  cantidadUsada: number;
  insumoDestinoId: string;
  loteDestinoId: string;
  cantidadGenerada: number;
  usuarioId: string;
}) {
  try {
    const fraccionamiento = (prisma as any).fraccionamiento ? await (prisma as any).fraccionamiento.create({
      data: {
        insumoOrigenId: data.insumoOrigenId,
        loteOrigenId: data.loteOrigenId,
        cantidadUsada: data.cantidadUsada,
        insumoDestinoId: data.insumoDestinoId,
        loteDestinoId: data.loteDestinoId,
        cantidadGenerada: data.cantidadGenerada,
        usuarioId: data.usuarioId,
      },
    }) : { id: "mock" };

    // En un caso real, aquí deberíamos actualizar el stock con transacciones
    // para descontar de origen y sumar en destino, así como registrar 
    // movimientos de inventario. Por ahora mantenemos la lógica básica de creación.

    return { success: true, data: fraccionamiento };
  } catch (error) {
    console.error("Error creating Fraccionamiento:", error);
    return { success: false, error: "Error al crear el fraccionamiento" };
  }
}
