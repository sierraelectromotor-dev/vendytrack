"use server";

import prisma from "@/lib/prisma";
import { EstadoDespacho, TipoDespacho } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";

export async function createOrdenDespacho(data: {
  maquinaId?: string;
  clienteId: string;
  operadorId: string;
  tipo: TipoDespacho;
  detalles: {
    insumoId: string;
    loteId: string;
    cantidad: number;
  }[];
}) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("No autenticado");

    const nuevaOrden = await prisma.ordenDespacho.create({
      data: {
          empresaId: currentUser.empresaId,
        maquinaId: data.maquinaId!,
        clienteId: data.clienteId,
        operadorId: data.operadorId,
        creadoPorId: currentUser.id,
        tipo: data.tipo,
        estado: EstadoDespacho.CREADA,
        detalles: {
          create: data.detalles.map((d) => ({
              empresaId: currentUser.empresaId,
            insumoId: d.insumoId,
            loteId: d.loteId,
            cantidad: d.cantidad,
          })),
        },
      },
      include: {
        detalles: true,
      },
    });
    return { success: true, data: nuevaOrden };
  } catch (error) {
    console.error("Error creating OrdenDespacho:", error);
    return { success: false, error: "Error al crear la orden de despacho" };
  }
}

export async function updateEstadoDespacho(
  ordenId: string,
  estado: EstadoDespacho,
  firmaClienteBase64OrUrl?: string,
  pago?: { totalFacturado: number; montoAbonado: number; metodoPago: string }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("No auth");
  try {
    let finalFirmaUrl = firmaClienteBase64OrUrl;

    if (firmaClienteBase64OrUrl?.startsWith("data:image")) {
      const { uploadSignature } = await import("@/lib/blob");
      finalFirmaUrl = await uploadSignature(firmaClienteBase64OrUrl, `despacho-${ordenId}`);
    }

    if (estado === "ENTREGADA" && pago) {
      const { totalFacturado, montoAbonado, metodoPago } = pago;
      
      const orden = await prisma.ordenDespacho.findUnique({ 
        where: { id: ordenId },
        include: { detalles: true }
      });
      if (!orden) throw new Error("Orden no encontrada");

      const saldoPendiente = totalFacturado - montoAbonado;
      let estadoPago = "PENDIENTE";
      if (saldoPendiente <= 0 && totalFacturado > 0) estadoPago = "PAGADO_TOTAL";
      else if (montoAbonado > 0) estadoPago = "PAGADO_PARCIAL";

      const updatedOrden = await prisma.$transaction(async (tx) => {
        let cuentaCobrarId = null;

        if (totalFacturado > 0) {
          const nuevaCuenta = await tx.cuentaCobrar.create({
            data: {
                empresaId: currentUser.empresaId,
                clienteId: orden.clienteId,
              montoTotal: totalFacturado,
              saldoPendiente: saldoPendiente,
              estadoPago: estadoPago as any,
            }
          });
          cuentaCobrarId = nuevaCuenta.id;

          if (montoAbonado > 0) {
            await tx.abono.create({
              data: {
                  empresaId: currentUser.empresaId,
                cuentaCobrarId: cuentaCobrarId,
                monto: montoAbonado,
                metodoPago: metodoPago as any,
                registradoPorId: orden.operadorId,
              }
            });
          }
        }

        // --- MANEJO DE INVENTARIO ---
        let targetBodegaId: string | null = null;
        if (orden.tipo === "SURTIDO_MAQUINA" && orden.maquinaId) {
          const maquina = await tx.maquina.findUnique({ where: { id: orden.maquinaId }, include: { bodega: true }});
          targetBodegaId = maquina?.bodega?.id || null;
        }

        for (const det of orden.detalles) {
          // Descontar de bodega principal
          await tx.existencia.update({
            where: {
                empresaId: currentUser.empresaId,
                bodegaId_loteId_insumoId: {
                bodegaId: "bodega-principal",
                loteId: det.loteId,
                insumoId: det.insumoId,
              }
            },
            data: { cantidad: { decrement: det.cantidad } }
          });
          
          await tx.insumo.update({
            where: {
                empresaId: currentUser.empresaId,
                id: det.insumoId },
            data: { stockActual: { decrement: det.cantidad } }
          });

          // Registrar el movimiento
          await tx.movimientoInventario.create({
            data: {
                empresaId: currentUser.empresaId,
                insumoId: det.insumoId,
              tipo: orden.tipo === "SURTIDO_MAQUINA" ? "TRASLADO_A_MAQUINA" : "SALIDA_FISICA_REPOSICION",
              cantidad: det.cantidad,
              loteId: det.loteId,
              bodegaOrigenId: "bodega-principal",
              bodegaDestinoId: targetBodegaId,
              operadorId: orden.operadorId,
              referencia: "ORD-" + orden.id.substring(0, 6).toUpperCase()
            }
          });
          
          // Si es surtido de máquina, sumar a la bodega destino
          if (targetBodegaId) {
             await tx.existencia.upsert({
               where: { bodegaId_loteId_insumoId: { bodegaId: targetBodegaId, loteId: det.loteId, insumoId: det.insumoId }},
               create: {
                   empresaId: currentUser.empresaId,
                bodegaId: targetBodegaId, loteId: det.loteId, insumoId: det.insumoId, cantidad: det.cantidad },
               update: { cantidad: { increment: det.cantidad } }
             });
          }
        }
        // --- FIN MANEJO DE INVENTARIO ---

        return tx.ordenDespacho.update({
          where: {
              empresaId: currentUser.empresaId,
            id: ordenId },
          data: {
            estado,
            ...(finalFirmaUrl ? { firmaClienteUrl: finalFirmaUrl } : {}),
            fechaEntrega: new Date(),
            totalFacturado,
            estadoPago: estadoPago as any,
            ...(cuentaCobrarId ? { cuentaCobrarId } : {}),
          },
        });
      });
      return { success: true, data: updatedOrden };
    }

    const orden = await prisma.ordenDespacho.update({
      where: {
          empresaId: currentUser.empresaId,
        id: ordenId },
      data: {
        estado,
        ...(finalFirmaUrl ? { firmaClienteUrl: finalFirmaUrl } : {}),
        ...(estado === EstadoDespacho.ENTREGADA ? { fechaEntrega: new Date() } : {}),
      },
    });
    return { success: true, data: orden };
  } catch (error) {
    console.error("Error updating OrdenDespacho:", error);
    return { success: false, error: "Error al actualizar el estado de la orden" };
  }
}

