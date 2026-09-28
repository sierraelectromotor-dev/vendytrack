import { cookies } from "next/headers";
import crypto from "crypto";
import { getSessionSecret } from './env';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  rol: "SUPERADMIN" | "ADMIN" | "OPERADOR_RUTA" | "CLIENTE";
  empresaId: string;
  clienteId?: string | null;
}

export const SESSION_COOKIE_NAME = "vendytrack_session";

function getSecret(): string {
  return getSessionSecret();
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !password) return false;
  if (!storedHash.includes(":")) {
    return false;
  }
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  try {
    const keyBuffer = Buffer.from(hash, "hex");
    return new Promise((resolve) => {
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) { resolve(false); return; }
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      });
    });
  } catch {
    return false;
  }
}

export function signSession(user: SessionUser): string {
  const payloadObj = {
    ...user,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7),
  };
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

export function verifySession(token: string): SessionUser | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const json = Buffer.from(payload, "base64").toString("utf-8");
    const parsed = JSON.parse(json);

    if (parsed.exp && Math.floor(Date.now() / 1000) > parsed.exp) return null;
    if (!parsed.id || !parsed.email || !parsed.rol || !parsed.empresaId) return null;

    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      rol: parsed.rol,
      empresaId: parsed.empresaId,
      clienteId: parsed.clienteId || null,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autorizado");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || (user.rol !== "ADMIN" && user.rol !== "SUPERADMIN")) {
    throw new Error("Acceso denegado: Se requieren privilegios de Administrador.");
  }
  return user;
}

export async function setSessionCookie(user: SessionUser) {
  const cookieStore = cookies();
  const token = signSession(user);
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
