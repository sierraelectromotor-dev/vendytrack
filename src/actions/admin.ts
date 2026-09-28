"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { BEBIDAS_CATALOGO } from "@/types/liquidacion";
import { TipoBebida, Rol, UnidadMedida } from "@prisma/client";
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
// 1. INVENTARIO DE BODEGA & KÃRDEX
// ==========================================

export async function obtenerInventarioBodega() {
  const currentUser = await requireAdmin();

  try {
    const insumos = await prisma.insumo.findMany({
        where: { empresaId: currentUser.empresaId },
        orderBy: { nombre: "asc" },
    });

    const movimientos = await prisma.movimientoInventario.findMany({
        where: { empresaId: currentUser.empresaId },
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
          precioVenta: i.precioVenta ? Number(i.precioVenta) : null,
        })),
        movimientos: movimientos.map((m) => ({
          id: m.id,
          insumoNombre: m.insumo.nombre,
          unidadMedida: m.insumo.unidadMedida,
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
      success: false,
      error: 'Error al consultar datos.',
      data: {
        insumos: [],
        movimientos: [],
      },
    };
  }
}

export async function registrarEntradaBodega(formData: FormData) {
  const currentUser = await requireAdmin();

  try {
    const insumoId = formData.get("insumoId")?.toString();
    const cantidad = parseFloat(formData.get("cantidad")?.toString() || "0");
    const costoUnitario = parseFloat(formData.get("costoUnitario")?.toString() || "0");
    const proveedor = formData.get("proveedor")?.toString() || "Proveedor General";
    const referencia = formData.get("referencia")?.toString() || `COMPRA-${Date.now()}`;
    const numeroLote = formData.get("numeroLote")?.toString()?.trim();
    const fechaVencimientoStr = formData.get("fechaVencimiento")?.toString();
    const fechaVencimiento = fechaVencimientoStr ? new Date(fechaVencimientoStr) : null;

    if (!insumoId || cantidad <= 0 || costoUnitario <= 0 || !numeroLote || !fechaVencimiento) {
      return { success: false, error: "Datos de entrada invÃ¡lidos. Todos los campos (incluyendo lote y fecha) son obligatorios." };
    }

    await prisma.$transaction(async (tx) => {
      const insumo = await tx.insumo.findUnique({ where: { id: insumoId } });
      if (!insumo) throw new Error("Insumo no encontrado");

      // 1. Obtener o crear Bodega Principal
      let bodegaPrincipal = await tx.bodega.findFirst({
        where: {
            empresaId: currentUser.empresaId,
            maquinaId: null },
      });
      if (!bodegaPrincipal) {
        bodegaPrincipal = await tx.bodega.create({
          data: {
              empresaId: currentUser.empresaId,
            nombre: "Bodega Principal",
            tipo: "PRINCIPAL",
          },
        });
      }

      // 2. Obtener o crear Lote
      const lote = await tx.lote.upsert({
        where: {
          numeroLote_insumoId: { insumoId, numeroLote },
        },
        update: {
          ...(fechaVencimiento ? { fechaVencimiento } : {}),
        },
        create: {
            empresaId: currentUser.empresaId,
            insumoId,
          numeroLote,
          fechaVencimiento: fechaVencimiento!,
        },
      });

      // 3. Actualizar o crear Existencia
      const existencia = await tx.existencia.findFirst({
        where: {
            empresaId: currentUser.empresaId,
            bodegaId: bodegaPrincipal.id,
          insumoId: insumoId,
          loteId: lote.id,
        },
      });

      if (existencia) {
        await tx.existencia.update({
          where: {
              empresaId: currentUser.empresaId,
            id: existencia.id },
          data: {
            cantidad: Number(existencia.cantidad) + cantidad,
          },
        });
      } else {
        await tx.existencia.create({
          data: {
              empresaId: currentUser.empresaId,
            bodegaId: bodegaPrincipal.id,
            insumoId: insumoId,
            loteId: lote.id,
            cantidad: cantidad,
          },
        });
      }

      const stockPrevio = Number(insumo.stockActual);
      const costoPrevio = Number(insumo.costoPromedio);
      const nuevoStock = stockPrevio + cantidad;
      const nuevoCostoPromedio =
        nuevoStock > 0
          ? (stockPrevio * costoPrevio + cantidad * costoUnitario) / nuevoStock
          : costoUnitario;

      // 4. Actualizar stock y costo promedio (cache global)
      await tx.insumo.update({
        where: {
            empresaId: currentUser.empresaId,
            id: insumoId },
        data: {
          stockActual: nuevoStock,
          costoPromedio: nuevoCostoPromedio,
        },
      });

      // 5. Registrar movimiento de entrada en KÃ¡rdex
      await tx.movimientoInventario.create({
        data: {
            empresaId: currentUser.empresaId,
            insumoId,
          bodegaDestinoId: bodegaPrincipal.id,
          loteId: lote.id,
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

export async function crearInsumo(formData: FormData) {
  const currentUser = await requireAdmin();

  try {
    const nombre = formData.get("nombre")?.toString().trim();
    let codigo = formData.get("codigo")?.toString().trim().toUpperCase();
    const unidadMedida = (formData.get("unidadMedida")?.toString() || "KG") as UnidadMedida;
    const stockInicial = parseFloat(formData.get("stockInicial")?.toString() || "0");
    const stockMinimo = parseFloat(formData.get("stockMinimo")?.toString() || "0");
    const costoPromedio = parseFloat(formData.get("costoPromedio")?.toString() || "0");
    const precioVenta = parseFloat(formData.get("precioVenta")?.toString() || "0");
    const facturaCompra = formData.get("facturaCompra")?.toString().trim();

    if (!nombre) {
      return { success: false, error: "El nombre del insumo es obligatorio" };
    }

    if (!codigo) {
      // Auto-generar cÃ³digo a partir del nombre si no se especifica
      codigo = `INS-${nombre.replace(/[^a-zA-Z0-9]/g, "-").toUpperCase().slice(0, 15)}`;
    }

    const existe = await prisma.insumo.findUnique({
      where: { codigo },
    });

    if (existe) {
      return { success: false, error: `Ya existe un insumo con el cÃ³digo ${codigo}` };
    }

    await prisma.$transaction(async (tx) => {
      const insumo = await tx.insumo.create({
        data: {
            empresaId: currentUser.empresaId,
            nombre,
          codigo,
          unidadMedida,
          stockMinimo,
          stockActual: stockInicial,
          costoPromedio,
          precioVenta: precioVenta > 0 ? precioVenta : null,
        },
      });

      if (stockInicial > 0) {
        await tx.movimientoInventario.create({
          data: {
              empresaId: currentUser.empresaId,
            insumoId: insumo.id,
            tipo: "ENTRADA_COMPRA",
            cantidad: stockInicial,
            costoUnitario: costoPromedio > 0 ? costoPromedio : null,
            referencia: facturaCompra
              ? `Factura Compra #${facturaCompra}`
              : "Saldo Inicial de Bodega",
          },
        });
      }
    });

    revalidatePath("/admin/inventario");
    return { success: true };
  } catch (error: any) {
    console.error("[crearInsumo] Error:", error);
    return { success: false, error: error.message || "Error al crear insumo" };
  }
}

export async function editarInsumo(formData: FormData) {
  const currentUser = await requireAdmin();

  try {
    const id = formData.get("id")?.toString();
    const nombre = formData.get("nombre")?.toString().trim();
    const codigo = formData.get("codigo")?.toString().trim().toUpperCase();
    const unidadMedida = (formData.get("unidadMedida")?.toString() || "KG") as UnidadMedida;
    const stockActual = parseFloat(formData.get("stockActual")?.toString() || "0");
    const stockMinimo = parseFloat(formData.get("stockMinimo")?.toString() || "0");
    const costoPromedio = parseFloat(formData.get("costoPromedio")?.toString() || "0");
    const precioVenta = parseFloat(formData.get("precioVenta")?.toString() || "0");

    if (!id || !nombre || !codigo) {
      return { success: false, error: "El ID, nombre y cÃ³digo del insumo son obligatorios" };
    }

    // Verificar si el cÃ³digo ya lo usa otro insumo distinto
    const codigoExistente = await prisma.insumo.findFirst({
      where: {
          empresaId: currentUser.empresaId,
        codigo,
        NOT: { id },
      },
    });

    if (codigoExistente) {
      return { success: false, error: `Ya existe otro insumo con el cÃ³digo ${codigo}` };
    }

    await prisma.insumo.update({
      where: {
          empresaId: currentUser.empresaId,
        id },
      data: {
        nombre,
        codigo,
        unidadMedida,
        stockActual,
        stockMinimo,
        costoPromedio,
        precioVenta: precioVenta > 0 ? precioVenta : null,
      },
    });

    revalidatePath("/admin/inventario");
    return { success: true };
  } catch (error: any) {
    console.error("[editarInsumo] Error:", error);
    return { success: false, error: error.message || "Error al actualizar insumo" };
  }
}

export async function eliminarInsumo(insumoId: string) {
  const currentUser = await requireAdmin();

  try {
    if (!insumoId) {
      return { success: false, error: "ID de insumo no proporcionado" };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar movimientos asociados en KÃ¡rdex
      await tx.movimientoInventario.deleteMany({
        where: {
            empresaId: currentUser.empresaId,
            insumoId },
      });

      // 2. Eliminar recetas asociadas
      await tx.recetaInsumo.deleteMany({
        where: {
            empresaId: currentUser.empresaId,
            insumoId },
      });

      // 3. Eliminar el insumo
      await tx.insumo.delete({
        where: { id: insumoId },
      });
    });

    revalidatePath("/admin/inventario");
    return { success: true };
  } catch (error: any) {
    console.error("[eliminarInsumo] Error:", error);
    return { success: false, error: error.message || "Error al eliminar insumo" };
  }
}

export async function cargarInsumosEstandar() {
  const currentUser = await requireAdmin();

  try {
    const standardInsumos = [
      {
        codigo: "INS-CAFE-SOLUBLE",
        nombre: "CafÃ© Soluble Liofilizado",
        unidadMedida: "KG" as UnidadMedida,
        stockMinimo: 5,
        costoPromedio: 42000,
      },
      {
        codigo: "INS-PREM-CAPUCHINO-VAINILLA",
        nombre: "Premezcla Capuchino Vainilla",
        unidadMedida: "KG" as UnidadMedida,
        stockMinimo: 5,
        costoPromedio: 26000,
      },
      {
        codigo: "INS-PREM-CAPUCHINO-TRAD",
        nombre: "Premezcla Capuchino Tradicional",
        unidadMedida: "KG" as UnidadMedida,
        stockMinimo: 5,
        costoPromedio: 26000,
      },
      {
        codigo: "INS-PREM-MOCACCINO",
        nombre: "Premezcla Mocaccino",
        unidadMedida: "KG" as UnidadMedida,
        stockMinimo: 5,
        costoPromedio: 27000,
      },
      {
        codigo: "INS-PREM-CHOCOLATE",
        nombre: "Premezcla Chocolate Vending",
        unidadMedida: "KG" as UnidadMedida,
        stockMinimo: 5,
        costoPromedio: 24000,
      },
      {
        codigo: "INS-LECHE-POLVO",
        nombre: "Leche en Polvo Vending",
        unidadMedida: "KG" as UnidadMedida,
        stockMinimo: 10,
        costoPromedio: 28000,
      },
      {
        codigo: "INS-COCOA",
        nombre: "Cocoa Chocolatada Vending",
        unidadMedida: "KG" as UnidadMedida,
        stockMinimo: 5,
        costoPromedio: 24000,
      },
      {
        codigo: "INS-VASOS-7OZ",
        nombre: "Vasos TÃ©rmicos 7oz",
        unidadMedida: "UNIDADES" as UnidadMedida,
        stockMinimo: 500,
        costoPromedio: 120,
      },
      {
        codigo: "INS-MEZCLADORES",
        nombre: "Mezcladores de CafÃ©",
        unidadMedida: "UNIDADES" as UnidadMedida,
        stockMinimo: 500,
        costoPromedio: 30,
      },
    ];

    let creados = 0;
    for (const item of standardInsumos) {
      const existe = await prisma.insumo.findUnique({
        where: { codigo: item.codigo },
      });

      if (!existe) {
        await prisma.insumo.create({
          data: {
              empresaId: currentUser.empresaId,
            codigo: item.codigo,
            nombre: item.nombre,
            unidadMedida: item.unidadMedida,
            stockActual: 0,
            stockMinimo: item.stockMinimo,
            costoPromedio: item.costoPromedio,
          },
        });
        creados++;
      }
    }

    revalidatePath("/admin/inventario");
    return { success: true, creados };
  } catch (error: any) {
    console.error("[cargarInsumosEstandar] Error:", error);
    return { success: false, error: error.message || "Error al cargar insumos estÃ¡ndar" };
  }
}

// ==========================================
// 2. GESTIÃ“N DE RUTEROS Y ADMINISTRADORES
// ==========================================

export async function obtenerUsuarios() {
  const currentUser = await requireAdmin();

  try {
    const whereClause: any = {
      empresaId: currentUser.empresaId,
    };
    if (currentUser.rol !== "SUPERADMIN") {
      whereClause.rol = { not: "SUPERADMIN" };
    }

    const usuarios = await prisma.user.findMany({
      where: whereClause,
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
      success: false,
      error: 'Error al consultar datos.',
      data: [],
    };
  }
}

export async function obtenerRuteros() {
  const currentUser = await requireAdmin();

  try {
    const ruteros = await prisma.user.findMany({
      where: {
        empresaId: currentUser.empresaId,
        rol: "OPERADOR_RUTA",
      },
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
      success: false,
      error: 'Error al consultar datos.',
      data: [],
    };
  }
}

export async function crearUsuario(formData: FormData) {
  const currentUser = await requireAdmin();

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
        empresaId: currentUser.empresaId,
        name,
        email,
        passwordHash: await hashPassword(password.trim()),
        rol,
      },
    });

    revalidatePath("/admin/ruteros");
    return { success: true };
  } catch (error: any) {
    console.error("[crearUsuario] Error:", error);
    return { success: false, error: "El correo ya estÃ¡ en uso o ocurriÃ³ un error" };
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

    // Solo un administrador, superadmin o el propio usuario pueden editar este perfil
    if (currentUser.rol !== "ADMIN" && currentUser.rol !== "SUPERADMIN" && currentUser.id !== id) {
      return { success: false, error: "No tienes permisos para modificar este usuario." };
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return { success: false, error: "Usuario no encontrado" };
    }

    if (currentUser.rol !== "SUPERADMIN") {
      if (targetUser.rol === "SUPERADMIN") {
        return { success: false, error: "No tienes permisos para modificar al Super Administrador." };
      }
      if (targetUser.empresaId !== currentUser.empresaId) {
        return { success: false, error: "No tienes permisos para modificar usuarios de otra empresa." };
      }
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
    if (currentUser.rol === "ADMIN" && email && email.trim()) {
      updateData.email = email.trim().toLowerCase();
    }
    if (password && password.trim()) {
      updateData.passwordHash = await hashPassword(password.trim());
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Si el usuario actualizado es el usuario logueado actualmente, refrescar cookie de sesiÃ³n
    if (currentUser.id === id) {
      await setSessionCookie({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        rol: updatedUser.rol as any,
        clienteId: updatedUser.clienteId,
        empresaId: updatedUser.empresaId,
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
  const currentUser = await requireAdmin();

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

    // NUNCA permitir eliminar la cuenta de Super Administrador
    if (user.rol === "SUPERADMIN") {
      return {
        success: false,
        error: "Acceso denegado: No se puede eliminar la cuenta de Super Administrador.",
      };
    }

    // Proteger aislamiento por empresa: No puede eliminar usuarios de otra empresa
    if (currentUser.rol !== "SUPERADMIN" && user.empresaId !== currentUser.empresaId) {
      return {
        success: false,
        error: "No tienes permiso para eliminar usuarios pertenecientes a otra empresa.",
      };
    }

    // No permitir eliminarse a sí mismo
    if (user.id === currentUser.id) {
      return {
        success: false,
        error: "No puedes eliminar tu propio usuario mientras mantienes la sesión activa.",
      };
    }

    // Proteger si es el único administrador de esta empresa
    if (user.rol === "ADMIN") {
      const totalAdmins = await prisma.user.count({
        where: {
          empresaId: user.empresaId,
          rol: "ADMIN",
        },
      });
      if (totalAdmins <= 1) {
        return {
          success: false,
          error: "No puedes eliminar el único administrador de la empresa.",
        };
      }
    }

    if (user.liquidaciones.length > 0) {
      return {
        success: false,
        error: `No es posible eliminar al usuario porque tiene ${user.liquidaciones.length} liquidaciones asociadas en el historial. Puedes editar su nombre o contraseÃ±a si ya no labora en la empresa.`,
      };
    }

    // Si tiene rutas asignadas, desasignarlas primero
    if (user.rutasAsignadas.length > 0) {
      await prisma.ruta.updateMany({
        where: {
            empresaId: currentUser.empresaId,
            operadorId: id },
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
// 3. GESTIÃ“N DE CLIENTES Y MÃQUINAS
// ==========================================

export async function obtenerClientes() {
  const currentUser = await requireAdmin();

  try {
    const [clientes, maquinasSinAsignar, insumos] = await Promise.all([
      prisma.cliente.findMany({
          where: { empresaId: currentUser.empresaId },
        include: {
          maquinas: {
            where: {
              activa: true,
            },
            include: {
              ruta: true,
              configuraciones: true,
              liquidaciones: {
                orderBy: { fecha: "desc" },
                take: 1,
                include: { detalles: true },
              },
              bodega: {
                include: {
                  existencias: {
                    include: {
                      insumo: true,
                    },
                  },
                },
              },
            },
            orderBy: { codigoSerial: "asc" },
          },
        },
        orderBy: { razonSocial: "asc" },
      }),
      prisma.maquina.findMany({ where:  {
          OR: [
            { clienteId: null as any },
            { activa: false },
          ],
        } as any, include: { cliente: true, ruta: true, configuraciones: true, liquidaciones: { orderBy: { fecha: "desc" }, take: 1, include: { detalles: true } }, bodega: { include: { existencias: { include: { insumo: true } } } } },
        orderBy: { codigoSerial: "asc" },
      }),
      prisma.insumo.findMany({
          where: { empresaId: currentUser.empresaId },
        orderBy: { nombre: "asc" },
      }),
    ]);

    const insumosMap = new Map(insumos.map((i) => [i.id, i.nombre]));

    const mapMaquina = (m: any) => {
      const ultimaLiq = m.liquidaciones?.[0];
      const mapaUltimosContadores: Record<string, number> = {};
      if (ultimaLiq && ultimaLiq.detalles) {
        for (const d of ultimaLiq.detalles) {
          mapaUltimosContadores[d.bebida] = d.contadorActual;
        }
      }

      const ahora = new Date();
      const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
      const liquidadaHoy = ultimaLiq ? new Date(ultimaLiq.fecha) >= inicioHoy : false;

      return {
        id: m.id,
        codigoSerial: m.codigoSerial,
        modelo: m.modelo,
        ubicacion: m.ubicacion,
        latitud: (m as any).latitud ?? null,
        longitud: (m as any).longitud ?? null,
        numeroProductos: m.numeroProductos,
        contadorActual: (m as any).contadorActual ?? 0,
        clienteId: m.clienteId,
        clienteNombre: m.cliente ? `${m.cliente.razonSocial} (${m.cliente.sede})` : null,
        rutaId: m.rutaId,
        rutaNombre: m.ruta?.nombre || "Sin Ruta Asignada",
        activa: m.activa,
        liquidadaHoy,
        ultimoConsecutivo: ultimaLiq?.consecutivo ?? null,
        ultimaLiquidacionId: ultimaLiq?.id ?? null,
        configuraciones: m.configuraciones.map((cfg: any) => {
          const ultimo = mapaUltimosContadores[cfg.bebida] ?? cfg.contadorInicial ?? 0;
          const insumoId = (cfg as any).insumoId || null;
          return {
            id: cfg.id,
            bebida: cfg.bebida,
            activa: cfg.activa,
            contadorInicial: (cfg as any).contadorInicial ?? 0,
            ultimoContador: ultimo,
            insumoId,
            insumoNombre: insumoId ? insumosMap.get(insumoId) || null : null,
            gramosPorTaza: Number((cfg as any).gramosPorTaza || 0),
            gramosCafe: Number(cfg.gramosCafe || 0),
            gramosLeche: Number(cfg.gramosLeche || 0),
            gramosCocoa: Number(cfg.gramosCocoa || 0),
            precio: Number(cfg.precio),
          };
        }),
        bodega: m.bodega ? {
          id: m.bodega.id,
          existencias: m.bodega.existencias.map((e: any) => ({
            id: e.id,
            insumoId: e.insumoId,
            insumoNombre: e.insumo.nombre,
            cantidad: Number(e.cantidad),
            unidadMedida: e.insumo.unidadMedida,
          })),
        } : null,
      };
    };

    return {
      success: true,
      data: clientes.map((c) => ({
        id: c.id,
        razonSocial: c.razonSocial,
        sede: c.sede,
        direccion: c.direccion,
        contacto: c.contacto,
        whatsapp: c.whatsapp,
        activo: c.activo,
        latitud: c.latitud,
        longitud: c.longitud,
        maquinas: c.maquinas.map(mapMaquina),
      })),
      maquinasSinAsignar: maquinasSinAsignar.map(mapMaquina),
      insumos: insumos.map((i) => ({
        id: i.id,
        nombre: i.nombre,
        codigo: i.codigo,
        unidadMedida: i.unidadMedida,
        stockActual: Number(i.stockActual),
      })),
    };
  } catch (error) {
    console.error("[obtenerClientes] Error:", error);
    return {
      success: false,
      error: 'Error al consultar datos.',
      data: [],
      maquinasSinAsignar: [],
      insumos: [],
    };
  }
}

export async function crearCliente(formData: FormData) {
  const currentUser = await requireAdmin();

  try {
    const razonSocial = formData.get("razonSocial")?.toString().trim();
    const sede = formData.get("sede")?.toString().trim();
    const direccion = formData.get("direccion")?.toString().trim();
    const contacto = formData.get("contacto")?.toString().trim();
    const whatsapp = formData.get("whatsapp")?.toString().trim();
    const latitudStr = formData.get("latitud")?.toString();
    const longitudStr = formData.get("longitud")?.toString();
    const latitud = latitudStr && !isNaN(parseFloat(latitudStr)) ? parseFloat(latitudStr) : null;
    const longitud = longitudStr && !isNaN(parseFloat(longitudStr)) ? parseFloat(longitudStr) : null;

    if (!razonSocial || !sede || !direccion || !contacto || !whatsapp) {
      return { success: false, error: "Todos los campos son obligatorios" };
    }

    await prisma.cliente.create({
      data: {
          empresaId: currentUser.empresaId,
        razonSocial,
        sede,
        direccion,
        contacto,
        whatsapp,
        latitud,
        longitud,
      },
    });

    revalidatePath("/admin/clientes");
    return { success: true };
  } catch (error: any) {
    console.error("[crearCliente] Error:", error);
    return { success: false, error: error.message || "Error al crear cliente" };
  }
}

export async function actualizarCliente(formData: FormData) {
  const currentUser = await requireAdmin();

  try {
    const id = formData.get("id")?.toString();
    const razonSocial = formData.get("razonSocial")?.toString().trim();
    const sede = formData.get("sede")?.toString().trim();
    const direccion = formData.get("direccion")?.toString().trim();
    const contacto = formData.get("contacto")?.toString().trim();
    const whatsapp = formData.get("whatsapp")?.toString().trim();
    const activo = formData.get("activo") === "true" || formData.get("activo") === "on";
    const latitudStr = formData.get("latitud")?.toString();
    const longitudStr = formData.get("longitud")?.toString();
    const latitud = latitudStr && !isNaN(parseFloat(latitudStr)) ? parseFloat(latitudStr) : null;
    const longitud = longitudStr && !isNaN(parseFloat(longitudStr)) ? parseFloat(longitudStr) : null;

    if (!id || !razonSocial || !sede || !direccion || !contacto || !whatsapp) {
      return { success: false, error: "Todos los campos son obligatorios" };
    }

    await prisma.cliente.update({
      where: {
          empresaId: currentUser.empresaId,
        id },
      data: {
        razonSocial,
        sede,
        direccion,
        contacto,
        whatsapp,
        activo,
        latitud,
        longitud,
      },
    });

    revalidatePath("/admin/clientes");
    return { success: true };
  } catch (error: any) {
    console.error("[actualizarCliente] Error:", error);
    return { success: false, error: error.message || "Error al actualizar cliente" };
  }
}

export async function eliminarCliente(clienteId: string) {
  const currentUser = await requireAdmin();

  try {
    if (!clienteId) {
      return { success: false, error: "ID de cliente no especificado" };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Desvincular mÃ¡quinas asociadas y enviarlas a bodega
      await tx.maquina.updateMany({
        where: {
            empresaId: currentUser.empresaId,
            clienteId },
        data: {
          clienteId: null,
          activa: false,
          rutaId: null,
          ubicacion: "En Bodega / Taller",
        } as any,
      });

      // 2. Desvincular usuarios asignados a este cliente
      await tx.user.updateMany({
        where: { clienteId },
        data: { clienteId: null },
      });

      // 3. Borrado lÃ³gico en vez de fÃ­sico
      await tx.cliente.update({
        where: {
            empresaId: currentUser.empresaId,
            id: clienteId },
        data: { activo: false },
      });
    });

    revalidatePath("/admin/clientes");
    revalidatePath("/admin");
    return { success: true, message: "Cliente eliminado correctamente" };
  } catch (error: any) {
    console.error("[eliminarCliente] Error:", error);
    return { success: false, error: error.message || "Error al eliminar el cliente" };
  }
}

export async function crearMaquina(formData: FormData) {
  const currentUser = await requireAdmin();

  try {
    const codigoSerial = formData.get("codigoSerial")?.toString().trim();
    const modelo = formData.get("modelo")?.toString().trim();
    const ubicacion = formData.get("ubicacion")?.toString().trim() || "En Bodega";
    const rawClienteId = formData.get("clienteId")?.toString();
    const clienteId = rawClienteId && rawClienteId !== "none" ? rawClienteId : null;
    const rutaId = formData.get("rutaId")?.toString() || null;
    const numeroProductos = parseInt(formData.get("numeroProductos")?.toString() || "4", 10);
    const contadorActual = parseInt(formData.get("contadorActual")?.toString() || "0", 10);
    const bebidasJson = formData.get("bebidasJson")?.toString();
    const latitudRaw = formData.get("latitud")?.toString()?.trim();
    const longitudRaw = formData.get("longitud")?.toString()?.trim();
    const latitud = latitudRaw && !isNaN(parseFloat(latitudRaw)) ? parseFloat(latitudRaw) : null;
    const longitud = longitudRaw && !isNaN(parseFloat(longitudRaw)) ? parseFloat(longitudRaw) : null;

    if (!codigoSerial || !modelo) {
      return { success: false, error: "CÃ³digo serial y modelo son obligatorios" };
    }

    const nuevaMaquina = await prisma.maquina.create({
      data: {
        codigoSerial,
        modelo,
        ubicacion,
        numeroProductos,
        contadorActual: isNaN(contadorActual) ? 0 : contadorActual,
        clienteId,
        rutaId: rutaId && rutaId !== "none" ? rutaId : null,
        activa: clienteId !== null,
        latitud,
        longitud,
        bodega: {
          create: {
            nombre: `Bodega Mq. ${codigoSerial}`,
            tipo: 'MAQUINA'
          }
        }
      } as any,
    });

    let configuracionesPersonalizadas: Array<{
      bebida: string;
      contadorInicial?: number;
      precio?: number;
      insumoId?: string | null;
      gramosPorTaza?: number;
      gramosCafe?: number;
      gramosLeche?: number;
      gramosCocoa?: number;
    }> | null = null;

    if (bebidasJson) {
      try {
        configuracionesPersonalizadas = JSON.parse(bebidasJson);
      } catch (e) {
        console.error("Error parseando bebidasJson:", e);
      }
    }

    if (configuracionesPersonalizadas && configuracionesPersonalizadas.length > 0) {
      for (const c of configuracionesPersonalizadas) {
        await prisma.configBebidaMaquina.create({
          data: {
            maquinaId: nuevaMaquina.id,
            bebida: c.bebida as TipoBebida,
            activa: true,
            contadorInicial: c.contadorInicial ?? 0,
            insumoId: c.insumoId || null,
            gramosPorTaza: c.gramosPorTaza ?? 0,
            gramosCafe: c.gramosCafe ?? 0,
            gramosLeche: c.gramosLeche ?? 0,
            gramosCocoa: c.gramosCocoa ?? 0,
            precio: c.precio ?? 2500,
          } as any,
        });
      }
    } else {
      // CalibraciÃ³n por defecto si no se enviÃ³ bebidasJson
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
            contadorInicial: 0,
            gramosCafe: c.cafe,
            gramosLeche: c.leche,
            gramosCocoa: c.cocoa,
            precio: c.precio,
          } as any,
        });
      }
    }

    revalidatePath("/admin/clientes");
    return { success: true };
  } catch (error: any) {
    console.error("[crearMaquina] Error:", error);
    return { success: false, error: error.message || "El serial ya existe o hubo un error" };
  }
}

export async function actualizarMaquina(data: {
  id: string;
  codigoSerial: string;
  modelo: string;
  ubicacion: string;
  clienteId?: string | null;
  rutaId?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  numeroProductos: number;
  bebidas?: Array<{
    bebida: string;
    activa: boolean;
    insumoId?: string | null;
    gramosPorTaza?: number;
    contadorInicial?: number;
    precio: number;
    gramosCafe?: number;
    gramosLeche?: number;
    gramosCocoa?: number;
  }>;
}) {
  const currentUser = await requireAdmin();

  try {
    const { id, codigoSerial, modelo, ubicacion, clienteId, rutaId, latitud, longitud, numeroProductos, bebidas } = data;

    if (!id || !codigoSerial || !modelo) {
      return { success: false, error: "Datos incompletos de la mÃ¡quina" };
    }

    const finalClienteId = clienteId && clienteId !== "none" ? clienteId : null;
    const finalActiva = finalClienteId !== null;

    await prisma.maquina.update({
      where: {
          empresaId: currentUser.empresaId,
        id },
      data: {
        codigoSerial,
        modelo,
        ubicacion: ubicacion || (finalClienteId ? "UbicaciÃ³n Principal" : "En Bodega / Taller"),
        clienteId: finalClienteId,
        activa: finalActiva,
        rutaId: rutaId && rutaId !== "none" ? rutaId : null,
        numeroProductos,
        latitud: typeof latitud === "number" ? latitud : latitud === null ? null : undefined,
        longitud: typeof longitud === "number" ? longitud : longitud === null ? null : undefined,
      } as any,
    });

    if (bebidas && bebidas.length > 0) {
      for (const b of bebidas) {
        await prisma.configBebidaMaquina.upsert({
          where: {
            maquinaId_bebida: {
              maquinaId: id,
              bebida: b.bebida as TipoBebida,
            },
          },
          update: {
            activa: b.activa,
            contadorInicial: b.contadorInicial ?? 0,
            precio: b.precio,
            insumoId: b.insumoId || null,
            gramosPorTaza: b.gramosPorTaza ?? 0,
            gramosCafe: b.gramosCafe ?? 0,
            gramosLeche: b.gramosLeche ?? 0,
            gramosCocoa: b.gramosCocoa ?? 0,
          } as any,
          create: {
            maquinaId: id,
            bebida: b.bebida as TipoBebida,
            activa: b.activa,
            contadorInicial: b.contadorInicial ?? 0,
            precio: b.precio,
            insumoId: b.insumoId || null,
            gramosPorTaza: b.gramosPorTaza ?? 0,
            gramosCafe: b.gramosCafe ?? 0,
            gramosLeche: b.gramosLeche ?? 0,
            gramosCocoa: b.gramosCocoa ?? 0,
          } as any,
        });
      }
    }

    revalidatePath("/admin/clientes");
    return { success: true };
  } catch (error: any) {
    console.error("[actualizarMaquina] Error:", error);
    return { success: false, error: error.message || "Error al actualizar la mÃ¡quina" };
  }
}

export async function asignarMaquinaACliente(data: {
  maquinaId: string;
  clienteId: string;
  ubicacion: string;
  rutaId?: string | null;
  contadores?: Record<string, number>;
}) {
  const currentUser = await requireAdmin();

  try {
    const { maquinaId, clienteId, ubicacion, rutaId, contadores } = data;

    if (!maquinaId || !clienteId) {
      return { success: false, error: "MÃ¡quina y cliente son obligatorios" };
    }

    await prisma.maquina.update({
      where: {
          empresaId: currentUser.empresaId,
        id: maquinaId },
      data: {
        clienteId,
        activa: true,
        ubicacion: ubicacion || "UbicaciÃ³n Principal",
        rutaId: rutaId && rutaId !== "none" ? rutaId : null,
      } as any,
    });

    if (contadores) {
      for (const [bebida, contador] of Object.entries(contadores)) {
        await prisma.configBebidaMaquina.updateMany({
          where: {
              empresaId: currentUser.empresaId,
            maquinaId,
            bebida: bebida as TipoBebida,
          },
          data: {
            contadorInicial: contador,
          } as any,
        });
      }
    }

    revalidatePath("/admin/clientes");
    return { success: true };
  } catch (error: any) {
    console.error("[asignarMaquinaACliente] Error:", error);
    return { success: false, error: error.message || "Error al asignar la mÃ¡quina al cliente" };
  }
}

export async function eliminarMaquina(maquinaId: string, accion: "eliminar" | "desasignar") {
  const currentUser = await requireAdmin();

  try {
    if (!maquinaId) {
      return { success: false, error: "ID de mÃ¡quina no especificado" };
    }

    if (accion === "desasignar") {
      // Enviar a bodega: desvincular cliente y ruta, marcar inactiva
      await prisma.maquina.update({
        where: {
            empresaId: currentUser.empresaId,
            id: maquinaId },
        data: {
          clienteId: null,
          activa: false,
          rutaId: null,
          ubicacion: "En Bodega / Taller",
        } as any,
      });
      revalidatePath("/admin/clientes");
      return { success: true, message: "MÃ¡quina desasignada y enviada a Bodega con Ã©xito" };
    }

    // AcciÃ³n eliminar: Borrado lÃ³gico
    await prisma.maquina.update({
      where: {
          empresaId: currentUser.empresaId,
        id: maquinaId },
      data: { activa: false },
    });

    revalidatePath("/admin/clientes");
    return { success: true, message: "MÃ¡quina eliminada (desactivada) correctamente" };
  } catch (error: any) {
    console.error("[eliminarMaquina] Error:", error);
    return { success: false, error: error.message || "Error al eliminar la mÃ¡quina" };
  }
}

export async function guardarCalibracionMaquina(
  maquinaId: string,
  configuraciones: Array<{
    bebida: string;
    activa: boolean;
    insumoId?: string | null;
    gramosPorTaza?: number;
    gramosCafe?: number;
    gramosLeche?: number;
    gramosCocoa?: number;
    precio: number;
  }>
) {
  const currentUser = await requireAdmin();

  try {
    for (const c of configuraciones) {
      await (prisma.configBebidaMaquina as any).upsert({
        where: {
          maquinaId_bebida: {
            maquinaId,
            bebida: c.bebida as TipoBebida,
          },
        },
        update: {
          activa: c.activa,
          insumoId: c.insumoId || null,
          gramosPorTaza: c.gramosPorTaza ?? 0,
          gramosCafe: c.gramosCafe ?? 0,
          gramosLeche: c.gramosLeche ?? 0,
          gramosCocoa: c.gramosCocoa ?? 0,
          precio: c.precio,
        },
        create: {
          maquinaId,
          bebida: c.bebida as TipoBebida,
          activa: c.activa,
          insumoId: c.insumoId || null,
          gramosPorTaza: c.gramosPorTaza ?? 0,
          gramosCafe: c.gramosCafe ?? 0,
          gramosLeche: c.gramosLeche ?? 0,
          gramosCocoa: c.gramosCocoa ?? 0,
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
    return { success: false, error: error.message || "Error al guardar calibraciÃ³n" };
  }
}

// ==========================================
// 4. CONFIGURACIÃ“N DE PRECIOS POR MÃQUINA
// ==========================================

export async function obtenerPreciosPorMaquina(maquinaId: string) {
  const currentUser = await requireAdmin();

  try {
    const precios = await prisma.precioMaquina.findMany({
      where: {
          empresaId: currentUser.empresaId,
        maquinaId },
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
  const currentUser = await requireAdmin();

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
            empresaId: currentUser.empresaId,
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
// 5. CONFIGURACIÃ“N DE RUTAS Y ASIGNACIÃ“N
// ==========================================

export async function obtenerRutas() {
  const currentUser = await requireAdmin();

  try {
    const rutas = await prisma.ruta.findMany({
        where: { empresaId: currentUser.empresaId },
        include: {
        operador: true,
        maquinas: { include: { cliente: true }, orderBy: { ordenRuta: 'asc' } },
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
          clienteNombre: m.cliente?.razonSocial || "En Bodega",
          sede: m.cliente?.sede || "Bodega",
          direccion: m.cliente?.direccion || "Calle 13 # 68-35",
          latitud: (m as any).latitud ?? m.cliente?.latitud ?? null,
          longitud: (m as any).longitud ?? m.cliente?.longitud ?? null,
          tieneGpsPropio: (m as any).latitud !== null && (m as any).latitud !== undefined,
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
  const currentUser = await requireAdmin();

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
          empresaId: currentUser.empresaId,
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
  const currentUser = await requireAdmin();

  try {
    await prisma.ruta.update({
      where: {
          empresaId: currentUser.empresaId,
        id: rutaId },
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
  const currentUser = await requireAdmin();

  try {
    await prisma.maquina.update({
      where: {
          empresaId: currentUser.empresaId,
        id: maquinaId },
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

export async function obtenerBodegaPrincipal() {
  const currentUser = await requireAdmin();

  try {
    let bodega = await prisma.bodega.findFirst({
      where: {
        empresaId: currentUser.empresaId,
        tipo: "PRINCIPAL",
      },
    });

    if (!bodega) {
      bodega = await prisma.bodega.create({
        data: {
          empresaId: currentUser.empresaId,
          nombre: "Bodega Principal VendyTrack",
          tipo: "PRINCIPAL",
          direccion: "Calle 13 # 68-35, Bogotá, Colombia",
          latitud: 4.64828,
          longitud: -74.11667,
          telefono: null,
        },
      });
    }

    return {
      success: true,
      data: {
        id: bodega.id,
        nombre: bodega.nombre,
        direccion: bodega.direccion || "Calle 13 # 68-35, Bogotá, Colombia",
        latitud: bodega.latitud ?? 4.64828,
        longitud: bodega.longitud ?? -74.11667,
        telefono: bodega.telefono,
      },
    };
  } catch (error: any) {
    console.error("[obtenerBodegaPrincipal] Error:", error);
    return {
      success: true,
      data: {
        id: "bodega-principal",
        nombre: "Bodega Principal VendyTrack",
        direccion: "Calle 13 # 68-35, Bogotá, Colombia",
        latitud: 4.64828,
        longitud: -74.11667,
        telefono: null,
      },
    };
  }
}

export async function guardarBodegaPrincipal(formData: FormData) {
  const currentUser = await requireAdmin();

  try {
    const nombre = (formData.get("nombre") as string)?.trim() || "Bodega Central";
    const direccion = (formData.get("direccion") as string)?.trim() || "";
    const latitudRaw = formData.get("latitud") as string;
    const longitudRaw = formData.get("longitud") as string;
    const telefono = (formData.get("telefono") as string)?.trim() || null;

    const latitud = latitudRaw ? parseFloat(latitudRaw) : 4.64828;
    const longitud = longitudRaw ? parseFloat(longitudRaw) : -74.11667;

    const existente = await prisma.bodega.findFirst({
      where: {
        empresaId: currentUser.empresaId,
        tipo: "PRINCIPAL",
      },
    });

    let bodega;
    if (existente) {
      bodega = await prisma.bodega.update({
        where: { id: existente.id },
        data: {
          nombre,
          direccion,
          latitud,
          longitud,
          telefono,
        },
      });
    } else {
      bodega = await prisma.bodega.create({
        data: {
          empresaId: currentUser.empresaId,
          nombre,
          tipo: "PRINCIPAL",
          direccion,
          latitud,
          longitud,
          telefono,
        },
      });
    }

    revalidatePath("/admin/rutas");
    revalidatePath("/admin/inventario");

    return {
      success: true,
      data: {
        id: bodega.id,
        nombre: bodega.nombre,
        direccion: bodega.direccion,
        latitud: bodega.latitud,
        longitud: bodega.longitud,
        telefono: bodega.telefono,
      },
    };
  } catch (error: any) {
    console.error("[guardarBodegaPrincipal] Error:", error);
    return { success: false, error: error.message || "Error al guardar bodega" };
  }
}

export async function geocodificarDireccion(direccion: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "No autorizado" };
  }

  if (!direccion || !direccion.trim()) {
    return { success: false, error: "Ingresa una dirección válida" };
  }

  try {
    const query = encodeURIComponent(direccion.trim() + ", Colombia");
    const res = await fetch(
      "https://nominatim.openstreetmap.org/search?format=json&q=" + query + "&limit=1",
      {
        headers: {
          "User-Agent": "VendyTrack-ERP/1.0 (contacto@vendytrack.com)",
          "Accept-Language": "es",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return { success: false, error: "Servicio de mapas no disponible (" + res.status + ")" };
    }

    const data = await res.json();
    if (data && data.length > 0) {
      return {
        success: true,
        data: {
          latitud: parseFloat(data[0].lat),
          longitud: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        },
      };
    }

    return {
      success: false,
      error: "No se encontraron coordenadas para esta dirección en Colombia. Puedes ingresarlas manualmente o usar el botón GPS.",
    };
  } catch (error) {
    console.error("[geocodificarDireccion] Error:", error);
    return {
      success: false,
      error: "Error al consultar coordenadas. Verifica tu conexión o ingresa las coordenadas manualmente.",
    };
  }
}

// ==========================================
// 6. DASHBOARD Y GESTIÃ“N DE RECAUDOS
// ==========================================

export async function obtenerDashboardRecaudos() {
  const currentUser = await requireAdmin();

  try {
    const liquidaciones = await prisma.liquidacion.findMany({
        where: { empresaId: currentUser.empresaId },
        include: {
        cliente: true,
        maquina: true,
        operador: true,
        detalles: true,
        cuentaCobrar: { include: { abonos: true } }
      },
      orderBy: { fecha: "desc" },
    });

    const ordenesDespacho = await prisma.ordenDespacho.findMany({
      where: {
          empresaId: currentUser.empresaId,
        tipo: "VENTA_BOLSA", estado: "ENTREGADA" },
      include: {
        cliente: true,
        maquina: true,
        operador: {
          select: { name: true }
        },
        detalles: { include: { insumo: true } },
        cuentaCobrar: { include: { abonos: true } }
      },
      orderBy: { fechaCreacion: "desc" }
    });

    const clientes = await prisma.cliente.findMany({
        where: { empresaId: currentUser.empresaId },
        select: {
        id: true,
        razonSocial: true,
        sede: true,
      },
      orderBy: { razonSocial: "asc" },
    });

    const todasCuentas = await prisma.cuentaCobrar.findMany({
      where: {
          empresaId: currentUser.empresaId,
        estadoPago: { not: "PAGADO_TOTAL" } },
      select: { saldoPendiente: true }
    });
    const carteraTotal = todasCuentas.reduce((acc, c) => acc + Number(c.saldoPendiente), 0);

    const transacciones = [
      ...liquidaciones.map((l) => {
        let efectivo = l.cuentaCobrar ? l.cuentaCobrar.abonos.filter(a => a.metodoPago === 'EFECTIVO').reduce((acc, a) => acc + Number(a.monto), 0) : (l.metodoPago === 'EFECTIVO' ? Number(l.totalFacturado) : 0);
        let transferencia = l.cuentaCobrar ? l.cuentaCobrar.abonos.filter(a => a.metodoPago === 'TRANSFERENCIA').reduce((acc, a) => acc + Number(a.monto), 0) : (l.metodoPago === 'TRANSFERENCIA' ? Number(l.totalFacturado) : 0);

        return {
          id: l.id,
          tipo: 'LIQUIDACION',
          consecutivo: l.consecutivo,
          fecha: l.fecha.toISOString(),
          clienteId: l.clienteId,
          clienteNombre: l.cliente.razonSocial,
          sede: l.cliente.sede,
          maquinaId: l.maquinaId,
          maquinaSerial: l.maquina.codigoSerial,
          maquinaModelo: l.maquina.modelo,
          ubicacion: l.maquina.ubicacion,
          operadorId: l.operadorId,
          operadorNombre: l.operador.name,
          metodoPago: l.metodoPago,
          totalFacturado: Number(l.totalFacturado),
          efectivoReales: efectivo,
          transferenciaReales: transferencia,
          reciboPdfUrl: (!l.reciboPdfUrl || l.reciboPdfUrl === 'upload-failed') ? `/api/liquidaciones/${l.id}/pdf` : l.reciboPdfUrl,
          totalTazas: l.detalles.reduce((acc, d) => acc + d.tazasNetas, 0),
        };
      }),
      ...ordenesDespacho.map((o) => {
        let efectivo = o.cuentaCobrar ? o.cuentaCobrar.abonos.filter(a => a.metodoPago === 'EFECTIVO').reduce((acc, a) => acc + Number(a.monto), 0) : 0;
        let transferencia = o.cuentaCobrar ? o.cuentaCobrar.abonos.filter(a => a.metodoPago === 'TRANSFERENCIA').reduce((acc, a) => acc + Number(a.monto), 0) : 0;

        return {
          id: o.id,
          tipo: 'VENTA_DIRECTA',
          consecutivo: o.consecutivo,
          fecha: o.fechaEntrega ? o.fechaEntrega.toISOString() : o.fechaCreacion.toISOString(),
          clienteId: o.clienteId,
          clienteNombre: o.cliente.razonSocial,
          sede: o.cliente.sede,
          maquinaId: o.maquinaId || '',
          maquinaSerial: o.maquina?.codigoSerial || 'N/A',
          maquinaModelo: o.maquina?.modelo || 'Venta Externa',
          ubicacion: o.maquina?.ubicacion || 'N/A',
          operadorId: o.operadorId,
          operadorNombre: o.operador.name || 'Desconocido',
          metodoPago: o.estadoPago === 'PENDIENTE' ? 'PENDIENTE' : 'MÃšLTIPLE',
          totalFacturado: Number(o.totalFacturado) || 0,
          efectivoReales: efectivo,
          transferenciaReales: transferencia,
          reciboPdfUrl: null,
          totalTazas: 0,
        };
      })
    ];

    // Ordenar por fecha descendente
    transacciones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return {
      success: true,
      data: {
        liquidaciones: transacciones,
        clientes: clientes.map((c) => ({
          id: c.id,
          nombre: `${c.razonSocial} (${c.sede})`,
        })),
        carteraTotal,
      },
    };
  } catch (error: any) {
    console.error("[obtenerDashboardRecaudos] Error:", error);
    return {
      success: true,
      data: {
        liquidaciones: [],
        clientes: [],
        carteraTotal: 0,
      },
    };
  }
}

// ==========================================
// 7. HABILITAR RE-LIQUIDACIÃ“N DE HOY (ANULACIÃ“N SEGURA)
// ==========================================

export async function habilitarReliquidacionHoy(maquinaId: string, liquidacionId?: string) {
  const currentUser = await requireAdmin();

  try {
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);

    // Buscar la liquidaciÃ³n de hoy para esta mÃ¡quina (o por ID especÃ­fico)
    const liqHoy = await prisma.liquidacion.findFirst({
      where: liquidacionId
        ? { id: liquidacionId }
        : {
            maquinaId,
            fecha: { gte: hoyInicio },
          },
      include: {
        detalles: true,
        movimientos: true,
      },
      orderBy: { fecha: "desc" },
    });

    if (!liqHoy) {
      return {
        success: false,
        error: "No se encontrÃ³ ninguna liquidaciÃ³n registrada hoy para esta mÃ¡quina.",
      };
    }

    // Revertir inventario si hubo movimientos de KÃ¡rdex asociados (SALIDA_CONSUMO)
    await prisma.$transaction(async (tx) => {
      for (const mov of liqHoy.movimientos) {
        if (
          mov.tipo === "SALIDA_TEORICA_LIQUIDACION" ||
          mov.tipo === "SALIDA_FISICA_REPOSICION"
        ) {
          await tx.insumo.update({
            where: {
                empresaId: currentUser.empresaId,
                id: mov.insumoId },
            data: {
              stockActual: {
                increment: mov.cantidad,
              },
            },
          });
        }
        await tx.movimientoInventario.delete({
          where: { id: mov.id },
        });
      }

      // Eliminar detalles de la liquidaciÃ³n
      await tx.detalleLiquidacion.deleteMany({
        where: {
            empresaId: currentUser.empresaId,
            liquidacionId: liqHoy.id },
      });

      // Eliminar la liquidaciÃ³n para permitir la nueva captura limpia
      await tx.liquidacion.delete({
        where: { id: liqHoy.id },
      });
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/clientes");
    revalidatePath("/liquidacion");

    return {
      success: true,
      message: `LiquidaciÃ³n LIQ-${liqHoy.consecutivo} anulada con Ã©xito. El inventario fue restaurado y la mÃ¡quina estÃ¡ habilitada nuevamente para que el operador registre la liquidaciÃ³n.`,
    };
  } catch (error: any) {
    console.error("[habilitarReliquidacionHoy] Error:", error);
    return {
      success: false,
      error: error.message || "Error al habilitar re-liquidaciÃ³n",
    };
  }
}





export async function eliminarRuta(rutaId: string) {
  const currentUser = await requireAdmin();
  try {
    await prisma.ruta.delete({
      where: { id: rutaId },
    });
    revalidatePath("/admin/rutas");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("[eliminarRuta] Error:", error);
    return { success: false, error: error.message };
  }
}

