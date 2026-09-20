"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { BEBIDAS_CATALOGO } from "@/types/liquidacion";
import { TipoBebida, Rol } from "@prisma/client";
import { getCurrentUser, setSessionCookie, requireAdmin, hashPassword } from "@/lib/auth";

function getDatabaseUrl() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    "";
  if (!process.env.DATABASE_URL && url) {
    process.env.DATABASE_URL = url;
  }
  return url.trim();
}

// ==========================================
// 1. INVENTARIO DE BODEGA & KÁRDEX
// ==========================================

export async function obtenerInventarioBodega() {
  await requireAdmin();

  try {
    const insumos = await prisma.insumo.findMany({
      orderBy: { nombre: "asc" },
    });

    const movimientos = await prisma.movimientoInventario.findMany({
      take: 20,
      orderBy: { fecha: "desc" },
      include: {
        insumo: true,
      },
    });

    return {
      success: true,
      data: {
        insumos: insumos.map((i) => ({
          id: i.id,
          codigo: i.codigo,
          nombre: i.nombre,
          unidadMedida: i.unidadMedida,
          stockActual: Number(i.stockActual),
          stockMinimo: Number(i.stockMinimo),
          costoPromedio: Number(i.costoPromedio),
        })),
        movimientos: movimientos.map((m) => ({
          id: m.id,
          insumoNombre: m.insumo.nombre,
          tipo: m.tipo,
          cantidad: Number(m.cantidad),
          costoUnitario: m.costoUnitario ? Number(m.costoUnitario) : null,
          referencia: m.referencia,
          fecha: m.fecha.toISOString(),
        })),
      },
    };
  } catch (error) {
    console.error("[obtenerInventarioBodega] Error:", error);
    return {
      success: true,
      data: {
        insumos: [],
        movimientos: [],
      },
    };
  }
}

export async function registrarEntradaBodega(formData: FormData) {
  await requireAdmin();

  try {
    const insumoId = formData.get("insumoId")?.toString();
    const cantidad = parseFloat(formData.get("cantidad")?.toString() || "0");
    const costoUnitario = parseFloat(formData.get("costoUnitario")?.toString() || "0");
    const proveedor = formData.get("proveedor")?.toString() || "Proveedor General";
    const referencia = formData.get("referencia")?.toString() || `COMPRA-${Date.now()}`;

    if (!insumoId || cantidad <= 0 || costoUnitario <= 0) {
      return { success: false, error: "Datos de entrada inválidos" };
    }

    await prisma.$transaction(async (tx) => {
      const insumo = await tx.insumo.findUnique({ where: { id: insumoId } });
      if (!insumo) throw new Error("Insumo no encontrado");

      const stockPrevio = Number(insumo.stockActual);
      const costoPrevio = Number(insumo.costoPromedio);
      const nuevoStock = stockPrevio + cantidad;
      const nuevoCostoPromedio =
        nuevoStock > 0
          ? (stockPrevio * costoPrevio + cantidad * costoUnitario) / nuevoStock
          : costoUnitario;

      // 1. Actualizar stock y costo promedio
      await tx.insumo.update({
        where: { id: insumoId },
        data: {
          stockActual: nuevoStock,
          costoPromedio: nuevoCostoPromedio,
        },
      });

      // 2. Registrar movimiento de entrada en Kárdex
      await tx.movimientoInventario.create({
        data: {
          insumoId,
          tipo: "ENTRADA_COMPRA",
          cantidad,
          costoUnitario,
          referencia: `${referencia} - ${proveedor}`,
        },
      });
    });

    revalidatePath("/admin/inventario");
    return { success: true };
  } catch (error: any) {
    console.error("[registrarEntradaBodega] Error:", error);
    return { success: false, error: error.message || "Error registrando entrada" };
  }
}

// ==========================================
// 2. GESTIÓN DE RUTEROS Y ADMINISTRADORES
// ==========================================

export async function obtenerUsuarios() {
  await requireAdmin();

  try {
    const usuarios = await prisma.user.findMany({
      include: {
        rutasAsignadas: true,
        liquidaciones: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: usuarios.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        rol: u.rol,
        rutas: u.rutasAsignadas.map((r) => r.nombre),
        totalLiquidaciones: u.liquidaciones.length,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[obtenerUsuarios] Error:", error);
    return {
      success: true,
      data: [],
    };
  }
}

export async function obtenerRuteros() {
  await requireAdmin();

  try {
    const ruteros = await prisma.user.findMany({
      where: { rol: "OPERADOR_RUTA" },
      include: {
        rutasAsignadas: true,
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: ruteros.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        rutas: r.rutasAsignadas.map((ruta) => ruta.nombre),
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[obtenerRuteros] Error:", error);
    return {
      success: true,
      data: [],
    };
  }
}

export async function crearUsuario(formData: FormData) {
  await requireAdmin();

  try {
    if (!getDatabaseUrl()) {
      return {
        success: false,
        error: "Falta configurar DATABASE_URL en Vercel.",
      };
    }

    const name = formData.get("name")?.toString().trim();
    const email = formData.get("email")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString();
    const rol = (formData.get("rol")?.toString() || "OPERADOR_RUTA") as Rol;

    if (!name || !email || !password) {
      return { success: false, error: "Todos los campos son obligatorios" };
    }

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password.trim()),
        rol,
      },
    });

    revalidatePath("/admin/ruteros");
    return { success: true };
  } catch (error: any) {
    console.error("[crearUsuario] Error:", error);
    return { success: false, error: "El correo ya está en uso o ocurrió un error" };
  }
}

export async function crearRutero(formData: FormData) {
  return crearUsuario(formData);
}

export async function actualizarUsuario(
  id: string,
  data: { name: string; email?: string; password?: string }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "No autorizado: Inicia sesión." };
    }

    // Solo un administrador o el propio usuario pueden editar este perfil
    if (currentUser.rol !== "ADMIN" && currentUser.id !== id) {
      return { success: false, error: "No tienes permisos para modificar este usuario." };
    }

    if (!getDatabaseUrl()) {
      return {
        success: false,
        error: "Falta configurar DATABASE_URL en Vercel.",
      };
    }

    const { name, email, password } = data;
    if (!name || !name.trim()) {
      return { success: false, error: "El nombre es obligatorio" };
    }

    const updateData: any = { name: name.trim() };
    if (email && email.trim()) updateData.email = email.trim().toLowerCase();
    if (password && password.trim()) updateData.passwordHash = hashPassword(password.trim());

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Si el usuario actualizado es el usuario logueado actualmente, refrescar cookie de sesión
    if (currentUser.id === id) {
      await setSessionCookie({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        rol: updatedUser.rol as any,
        clienteId: updatedUser.clienteId,
      });
    }

    revalidatePath("/admin/ruteros");
    revalidatePath("/admin");
    return { success: true, user: updatedUser };
  } catch (error: any) {
    console.error("[actualizarUsuario] Error:", error);
    return { success: false, error: error.message || "Error al actualizar usuario" };
  }
}

export async function eliminarUsuario(id: string) {
  await requireAdmin();

  try {
    if (!getDatabaseUrl()) {
      return {
        success: false,
        error: "Falta configurar DATABASE_URL en Vercel.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        liquidaciones: { select: { id: true } },
        rutasAsignadas: { select: { id: true } },
      },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    // Proteger si es el último administrador
    if (user.rol === "ADMIN") {
      const totalAdmins = await prisma.user.count({ where: { rol: "ADMIN" } });
      if (totalAdmins <= 1) {
        return {
          success: false,
          error: "No puedes eliminar el único administrador del sistema.",
        };
      }
    }

    // Verificar si tiene liquidaciones históricas asociadas
    if (user.liquidaciones.length > 0) {
      return {
        success: false,
        error: `No es posible eliminar al usuario porque tiene ${user.liquidaciones.length} liquidaciones asociadas en el historial. Puedes editar su nombre o contraseña si ya no labora en la empresa.`,
      };
    }

    // Si tiene rutas asignadas, desasignarlas primero
    if (user.rutasAsignadas.length > 0) {
      await prisma.ruta.updateMany({
        where: { operadorId: id },
        data: { operadorId: null },
      });
    }

    await prisma.user.delete({
      where: { id },
    });

    revalidatePath("/admin/ruteros");
    revalidatePath("/admin/rutas");
    return { success: true };
  } catch (error: any) {
    console.error("[eliminarUsuario] Error:", error);
    return { success: false, error: error.message || "Error al eliminar usuario" };
  }
}

// ==========================================
// 3. GESTIÓN DE CLIENTES Y MÁQUINAS
// ==========================================

export async function obtenerClientes() {
  await requireAdmin();

  try {
    const clientes = await prisma.cliente.findMany({
      include: {
        maquinas: {
          include: {
            ruta: true,
            configuraciones: true,
          },
        },
      },
      orderBy: { razonSocial: "asc" },
    });

    return {
      success: true,
      data: clientes.map((c) => ({
        id: c.id,
        razonSocial: c.razonSocial,
        sede: c.sede,
        direccion: c.direccion,
        contacto: c.contacto,
        whatsapp: c.whatsapp,
        maquinas: c.maquinas.map((m) => ({
          id: m.id,
          codigoSerial: m.codigoSerial,
          modelo: m.modelo,
          ubicacion: m.ubicacion,
          numeroProductos: m.numeroProductos,
          rutaNombre: m.ruta?.nombre || "Sin Ruta Asignada",
          configuraciones: m.configuraciones.map((cfg) => ({
            id: cfg.id,
            bebida: cfg.bebida,
            activa: cfg.activa,
            gramosCafe: Number(cfg.gramosCafe),
            gramosLeche: Number(cfg.gramosLeche),
            gramosCocoa: Number(cfg.gramosCocoa),
            precio: Number(cfg.precio),
          })),
        })),
      })),
    };
  } catch (error) {
    console.error("[obtenerClientes] Error:", error);
    return {
      success: true,
      data: [],
    };
  }
}

export async function crearCliente(formData: FormData) {
  await requireAdmin();

  try {
    const razonSocial = formData.get("razonSocial")?.toString().trim();
    const sede = formData.get("sede")?.toString().trim();
    const direccion = formData.get("direccion")?.toString().trim();
    const contacto = formData.get("contacto")?.toString().trim();
    const whatsapp = formData.get("whatsapp")?.toString().trim();

    if (!razonSocial || !sede || !direccion || !contacto || !whatsapp) {
      return { success: false, error: "Todos los campos son obligatorios" };
    }

    await prisma.cliente.create({
      data: {
        razonSocial,
        sede,
        direccion,
        contacto,
        whatsapp,
      },
    });

    revalidatePath("/admin/clientes");
    return { success: true };
  } catch (error: any) {
    console.error("[crearCliente] Error:", error);
    return { success: false, error: error.message || "Error al crear cliente" };
  }
}

export async function crearMaquina(formData: FormData) {
  await requireAdmin();

  try {
    const codigoSerial = formData.get("codigoSerial")?.toString().trim();
    const modelo = formData.get("modelo")?.toString().trim();
    const ubicacion = formData.get("ubicacion")?.toString().trim();
    const clienteId = formData.get("clienteId")?.toString();
    const rutaId = formData.get("rutaId")?.toString() || null;
    const numeroProductos = parseInt(formData.get("numeroProductos")?.toString() || "4", 10);

    if (!codigoSerial || !modelo || !ubicacion || !clienteId) {
      return { success: false, error: "Datos de máquina incompletos" };
    }

    const nuevaMaquina = await prisma.maquina.create({
      data: {
        codigoSerial,
        modelo,
        ubicacion,
        numeroProductos,
        clienteId,
        rutaId: rutaId && rutaId !== "none" ? rutaId : null,
      },
    });

    // Calibración inicial automática de gramajes y activación de las primeras N bebidas
    const defaultCalibrations = [
      { bebida: "CAFE_LARGO_TINTO", cafe: 2.2, leche: 0, cocoa: 0, precio: 1800 },
      { bebida: "CAFE_CORTO_EXPRESO", cafe: 2.0, leche: 0, cocoa: 0, precio: 1800 },
      { bebida: "CAPUCHINO_TRADICIONAL", cafe: 2.0, leche: 12.0, cocoa: 0, precio: 2500 },
      { bebida: "CHOCOLATE_CHOCOMILK", cafe: 0, leche: 6.0, cocoa: 16.0, precio: 2400 },
      { bebida: "CAPUCHINO_VAINILLA", cafe: 1.8, leche: 12.0, cocoa: 0, precio: 2500 },
      { bebida: "MOCACCINO", cafe: 1.8, leche: 8.0, cocoa: 10.0, precio: 2800 },
      { bebida: "LATTE", cafe: 1.5, leche: 15.0, cocoa: 0, precio: 2600 },
    ];

    for (let i = 0; i < defaultCalibrations.length; i++) {
      const c = defaultCalibrations[i];
      const activa = i < numeroProductos;
      await prisma.configBebidaMaquina.create({
        data: {
          maquinaId: nuevaMaquina.id,
          bebida: c.bebida as TipoBebida,
          activa,
          gramosCafe: c.cafe,
          gramosLeche: c.leche,
          gramosCocoa: c.cocoa,
          precio: c.precio,
        },
      });
    }

    revalidatePath("/admin/clientes");
    return { success: true };
  } catch (error: any) {
    console.error("[crearMaquina] Error:", error);
    return { success: false, error: "El serial ya existe o hubo un error" };
  }
}

export async function guardarCalibracionMaquina(
  maquinaId: string,
  configuraciones: Array<{
    bebida: string;
    activa: boolean;
    gramosCafe: number;
    gramosLeche: number;
    gramosCocoa: number;
    precio: number;
  }>
) {
  await requireAdmin();

  try {
    for (const c of configuraciones) {
      await prisma.configBebidaMaquina.upsert({
        where: {
          maquinaId_bebida: {
            maquinaId,
            bebida: c.bebida as TipoBebida,
          },
        },
        update: {
          activa: c.activa,
          gramosCafe: c.gramosCafe,
          gramosLeche: c.gramosLeche,
          gramosCocoa: c.gramosCocoa,
          precio: c.precio,
        },
        create: {
          maquinaId,
          bebida: c.bebida as TipoBebida,
          activa: c.activa,
          gramosCafe: c.gramosCafe,
          gramosLeche: c.gramosLeche,
          gramosCocoa: c.gramosCocoa,
          precio: c.precio,
        },
      });
    }

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/precios");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("[guardarCalibracionMaquina] Error:", error);
    return { success: false, error: error.message || "Error al guardar calibración" };
  }
}

// ==========================================
// 4. CONFIGURACIÓN DE PRECIOS POR MÁQUINA
// ==========================================

export async function obtenerPreciosPorMaquina(maquinaId: string) {
  await requireAdmin();

  try {
    const precios = await prisma.precioMaquina.findMany({
      where: { maquinaId },
    });

    const mapaPrecios = Object.fromEntries(
      precios.map((p) => [p.bebida, Number(p.precioUnitario)])
    );

    const defaultPrices: Record<string, number> = {
      CAPUCHINO_VAINILLA: 2500,
      CAPUCHINO_TRADICIONAL: 2500,
      MOCACCINO: 2800,
      CAFE_CORTO_EXPRESO: 1800,
      CAFE_LARGO_TINTO: 1800,
      LATTE: 2600,
      CHOCOLATE_CHOCOMILK: 2400,
    };

    return {
      success: true,
      data: BEBIDAS_CATALOGO.map((b) => ({
        bebida: b.id,
        nombre: b.nombre,
        icono: b.icono,
        precioUnitario: mapaPrecios[b.id] ?? defaultPrices[b.id] ?? 2500,
      })),
    };
  } catch (error) {
    console.error("[obtenerPreciosPorMaquina] Error:", error);
    return {
      success: true,
      data: BEBIDAS_CATALOGO.map((b) => ({
        bebida: b.id,
        nombre: b.nombre,
        icono: b.icono,
        precioUnitario: 2500,
      })),
    };
  }
}

export async function actualizarPreciosMaquina(
  maquinaId: string,
  precios: Record<string, number>
) {
  await requireAdmin();

  try {
    for (const [bebida, precio] of Object.entries(precios)) {
      await prisma.precioMaquina.upsert({
        where: {
          maquinaId_bebida: {
            maquinaId,
            bebida: bebida as TipoBebida,
          },
        },
        update: { precioUnitario: precio },
        create: {
          maquinaId,
          bebida: bebida as TipoBebida,
          precioUnitario: precio,
        },
      });
    }

    revalidatePath("/admin/precios");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("[actualizarPreciosMaquina] Error:", error);
    return { success: false, error: error.message || "Error al actualizar precios" };
  }
}

// ==========================================
// 5. CONFIGURACIÓN DE RUTAS Y ASIGNACIÓN
// ==========================================

export async function obtenerRutas() {
  await requireAdmin();

  try {
    const rutas = await prisma.ruta.findMany({
      include: {
        operador: true,
        maquinas: {
          include: {
            cliente: true,
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    return {
      success: true,
      data: rutas.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion,
        diasFrecuencia: r.diasFrecuencia,
        operadorId: r.operadorId,
        operadorNombre: r.operador?.name || "Sin Asignar",
        maquinas: r.maquinas.map((m) => ({
          id: m.id,
          codigoSerial: m.codigoSerial,
          clienteNombre: m.cliente.razonSocial,
          sede: m.cliente.sede,
          ubicacion: m.ubicacion,
        })),
      })),
    };
  } catch (error) {
    console.error("[obtenerRutas] Error:", error);
    return {
      success: true,
      data: [],
    };
  }
}

export async function crearRuta(formData: FormData) {
  await requireAdmin();

  try {
    const nombre = formData.get("nombre")?.toString().trim();
    const descripcion = formData.get("descripcion")?.toString().trim();
    const diasFrecuencia = formData.get("diasFrecuencia")?.toString().trim();
    const operadorId = formData.get("operadorId")?.toString();

    if (!nombre) {
      return { success: false, error: "El nombre de la ruta es obligatorio" };
    }

    await prisma.ruta.create({
      data: {
        nombre,
        descripcion,
        diasFrecuencia,
        operadorId: operadorId && operadorId !== "none" ? operadorId : null,
      },
    });

    revalidatePath("/admin/rutas");
    return { success: true };
  } catch (error: any) {
    console.error("[crearRuta] Error:", error);
    return { success: false, error: error.message || "Error al crear la ruta" };
  }
}

export async function asignarOperadorRuta(rutaId: string, operadorId: string) {
  await requireAdmin();

  try {
    await prisma.ruta.update({
      where: { id: rutaId },
      data: {
        operadorId: operadorId === "none" ? null : operadorId,
      },
    });

    revalidatePath("/admin/rutas");
    return { success: true };
  } catch (error: any) {
    console.error("[asignarOperadorRuta] Error:", error);
    return { success: false, error: error.message };
  }
}

export async function asignarMaquinaARuta(maquinaId: string, rutaId: string) {
  await requireAdmin();

  try {
    await prisma.maquina.update({
      where: { id: maquinaId },
      data: {
        rutaId: rutaId === "none" ? null : rutaId,
      },
    });

    revalidatePath("/admin/rutas");
    revalidatePath("/admin/clientes");
    return { success: true };
  } catch (error: any) {
    console.error("[asignarMaquinaARuta] Error:", error);
    return { success: false, error: error.message };
  }
}
