"use server";

import prisma from "@/lib/prisma";
import { requireAdmin, verifyPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function reiniciarSistemaTotal(formData: FormData) {
  const currentUser = await requireAdmin();

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
      // 1. Borrar detalles y liquidaciones
      await tx.detalleLiquidacion.deleteMany({});
      await tx.movimientoInventario.deleteMany({});
      await tx.visitaExtraordinaria.deleteMany({});
      await tx.liquidacion.deleteMany({});

      // 2. Borrar transacciones contables y gastos fijos
      await tx.transaccionContable.deleteMany({});
      await tx.gastoFijo.deleteMany({});

      // 3. Borrar configuraciones de máquinas y precios
      await tx.configBebidaMaquina.deleteMany({});
      await tx.precioMaquina.deleteMany({});
      await tx.maquina.deleteMany({});

      // 4. Borrar recetas e insumos
      await tx.recetaInsumo.deleteMany({});
      await tx.insumo.deleteMany({});

      // 5. Borrar rutas
      await tx.ruta.deleteMany({});

      // 6. Borrar clientes
      await tx.cliente.deleteMany({});

      // 7. Borrar usuarios operativos (manteniendo todos los usuarios con rol ADMIN)
      await tx.user.deleteMany({
        where: {
          rol: {
            not: "ADMIN",
          },
        },
      });

      // 8. Restaurar la Bodega Principal a los valores por defecto si existe
      await tx.bodegaPrincipal.upsert({
        where: { id: "bodega-principal" },
        update: {
          nombre: "Bodega Central VendyTrack",
          direccion: "Calle 13 # 68-35, Bogotá, Colombia",
          latitud: 4.64828,
          longitud: -74.11667,
          telefono: null,
        },
        create: {
          id: "bodega-principal",
          nombre: "Bodega Central VendyTrack",
          direccion: "Calle 13 # 68-35, Bogotá, Colombia",
          latitud: 4.64828,
          longitud: -74.11667,
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
