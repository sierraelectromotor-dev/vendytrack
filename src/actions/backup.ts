"use server";

import prisma from "@/lib/prisma";
import { requireSuperadmin } from "./superadmin";
import { revalidatePath } from "next/cache";

export async function generarBackupJson() {
  await requireSuperadmin();
  
  try {
    const data = {
      empresas: await prisma.empresa.findMany(),
      users: await prisma.user.findMany(),
      clientes: await prisma.cliente.findMany(),
      maquinas: await prisma.maquina.findMany(),
      rutas: await prisma.ruta.findMany(),
      preciosMaquina: await prisma.precioMaquina.findMany(),
      liquidaciones: await prisma.liquidacion.findMany(),
      detallesLiquidacion: await prisma.detalleLiquidacion.findMany(),
      insumos: await prisma.insumo.findMany(),
      lotes: await prisma.lote.findMany(),
      bodegas: await prisma.bodega.findMany(),
      existencias: await prisma.existencia.findMany(),
      movimientos: await prisma.movimientoInventario.findMany(),
      visitas: await prisma.visitaExtraordinaria.findMany(),
      despachos: await prisma.ordenDespacho.findMany(),
      detallesDespacho: await prisma.detalleDespacho.findMany(),
      cuentasCobrar: await prisma.cuentaCobrar.findMany(),
      abonos: await prisma.abono.findMany(),
      transacciones: await prisma.transaccionContable.findMany(),
      gastosFijos: await prisma.gastoFijo.findMany(),
      formulas: await prisma.formula.findMany(),
      ingredientes: await prisma.ingredienteFormula.findMany(),
      producciones: await prisma.produccion.findMany(),
      detallesProduccion: await prisma.detalleProduccion.findMany(),
      configBebidas: await prisma.configBebidaMaquina.findMany(),
      cuentasBancarias: await prisma.cuentaBancaria.findMany(),
    };

    return { success: true, data: JSON.stringify(data) };
  } catch(e: any) {
    return { success: false, error: e.message };
  }
}
