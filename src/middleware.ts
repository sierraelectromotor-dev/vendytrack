import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Permitir libre acceso a recursos estáticos, manifest, imágenes y API pública
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/liquidaciones") ||
    pathname === "/manifest.json" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Verificar cookie de sesión
  const sessionToken = request.cookies.get("vendytrack_session")?.value;
  const cookieRole = request.cookies.get("vendytrack_role")?.value;
  const urlRole = request.nextUrl.searchParams.get("role");

  // Si el usuario no ha iniciado sesión y no está en la página de login
  if (!sessionToken && !cookieRole && pathname !== "/login") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Si el usuario ya está autenticado e intenta ir al login
  if ((sessionToken || cookieRole) && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  const userRole = urlRole || cookieRole || "OPERADOR_RUTA";

  let response = NextResponse.next();
  if (urlRole && ["ADMIN", "OPERADOR_RUTA", "CLIENTE"].includes(urlRole)) {
    response.cookies.set("vendytrack_role", urlRole, { path: "/" });
  }

  // 3. Control de Rutas según RBAC (Roles)
  if (pathname.startsWith("/admin") && userRole !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "unauthorized_admin");
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/cliente") && userRole !== "CLIENTE" && userRole !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "unauthorized_cliente");
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/liquidacion") && userRole === "CLIENTE") {
    const url = request.nextUrl.clone();
    url.pathname = "/cliente/historial";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
