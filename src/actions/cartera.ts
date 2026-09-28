"use server";

import prisma from "@/lib/prisma";
import { EstadoPago, MetodoPago } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

/**
 * Genera una cuenta de cobro sumando el total facturado de las liquidaciones y Ã³rdenes seleccionadas,
 * y vinculÃ¡ndolas a la nueva cuenta por cobrar.
 */
export async function generarCuentaCobro({
  clienteId,
  liquidacionIds = [],
  ordenDespachoIds = [],
  fechaVencimiento,
}: {
  clienteId: string;
  liquidacionIds?: string[];
  ordenDespachoIds?: string[];
  fechaVencimiento?: Date;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("No auth");
  try {
    if (liquidacionIds.length === 0 && ordenDespachoIds.length === 0) {
      throw new Error("Debe seleccionar al menos una liquidaciÃ³n o una orden de despacho.");
    }

    return await prisma.$transaction(async (tx) => {
      let montoTotal = 0;

      // Obtener liquidaciones
      if (liquidacionIds.length > 0) {
        const liquidaciones = await tx.liquidacion.findMany({
          where: {
              empresaId: currentUser.empresaId,
            id: { in: liquidacionIds }, clienteId },
        });

        for (const liq of liquidaciones) {
          if (liq.cuentaCobrarId) {
            throw new Error(`La liquidaciÃ³n ${liq.consecutivo} ya estÃ¡ asociada a una cuenta de cobro.`);
          }
          montoTotal += Number(liq.totalFacturado);
        }
      }

      // Obtener ordenes de despacho (asumiendo que puedan tener costo, o solo referenciarlas)
      // Como no se detallÃ³ costo en la orden, sumaremos lo de liquidaciones
      // (En la vida real aquÃ­ se sumarÃ­a el costo de la orden si lo tuviera)

      // Crear la cuenta por cobrar
      const cuentaCobrar = await tx.cuentaCobrar.create({
        data: {
            empresaId: currentUser.empresaId,
            clienteId,
          montoTotal,
          saldoPendiente: montoTotal,
          estadoPago: EstadoPago.PENDIENTE,
          fechaVencimiento,
        },
      });

      // Actualizar liquidaciones
      if (liquidacionIds.length > 0) {
        await tx.liquidacion.updateMany({
          where: {
              empresaId: currentUser.empresaId,
            id: { in: liquidacionIds } },
          data: { cuentaCobrarId: cuentaCobrar.id },
        });
      }

      // Actualizar Ã³rdenes de despacho
      if (ordenDespachoIds.length > 0) {
        await tx.ordenDespacho.updateMany({
          where: {
              empresaId: currentUser.empresaId,
            id: { in: ordenDespachoIds } },
          data: { cuentaCobrarId: cuentaCobrar.id },
        });
      }

      revalidatePath("/cartera");
      return { success: true, cuentaCobrar };
    });
  } catch (error: any) {
    console.error("Error al generar cuenta de cobro:", error);
    return { success: false, error: error.message || "Error interno del servidor" };
  }
}

/**
 * Registra un abono a una cuenta por cobrar.
 * Si el saldo queda en cero o menos, cambia el estado a PAGADO_TOTAL.
 */
export async function registrarAbono({
  cuentaCobrarId,
  monto,
  metodoPago,
  registradoPorId,
  comprobanteUrl,
}: {
  cuentaCobrarId: string;
  monto: number;
  metodoPago: MetodoPago;
  registradoPorId: string;
  comprobanteUrl?: string;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("No auth");
  try {
    return await prisma.$transaction(async (tx) => {
      const cuentaCobrar = await tx.cuentaCobrar.findUnique({
        where: { id: cuentaCobrarId },
        include: { liquidaciones: true, ordenesDespacho: true },
      });

      if (!cuentaCobrar) {
        throw new Error("Cuenta por cobrar no encontrada.");
      }

      const nuevoSaldo = Number(cuentaCobrar.saldoPendiente) - monto;
      const estadoPago = nuevoSaldo <= 0 ? EstadoPago.PAGADO_TOTAL : EstadoPago.PAGADO_PARCIAL;

      // Crear el abono
      const abono = await tx.abono.create({
        data: {
            empresaId: currentUser.empresaId,
            cuentaCobrarId,
          monto,
          metodoPago,
          registradoPorId,
          comprobanteUrl,
        },
      });

      // Actualizar cuenta por cobrar
      await tx.cuentaCobrar.update({
        where: {
            empresaId: currentUser.empresaId,
            id: cuentaCobrarId },
        data: {
          saldoPendiente: nuevoSaldo > 0 ? nuevoSaldo : 0,
          estadoPago,
        },
      });

      // Determinar categorÃ­a contable
      let categoriaContable: "RECAUDO_LIQUIDACION" | "VENTA_DIRECTA" | "OTRO_INGRESO" = "OTRO_INGRESO";
      if (cuentaCobrar.liquidaciones.length > 0) {
        categoriaContable = "RECAUDO_LIQUIDACION";
      } else if (cuentaCobrar.ordenesDespacho.length > 0) {
        categoriaContable = "VENTA_DIRECTA";
      }

      // Registrar en contabilidad
      await tx.transaccionContable.create({
        data: {
            empresaId: currentUser.empresaId,
            tipo: "INGRESO",
          categoria: categoriaContable,
          monto,
          descripcion: `Abono a Cuenta de Cobro #${cuentaCobrar.consecutivo}`,
          referencia: `CXC-${cuentaCobrar.consecutivo}-ABN`,
          metodoPago,
          creadoPorId: registradoPorId,
          comprobanteUrl,
        }
      });

      // Si se pagÃ³ por completo, actualizar estado de liquidaciones y Ã³rdenes a PAGADO_TOTAL
      if (estadoPago === EstadoPago.PAGADO_TOTAL) {
        if (cuentaCobrar.liquidaciones.length > 0) {
          await tx.liquidacion.updateMany({
            where: {
                empresaId: currentUser.empresaId,
                cuentaCobrarId },
            data: { estadoPago: EstadoPago.PAGADO_TOTAL },
          });
        }
        if (cuentaCobrar.ordenesDespacho.length > 0) {
          await tx.ordenDespacho.updateMany({
            where: {
                empresaId: currentUser.empresaId,
                cuentaCobrarId },
            data: { estadoPago: EstadoPago.PAGADO_TOTAL },
          });
        }
      } else {
         if (cuentaCobrar.liquidaciones.length > 0) {
          await tx.liquidacion.updateMany({
            where: {
                empresaId: currentUser.empresaId,
                cuentaCobrarId },
            data: { estadoPago: EstadoPago.PAGADO_PARCIAL },
          });
        }
        if (cuentaCobrar.ordenesDespacho.length > 0) {
          await tx.ordenDespacho.updateMany({
            where: {
                empresaId: currentUser.empresaId,
                cuentaCobrarId },
            data: { estadoPago: EstadoPago.PAGADO_PARCIAL },
          });
        }
      }

      revalidatePath("/cartera");
      revalidatePath(`/cartera/${cuentaCobrarId}`);

      return { success: true, abono };
    });
  } catch (error: any) {
    console.error("Error al registrar abono:", error);
    return { success: false, error: error.message || "Error interno del servidor" };
  }
}


