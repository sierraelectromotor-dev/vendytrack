import { cookies } from "next/headers";
import crypto from "crypto";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  rol: "ADMIN" | "OPERADOR_RUTA" | "CLIENTE";
  clienteId?: string | null;
}

export const SESSION_COOKIE_NAME = "vendytrack_session";
export const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "vendytrack_secure_session_key_2026_prod";

/**
 * Genera un hash criptográfico scrypt con sal aleatoria de 16 bytes.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifica una contraseña contra un hash scrypt (con compatibilidad para texto plano previo).
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;

  // Si la contraseña almacenada aún no tiene formato de sal (migración de texto plano)
  if (!storedHash.includes(":")) {
    return password === storedHash;
  }

  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  try {
    const keyBuffer = Buffer.from(hash, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Cifra un payload de sesión en Base64 con firma HMAC-SHA256.
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

    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
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
 * Guardia de autorización: Exige que exista un usuario autenticado.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("No autorizado: Se requiere iniciar sesión.");
  }
  return user;
}

/**
 * Guardia de autorización: Exige que el usuario tenga rol ADMIN.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.rol !== "ADMIN") {
    throw new Error("Acceso denegado: Se requieren privilegios de Administrador.");
  }
  return user;
}

/**
 * Inicia sesión creando la cookie HTTP-only y segura.
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
}

/**
 * Cierra la sesión eliminando las cookies.
 */
export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete("vendytrack_role");
}
