"use server";

import { redirect } from "next/navigation";
import { setSessionCookie, clearSessionCookie, verifyPassword, hashPassword, SessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Rate limiting simple en memoria
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos

function checkRateLimit(key: string): { allowed: boolean; remainingMs?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);
  
  if (!record) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
    return { allowed: true };
  }
  
  // Reset if lockout expired
  if (now - record.lastAttempt > LOCKOUT_MS) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
    return { allowed: true };
  }
  
  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingMs: LOCKOUT_MS - (now - record.lastAttempt) };
  }
  
  record.count++;
  record.lastAttempt = now;
  return { allowed: true };
}

function clearRateLimit(key: string) {
  loginAttempts.delete(key);
}

export async function loginAction(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password || password.length < 1) {
    return { error: "Por favor ingresa tu correo y contraseña" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Formato de correo inválido" };
  }

  const rateLimit = checkRateLimit(email);
  if (!rateLimit.allowed) {
    const minutes = Math.ceil((rateLimit.remainingMs || 0) / 60000);
    return { error: `Demasiados intentos. Intenta de nuevo en ${minutes} minutos.` };
  }

  let userToAuth: SessionUser | null = null;

  try {
    const userFromDb = await prisma.user.findUnique({
      where: { email },
    });

    if (userFromDb) {
      const isValid = await verifyPassword(password, userFromDb.passwordHash);
      if (isValid) {
        // Si la contraseña estaba almacenada en texto plano, migrarla de inmediato a hash scrypt
        if (!userFromDb.passwordHash.includes(":")) {
          try {
            const newHash = await hashPassword(password);
            await prisma.user.update({
              where: { id: userFromDb.id },
              data: { passwordHash: newHash },
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
          empresaId: userFromDb.empresaId,
        };
        clearRateLimit(email);
      }
    } else {
      // Prevención de ataques de timing: simular el mismo trabajo computacional
      await verifyPassword(password, "dummy:dummyhashdummyhashdummyhashdummyhashdummyhash");
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
