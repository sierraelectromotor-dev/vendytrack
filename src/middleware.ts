import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "vendytrack_session";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "vendytrack_secure_session_key_2026_prod";

interface SessionPayload {
  id: string;
  name: string;
  email: string;
  rol: "ADMIN" | "OPERADOR_RUTA" | "CLIENTE";
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
      encoder.encode(SESSION_SECRET),
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
    return JSON.parse(json) as SessionPayload;
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

  // Permitir acceso a la descarga del recibo PDF (enlaces directos compartidos por WhatsApp)
  if (pathname.startsWith("/api/liquidaciones/") && pathname.endsWith("/pdf")) {
    return NextResponse.next();
  }

  // 2. Verificar la cookie de sesión criptográfica (HMAC-SHA256)
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = sessionToken ? await verifySessionEdge(sessionToken) : null;

  // Si no está autenticado
  if (!user) {
    if (pathname === "/login") {
      return NextResponse.next();
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Si ya está autenticado e intenta ir a /login
  if (pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = user.rol === "CLIENTE" ? "/cliente" : "/";
    return NextResponse.redirect(homeUrl);
  }

  // 3. Control de Rutas según RBAC estricto
  if (pathname.startsWith("/admin") && user.rol !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "unauthorized_admin");
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/cliente") && user.rol !== "CLIENTE" && user.rol !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "unauthorized_cliente");
    return NextResponse.redirect(url);
  }

  if (pathname === "/" && user.rol === "CLIENTE") {
    const url = request.nextUrl.clone();
    url.pathname = "/cliente";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
