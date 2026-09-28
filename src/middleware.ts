import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "vendytrack_session";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET no configurado");
    }
    return "dev-only-insecure-key-vendytrack-2026-do-not-use-in-prod";
  }
  return secret;
}

interface SessionPayload {
  id: string;
  name: string;
  email: string;
  rol: "ADMIN" | "OPERADOR_RUTA" | "CLIENTE" | "SUPERADMIN";
  empresaId: string;
  clienteId?: string | null;
}

/**
 * Verifica la firma HMAC-SHA256 del token de sesión en Edge Runtime.
 */
async function verifySessionEdge(token: string): Promise<SessionPayload | null> {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(getSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(payload)
    );

    if (!isValid) return null;

    const json = atob(payload);
    const parsed = JSON.parse(json);

    // Validar expiración
    if (parsed.exp && Math.floor(Date.now() / 1000) > parsed.exp) {
      return null;
    }

    // Validar campos requeridos para la sesión multi-tenant
    if (!parsed.id || !parsed.email || !parsed.rol || !parsed.empresaId) {
      return null;
    }

    return parsed as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Permitir libre acceso a recursos estáticos, manifest e imágenes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$/i)
  ) {
    return NextResponse.next();
  }

  // 2. Verificar la cookie de sesión criptográfica (HMAC-SHA256)
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = sessionToken ? await verifySessionEdge(sessionToken) : null;

  // Si no está autenticado o la cookie es inválida / obsoleta
  if (!user) {
    if (pathname === "/login") {
      const response = NextResponse.next();
      if (sessionToken) {
        // Eliminar cookie dañada/obsoleta para evitar bucles de redirección
        response.cookies.delete(SESSION_COOKIE_NAME);
      }
      return response;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const response = NextResponse.redirect(loginUrl);
    if (sessionToken) {
      // Eliminar cookie dañada/obsoleta
      response.cookies.delete(SESSION_COOKIE_NAME);
    }
    return response;
  }

  // Función auxiliar para redirigir según el rol del usuario
  const getDestinationForRole = (rol: string) => {
    switch (rol) {
      case "SUPERADMIN":
        return "/superadmin";
      case "ADMIN":
        return "/admin";
      case "CLIENTE":
        return "/cliente";
      default:
        return "/rutero";
    }
  };

  // Si ya está autenticado e intenta ir a /login
  if (pathname === "/login") {
    const destUrl = request.nextUrl.clone();
    destUrl.pathname = getDestinationForRole(user.rol);
    return NextResponse.redirect(destUrl);
  }

  // Si está en la raíz (/), enviar directamente a su dashboard
  if (pathname === "/") {
    const destUrl = request.nextUrl.clone();
    destUrl.pathname = getDestinationForRole(user.rol);
    return NextResponse.redirect(destUrl);
  }

  // 3. Control de Rutas según RBAC
  if (pathname.startsWith("/superadmin") && user.rol !== "SUPERADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = getDestinationForRole(user.rol);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && user.rol !== "ADMIN" && user.rol !== "SUPERADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = getDestinationForRole(user.rol);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/cliente") && user.rol !== "CLIENTE" && user.rol !== "ADMIN" && user.rol !== "SUPERADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = getDestinationForRole(user.rol);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/rutero") && user.rol !== "OPERADOR_RUTA" && user.rol !== "ADMIN" && user.rol !== "SUPERADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = getDestinationForRole(user.rol);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
