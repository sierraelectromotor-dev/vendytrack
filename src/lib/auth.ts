import { cookies } from "next/headers";
import prisma from "./prisma";
import crypto from "crypto";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  rol: "ADMIN" | "OPERADOR_RUTA" | "CLIENTE";
  clienteId?: string | null;
}

const SESSION_COOKIE_NAME = "vendytrack_session";
const SESSION_SECRET = process.env.NEXTAUTH_SECRET || "vendytrack_secret_salt_2026";

// Usuarios de prueba predeterminados para desarrollo y demostración inmediata
export const USUARIOS_DEMO: Record<
  string,
  { password: string; user: SessionUser }
> = {
  "admin@vendytrack.com": {
    password: "admin123",
    user: {
      id: "usr-admin-01",
      name: "Andrés Restrepo",
      email: "admin@vendytrack.com",
      rol: "ADMIN",
    },
  },
  "carlos.operador@vendytrack.com": {
    password: "ruta123",
    user: {
      id: "operador-default-1",
      name: "Carlos Mendoza",
      email: "carlos.operador@vendytrack.com",
      rol: "OPERADOR_RUTA",
    },
  },
  "cliente@sanitas.com": {
    password: "cliente123",
    user: {
      id: "usr-cliente-01",
      name: "Dra. Claudia Pérez",
      email: "cliente@sanitas.com",
      rol: "CLIENTE",
      clienteId: "cli-demo-01",
    },
  },
};

/**
 * Cifra un payload de sesión simple en Base64 con firma HMAC.
 */
export function signSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

/**
 * Verifica y descifra la cookie de sesión.
 */
export function verifySession(token: string): SessionUser | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("hex");

    if (signature !== expectedSignature) {
      return null;
    }

    const json = Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(json) as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Obtiene el usuario autenticado actual desde las cookies del servidor.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySession(token);
}

/**
 * Inicia sesión creando la cookie HTTP-only.
 */
export async function setSessionCookie(user: SessionUser) {
  const cookieStore = cookies();
  const token = signSession(user);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  // Cookie accesible para el cliente / middleware
  cookieStore.set("vendytrack_role", user.rol, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/**
 * Cierra la sesión eliminando las cookies.
 */
export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete("vendytrack_role");
}
