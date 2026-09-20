"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { BEBIDAS_CATALOGO, TipoBebidaEnum } from "@/types/liquidacion";
import { TipoBebida, Rol, TipoMovimientoInventario, UnidadMedida } from "@prisma/client";

// ==========================================
// 1. INVENTARIO DE BODEGA & KÁRDEX
// ==========================================

export async function obtenerInventarioBodega() {
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

    if (insumos.length === 0) {
      return getMockInventario();
    }

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
    console.warn("[obtenerInventarioBodega] Fallback mock:", error);
    return getMockInventario();
  }
}

export async function registrarEntradaBodega(formData: FormData) {
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
// 2. GESTIÓN DE RUTEROS (OPERADORES)
// ==========================================
import { getCurrentUser, setSessionCookie } from "@/lib/auth";

// ==========================================
// 2. GESTIÓN DE RUTEROS Y ADMINISTRADORES
// ==========================================

export async function obtenerUsuarios() {
  try {
    const usuarios = await prisma.user.findMany({
      include: {
        rutasAsignadas: true,
        liquidaciones: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    });

    if (usuarios.length === 0) {
      return {
        success: true,
        data: [
          {
            id: "usr-admin-01",
            name: "Andrés Restrepo",
            email: "admin@vendytrack.com",
            rol: "ADMIN" as const,
            rutas: [],
            totalLiquidaciones: 0,
            createdAt: new Date().toISOString(),
          },
          {
            id: "operador-default-1",
            name: "Carlos Mendoza",
            email: "carlos.operador@vendytrack.com",
            rol: "OPERADOR_RUTA" as const,
            rutas: ["Ruta 1 - Clínicas y Hospitales Norte"],
            totalLiquidaciones: 5,
            createdAt: new Date().toISOString(),
          },
          {
            id: "operador-2",
            name: "Javier Morales",
            email: "javier.ruta@vendytrack.com",
            rol: "OPERADOR_RUTA" as const,
            rutas: ["Ruta 2 - Oficinas Calle 72"],
            totalLiquidaciones: 0,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }

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
    console.warn("[obtenerUsuarios] Fallback mock:", error);
    return {
      success: true,
      data: [
        {
          id: "usr-admin-01",
          name: "Andrés Restrepo",
          email: "admin@vendytrack.com",
          rol: "ADMIN" as const,
          rutas: [],
          totalLiquidaciones: 0,
          createdAt: new Date().toISOString(),
        },
        {
          id: "operador-default-1",
          name: "Carlos Mendoza",
          email: "carlos.operador@vendytrack.com",
          rol: "OPERADOR_RUTA" as const,
          rutas: ["Ruta 1 - Clínicas y Hospitales Norte"],
          totalLiquidaciones: 5,
          createdAt: new Date().toISOString(),
        },
        {
          id: "operador-2",
          name: "Javier Morales",
          email: "javier.ruta@vendytrack.com",
          rol: "OPERADOR_RUTA" as const,
          rutas: ["Ruta 2 - Oficinas Calle 72"],
          totalLiquidaciones: 0,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }
}

export async function obtenerRuteros() {
  try {
    const ruteros = await prisma.user.findMany({
      where: { rol: "OPERADOR_RUTA" },
      include: {
        rutasAsignadas: true,
      },
      orderBy: { name: "asc" },
    });

    if (ruteros.length === 0) {
      return getMockRuteros();
    }

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
    console.warn("[obtenerRuteros] Fallback mock:", error);
    return getMockRuteros();
  }
}

export async function crearUsuario(formData: FormData) {
  try {
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
        passwordHash: password,
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
    const { name, email, password } = data;
    if (!name || !name.trim()) {
      return { success: false, error: "El nombre es obligatorio" };
    }

    const updateData: any = { name: name.trim() };
    if (email && email.trim()) updateData.email = email.trim().toLowerCase();
    if (password && password.trim()) updateData.passwordHash = password.trim();

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Si el usuario actualizado es el usuario logueado actualmente, refrescar cookie de sesión
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.id === id) {
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
  try {
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

    if (clientes.length === 0) {
      return getMockClientes();
    }

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
    console.warn("[obtenerClientes] Fallback mock:", error);
    return getMockClientes();
  }
}

export async function crearCliente(formData: FormData) {
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
    console.warn("[obtenerPreciosPorMaquina] Fallback mock:", error);
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

    if (rutas.length === 0) {
      return getMockRutas();
    }

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
    console.warn("[obtenerRutas] Fallback mock:", error);
    return getMockRutas();
  }
}

export async function crearRuta(formData: FormData) {
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

// ==========================================
// MOCKS PARA DESARROLLO LOCAL
// ==========================================

function getMockInventario() {
  return {
    success: true,
    data: {
      insumos: [
        { id: "ins-1", codigo: "INS-CAFE", nombre: "Café Soluble Liofilizado (kg)", unidadMedida: "KG", stockActual: 48.5, stockMinimo: 10, costoPromedio: 42000 },
        { id: "ins-2", codigo: "INS-LECHE", nombre: "Leche en Polvo Vending (kg)", unidadMedida: "KG", stockActual: 74.2, stockMinimo: 15, costoPromedio: 28000 },
        { id: "ins-3", codigo: "INS-COCOA", nombre: "Cocoa Chocolatada Vending (kg)", unidadMedida: "KG", stockActual: 38.0, stockMinimo: 8, costoPromedio: 24000 },
        { id: "ins-4", codigo: "INS-VASOS", nombre: "Vasos Térmicos 7oz (unidades)", unidadMedida: "UNIDADES", stockActual: 4620, stockMinimo: 1000, costoPromedio: 120 },
        { id: "ins-5", codigo: "INS-MEZCL", nombre: "Mezcladores de Café (unidades)", unidadMedida: "UNIDADES", stockActual: 4850, stockMinimo: 1000, costoPromedio: 30 },
      ],
      movimientos: [
        { id: "mov-1", insumoNombre: "Café Soluble Liofilizado (kg)", tipo: "ENTRADA_COMPRA", cantidad: 20, costoUnitario: 42000, referencia: "FAC-8902 - Colcafé", fecha: new Date().toISOString() },
        { id: "mov-2", insumoNombre: "Leche en Polvo Vending (kg)", tipo: "ENTRADA_COMPRA", cantidad: 50, costoUnitario: 28000, referencia: "FAC-4412 - Alquería", fecha: new Date(Date.now() - 86400000).toISOString() },
      ],
    },
  };
}

function getMockRuteros() {
  return {
    success: true,
    data: [
      { id: "operador-default-1", name: "Carlos Mendoza", email: "carlos.operador@vendytrack.com", rutas: ["Ruta 1 - Clínicas y Hospitales Norte"], createdAt: new Date().toISOString() },
      { id: "operador-2", name: "Javier Morales", email: "javier.ruta@vendytrack.com", rutas: ["Ruta 2 - Oficinas Calle 72"], createdAt: new Date().toISOString() },
    ],
  };
}

function getMockClientes() {
  return {
    success: true,
    data: [
      {
        id: "cli-demo-01",
        razonSocial: "Hospital Universitario San José",
        sede: "Sede Centro",
        direccion: "Calle 10 # 5-22",
        contacto: "Dra. Claudia Pérez",
        whatsapp: "+573005559876",
        maquinas: [
          {
            id: "maq-demo-01",
            codigoSerial: "MAQ-COL-2024-089",
            modelo: "Bianchi Soluble 4 Tolvas",
            ubicacion: "Cafetería Principal Piso 2",
            numeroProductos: 4,
            rutaNombre: "Ruta 1 - Clínicas y Hospitales Norte",
            configuraciones: [
              { id: "cfg-1", bebida: "CAFE_LARGO_TINTO", activa: true, gramosCafe: 2.2, gramosLeche: 0, gramosCocoa: 0, precio: 1800 },
              { id: "cfg-2", bebida: "CAFE_CORTO_EXPRESO", activa: true, gramosCafe: 2.0, gramosLeche: 0, gramosCocoa: 0, precio: 1800 },
              { id: "cfg-3", bebida: "CAPUCHINO_TRADICIONAL", activa: true, gramosCafe: 2.0, gramosLeche: 12.0, gramosCocoa: 0, precio: 2500 },
              { id: "cfg-4", bebida: "CHOCOLATE_CHOCOMILK", activa: true, gramosCafe: 0, gramosLeche: 6.0, gramosCocoa: 16.0, precio: 2400 },
              { id: "cfg-5", bebida: "CAPUCHINO_VAINILLA", activa: false, gramosCafe: 1.8, gramosLeche: 12.0, gramosCocoa: 0, precio: 2500 },
              { id: "cfg-6", bebida: "MOCACCINO", activa: false, gramosCafe: 1.8, gramosLeche: 8.0, gramosCocoa: 10.0, precio: 2800 },
              { id: "cfg-7", bebida: "LATTE", activa: false, gramosCafe: 1.5, gramosLeche: 15.0, gramosCocoa: 0, precio: 2600 },
            ],
          },
        ],
      },
      {
        id: "cli-demo-02",
        razonSocial: "Edificio Corporativo Torre 100",
        sede: "Chicó Norte",
        direccion: "Cra 15 # 100-11",
        contacto: "Ing. Mauricio Gómez",
        whatsapp: "+573108884433",
        maquinas: [
          {
            id: "maq-demo-02",
            codigoSerial: "MAQ-COL-2024-112",
            modelo: "Necta Brio 3 Tolvas",
            ubicacion: "Lobby Recepción",
            numeroProductos: 6,
            rutaNombre: "Ruta 2 - Oficinas Calle 72",
            configuraciones: [
              { id: "cfg-8", bebida: "CAFE_LARGO_TINTO", activa: true, gramosCafe: 2.0, gramosLeche: 0, gramosCocoa: 0, precio: 2000 },
              { id: "cfg-9", bebida: "CAFE_CORTO_EXPRESO", activa: true, gramosCafe: 2.0, gramosLeche: 0, gramosCocoa: 0, precio: 2000 },
              { id: "cfg-10", bebida: "CAPUCHINO_TRADICIONAL", activa: true, gramosCafe: 2.0, gramosLeche: 12.0, gramosCocoa: 0, precio: 3000 },
              { id: "cfg-11", bebida: "CAPUCHINO_VAINILLA", activa: true, gramosCafe: 1.8, gramosLeche: 12.0, gramosCocoa: 0, precio: 3000 },
              { id: "cfg-12", bebida: "MOCACCINO", activa: true, gramosCafe: 1.8, gramosLeche: 8.0, gramosCocoa: 10.0, precio: 3200 },
              { id: "cfg-13", bebida: "LATTE", activa: true, gramosCafe: 1.5, gramosLeche: 15.0, gramosCocoa: 0, precio: 3000 },
              { id: "cfg-14", bebida: "CHOCOLATE_CHOCOMILK", activa: false, gramosCafe: 0, gramosLeche: 6.0, gramosCocoa: 16.0, precio: 2800 },
            ],
          },
        ],
      },
    ],
  };
}

function getMockRutas() {
  return {
    success: true,
    data: [
      {
        id: "ruta-01",
        nombre: "Ruta 1 - Clínicas y Hospitales Norte",
        descripcion: "Atención de puntos hospitalarios y clínicas",
        diasFrecuencia: "LUN-MIE-VIE",
        operadorId: "operador-default-1",
        operadorNombre: "Carlos Mendoza",
        maquinas: [
          { id: "maq-demo-01", codigoSerial: "MAQ-COL-2024-089", clienteNombre: "Hospital Universitario San José", sede: "Sede Centro", ubicacion: "Cafetería Principal Piso 2" },
        ],
      },
      {
        id: "ruta-02",
        nombre: "Ruta 2 - Oficinas Calle 72",
        descripcion: "Centros empresariales y entidades financieras",
        diasFrecuencia: "MAR-JUE-SAB",
        operadorId: "operador-2",
        operadorNombre: "Javier Morales",
        maquinas: [
          { id: "maq-demo-02", codigoSerial: "MAQ-COL-2024-112", clienteNombre: "Edificio Corporativo Torre 100", sede: "Chicó Norte", ubicacion: "Lobby Recepción" },
        ],
      },
    ],
  };
}
