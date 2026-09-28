"use server";

import prisma from "@/lib/prisma";
import { requireAdmin, verifyPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const SYSTEM_RESET_ENABLED = process.env.ENABLE_SYSTEM_RESET === 'true';

export async function reiniciarSistemaTotal(formData: FormData) {
  if (!SYSTEM_RESET_ENABLED) {
    return {
      success: false,
      error: 'El reinicio del sistema está deshabilitado. Configure ENABLE_SYSTEM_RESET=true para habilitarlo.',
    };
  }

  const currentUser = await requireAdmin();
  const user = currentUser;

  const fraseConfirmacion = formData.get("fraseConfirmacion")?.toString()?.trim() || "";
  const password = formData.get("password")?.toString() || "";

  if (fraseConfirmacion !== "REINICIAR SISTEMA") {
    return {
      success: false,
      error: "La frase de confirmación no coincide. Debes escribir exactamente: REINICIAR SISTEMA",
    };
  }

  if (!password) {
    return {
      success: false,
      error: "Debes ingresar tu contraseña de administrador para autorizar el reinicio.",
    };
  }

  // Buscar el usuario admin en la base de datos para obtener su passwordHash actual
  const adminDb = await prisma.user.findUnique({
    where: { id: currentUser.id },
  });

  if (!adminDb || !adminDb.passwordHash) {
    return {
      success: false,
      error: "No se pudo verificar el usuario administrador.",
    };
  }

  const passwordValida = verifyPassword(password, adminDb.passwordHash);
  if (!passwordValida) {
    return {
      success: false,
      error: "Contraseña de administrador incorrecta. Operación cancelada.",
    };
  }

  try {
    // Ejecutar transacción de reseteo total en orden de dependencias referenciales
    await prisma.$transaction(async (tx) => {
      // 1. Nivel de Hojas (Detalles y movimientos)
      await tx.abono.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.detalleDespacho.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.detalleProduccion.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.detalleLiquidacion.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.movimientoInventario.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.existencia.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.ingredienteFormula.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });

      // 2. Transacciones y documentos intermedios
      await tx.transaccionContable.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.ordenDespacho.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.produccion.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.cuentaCobrar.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.liquidacion.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.visitaExtraordinaria.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.conciliacionTurno.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });

      // 3. Configuraciones, fórmulas, lotes y gastos
      await tx.lote.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.formula.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.recetaInsumo.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.configBebidaMaquina.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.precioMaquina.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.gastoFijo.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });

      // 4. Entidades Base (deben borrarse en orden)
      await tx.maquina.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.bodega.deleteMany({
        where: {
            empresaId: currentUser.empresaId,
            id: { not: "bodega-principal" } }
      });
      await tx.insumo.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.ruta.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });
      await tx.cliente.deleteMany({
          where: { empresaId: currentUser.empresaId }
    });

      // 5. Usuarios operativos (manteniendo ADMIN)
      await tx.user.deleteMany({
        where: { rol: { not: "ADMIN" } },
      });

      // 8. Restaurar la Bodega Principal a los valores por defecto si existe
      await tx.bodega.upsert({
        where: { id: "bodega-principal" },
        update: {
          nombre: "Bodega Central VendyTrack",
          tipo: "PRINCIPAL",
        },
        create: {
            empresaId: currentUser.empresaId,
            id: "bodega-principal",
          nombre: "Bodega Central VendyTrack",
          tipo: "PRINCIPAL",
        },
      });
    });

    // Revalidar todas las rutas del sistema
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/clientes");
    revalidatePath("/admin/inventario");
    revalidatePath("/admin/rutas");
    revalidatePath("/admin/contabilidad");
    revalidatePath("/admin/ruteros");
    revalidatePath("/admin/precios");

    return { success: true };
  } catch (error: any) {
    console.error("[reiniciarSistemaTotal] Error:", error);
    return {
      success: false,
      error: error.message || "Ocurrió un error al reiniciar la base de datos.",
    };
  }
}
