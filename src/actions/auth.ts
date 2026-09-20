"use server";

import { redirect } from "next/navigation";
import { setSessionCookie, clearSessionCookie, USUARIOS_DEMO, SessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function loginAction(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Por favor ingresa tu correo y contraseña" };
  }

  let userToAuth: SessionUser | null = null;

  // 1. Verificar primero en usuarios de prueba (DEMO)
  if (USUARIOS_DEMO[email] && USUARIOS_DEMO[email].password === password) {
    userToAuth = USUARIOS_DEMO[email].user;
  } else {
    // 2. Si no está en demo, consultar en la base de datos PostgreSQL
    try {
      const userFromDb = await prisma.user.findUnique({
        where: { email },
      });

      if (userFromDb && userFromDb.passwordHash === password) {
        userToAuth = {
          id: userFromDb.id,
          name: userFromDb.name,
          email: userFromDb.email,
          rol: userFromDb.rol,
          clienteId: userFromDb.clienteId,
        };
      }
    } catch (e) {
      console.warn("[loginAction] No se pudo consultar la base de datos:", e);
    }
  }

  if (!userToAuth) {
    return { error: "Credenciales inválidas. Verifica tu correo o contraseña." };
  }

  // Establecer cookie de sesión segura
  await setSessionCookie(userToAuth);

  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
