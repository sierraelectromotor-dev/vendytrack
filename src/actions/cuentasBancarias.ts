"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function obtenerCuentasBancarias() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "No autenticado", data: [] };

    const cuentas = await prisma.cuentaBancaria.findMany({
      where: { empresaId: user.empresaId },
      orderBy: [{ esPrincipal: "desc" }, { createdAt: "desc" }],
    });

    return { success: true, data: cuentas };
  } catch (error: any) {
    console.error("[obtenerCuentasBancarias] Error:", error);
    return { success: false, error: error.message || "Error al obtener cuentas", data: [] };
  }
}

export async function crearCuentaBancaria(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "No autenticado" };

    const banco = formData.get("banco")?.toString().trim();
    const tipoCuenta = formData.get("tipoCuenta")?.toString().trim() || "AHORROS";
    const numeroCuenta = formData.get("numeroCuenta")?.toString().trim();
    const titular = formData.get("titular")?.toString().trim();
    const nitTitular = formData.get("nitTitular")?.toString().trim() || null;
    const esPrincipal = formData.get("esPrincipal") === "true";

    if (!banco || !numeroCuenta || !titular) {
      return { success: false, error: "Banco, número de cuenta y titular son requeridos." };
    }

    // Si se marca como principal, desmarcar otras cuentas de la misma empresa
    if (esPrincipal) {
      await prisma.cuentaBancaria.updateMany({
        where: { empresaId: user.empresaId, esPrincipal: true },
        data: { esPrincipal: false },
      });
    }

    const nueva = await prisma.cuentaBancaria.create({
      data: {
        empresaId: user.empresaId,
        banco,
        tipoCuenta,
        numeroCuenta,
        titular,
        nitTitular,
        esPrincipal,
        activa: true,
      },
    });

    revalidatePath("/admin/contabilidad");
    return { success: true, data: nueva };
  } catch (error: any) {
    console.error("[crearCuentaBancaria] Error:", error);
    return { success: false, error: error.message || "Error al crear cuenta bancaria" };
  }
}

export async function actualizarCuentaBancaria(id: string, formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "No autenticado" };

    const banco = formData.get("banco")?.toString().trim();
    const tipoCuenta = formData.get("tipoCuenta")?.toString().trim() || "AHORROS";
    const numeroCuenta = formData.get("numeroCuenta")?.toString().trim();
    const titular = formData.get("titular")?.toString().trim();
    const nitTitular = formData.get("nitTitular")?.toString().trim() || null;
    const esPrincipal = formData.get("esPrincipal") === "true";
    const activa = formData.get("activa") === "true";

    if (!banco || !numeroCuenta || !titular) {
      return { success: false, error: "Banco, número de cuenta y titular son requeridos." };
    }

    if (esPrincipal) {
      await prisma.cuentaBancaria.updateMany({
        where: { empresaId: user.empresaId, id: { not: id }, esPrincipal: true },
        data: { esPrincipal: false },
      });
    }

    await prisma.cuentaBancaria.update({
      where: { id, empresaId: user.empresaId },
      data: {
        banco,
        tipoCuenta,
        numeroCuenta,
        titular,
        nitTitular,
        esPrincipal,
        activa,
      },
    });

    revalidatePath("/admin/contabilidad");
    return { success: true };
  } catch (error: any) {
    console.error("[actualizarCuentaBancaria] Error:", error);
    return { success: false, error: error.message || "Error al actualizar cuenta bancaria" };
  }
}

export async function eliminarCuentaBancaria(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "No autenticado" };

    await prisma.cuentaBancaria.delete({
      where: { id, empresaId: user.empresaId },
    });

    revalidatePath("/admin/contabilidad");
    return { success: true };
  } catch (error: any) {
    console.error("[eliminarCuentaBancaria] Error:", error);
    return { success: false, error: error.message || "Error al eliminar cuenta bancaria" };
  }
}

export async function toggleCuentaBancariaActiva(id: string, activa: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "No autenticado" };

    await prisma.cuentaBancaria.update({
      where: { id, empresaId: user.empresaId },
      data: { activa },
    });

    revalidatePath("/admin/contabilidad");
    return { success: true };
  } catch (error: any) {
    console.error("[toggleCuentaBancariaActiva] Error:", error);
    return { success: false, error: error.message || "Error al cambiar estado" };
  }
}
