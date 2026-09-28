"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function requireSuperadmin() {
  const user = await getCurrentUser();
  if (!user || user.rol !== "SUPERADMIN") {
    throw new Error("Acceso denegado: Se requiere rol de SUPERADMIN");
  }
  return user;
}

export async function obtenerEmpresas() {
  try {
    await requireSuperadmin();
    const empresas = await prisma.empresa.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { usuarios: true, clientes: true, maquinas: true },
        },
        usuarios: {
          select: { id: true, name: true, email: true, rol: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return { success: true, data: empresas };
  } catch (e: any) {
    return { success: false, error: e.message, data: [] };
  }
}

export async function crearEmpresa(formData: FormData) {
  try {
    await requireSuperadmin();
    const nombre = formData.get("nombre")?.toString().trim() || "";
    const nit = formData.get("nit")?.toString().trim() || "";

    const adminName = formData.get("adminName")?.toString().trim();
    const adminEmail = formData.get("adminEmail")?.toString().trim().toLowerCase();
    const adminPassword = formData.get("adminPassword")?.toString().trim();

    if (!nombre) return { success: false, error: "El nombre es obligatorio" };

    // Si se especificaron datos del admin, validar
    if (adminEmail && !adminPassword) {
      return { success: false, error: "Si defines un correo de administrador, debes asignar una contraseña." };
    }

    if (adminEmail) {
      const existeUser = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (existeUser) {
        return { success: false, error: `El correo ${adminEmail} ya está registrado en el sistema.` };
      }
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: { nombre, nit },
      });

      let adminUser = null;
      if (adminEmail && adminPassword) {
        const passwordHash = await hashPassword(adminPassword);
        adminUser = await tx.user.create({
          data: {
            empresaId: empresa.id,
            name: adminName || `Admin ${nombre}`,
            email: adminEmail,
            passwordHash,
            rol: "ADMIN",
          },
          select: { id: true, name: true, email: true, rol: true, createdAt: true },
        });
      }

      return { empresa, adminUser };
    });

    revalidatePath("/superadmin/empresas");
    return {
      success: true,
      data: {
        ...resultado.empresa,
        usuarios: resultado.adminUser ? [resultado.adminUser] : [],
        _count: { usuarios: resultado.adminUser ? 1 : 0, clientes: 0, maquinas: 0 },
      },
    };
  } catch (e: any) {
    console.error("[crearEmpresa] Error:", e);
    return { success: false, error: e.message || "Error al crear la empresa" };
  }
}

export async function crearAdministradorEmpresa(empresaId: string, formData: FormData) {
  try {
    await requireSuperadmin();

    const name = formData.get("name")?.toString().trim();
    const email = formData.get("email")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString().trim();

    if (!name || !email || !password) {
      return { success: false, error: "Nombre, correo y contraseña son obligatorios." };
    }

    const existe = await prisma.user.findUnique({ where: { email } });
    if (existe) {
      return { success: false, error: `El correo ${email} ya está registrado en el sistema.` };
    }

    const passwordHash = await hashPassword(password);

    const nuevoUsuario = await prisma.user.create({
      data: {
        empresaId,
        name,
        email,
        passwordHash,
        rol: "ADMIN",
      },
      select: { id: true, name: true, email: true, rol: true, createdAt: true },
    });

    revalidatePath("/superadmin/empresas");
    return { success: true, data: nuevoUsuario };
  } catch (e: any) {
    console.error("[crearAdministradorEmpresa] Error:", e);
    return { success: false, error: e.message || "Error al crear el administrador" };
  }
}

export async function toggleEmpresaEstado(empresaId: string, activa: boolean) {
  try {
    await requireSuperadmin();
    await prisma.empresa.update({
      where: { id: empresaId },
      data: { activa },
    });
    revalidatePath("/superadmin/empresas");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
