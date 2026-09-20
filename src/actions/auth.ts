"use server";

import { redirect } from "next/navigation";
import { setSessionCookie, clearSessionCookie, verifyPassword, hashPassword, SessionUser } from "@/lib/auth";
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

  try {
    const userFromDb = await prisma.user.findUnique({
      where: { email },
    });

    if (userFromDb && verifyPassword(password, userFromDb.passwordHash)) {
      // Si la contraseña estaba almacenada en texto plano, migrarla de inmediato a hash scrypt
      if (!userFromDb.passwordHash.includes(":")) {
        try {
          await prisma.user.update({
            where: { id: userFromDb.id },
            data: { passwordHash: hashPassword(password) },
          });
        } catch (updateErr) {
          console.warn("[loginAction] Error migrando hash de contraseña:", updateErr);
        }
      }

      userToAuth = {
        id: userFromDb.id,
        name: userFromDb.name,
        email: userFromDb.email,
        rol: userFromDb.rol,
        clienteId: userFromDb.clienteId,
      };
    }
  } catch (e) {
    console.error("[loginAction] Error consultando la base de datos:", e);
    return { error: "Error conectando con el servidor de autenticación. Intenta de nuevo." };
  }

  if (!userToAuth) {
    return { error: "Credenciales inválidas. Verifica tu correo o contraseña." };
  }

  // Establecer cookie de sesión segura (HTTP-only)
  await setSessionCookie(userToAuth);

  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
