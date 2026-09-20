"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { TipoTransaccion, CategoriaTransaccion, MetodoPago } from "@prisma/client";

export interface TransaccionUnificada {
  id: string;
  tipo: "INGRESO" | "GASTO";
  categoria: string;
  categoriaLabel: string;
  monto: number;
  fecha: string;
  descripcion: string;
  referencia?: string | null;
  metodoPago: string;
  esFijo?: boolean;
  esLiquidacion: boolean;
  reciboPdfUrl?: string | null;
  creadoPorNombre?: string | null;
}

export interface GastoFijoItem {
  id: string;
  concepto: string;
  categoria: string;
  categoriaLabel: string;
  monto: number;
  diaCobro: number;
  activo: boolean;
  descripcion?: string | null;
}

export interface PuntoEquilibrioData {
  gastosFijosTotales: number;
  ventasActuales: number;
  costosVariablesActuales: number;
  margenContribucionPct: number;
  puntoEquilibrioDinero: number;
  tazasActuales: number;
  precioPromedioTaza: number;
  costoVariablePromedioTaza: number;
  margenContribucionTaza: number;
  puntoEquilibrioTazas: number;
  porcentajeAlcanzado: number;
  diferenciaDinero: number;
  diferenciaTazas: number;
  estaEnEquilibrio: boolean;
}

export interface ResumenContable {
  totalIngresos: number;
  totalGastos: number;
  utilidadNeta: number;
  margenOperativo: number;
  transacciones: TransaccionUnificada[];
  desgloseGastos: {
    categoria: string;
    label: string;
    monto: number;
    porcentaje: number;
  }[];
  metodosPago: {
    efectivo: number;
    transferencia: number;
  };
  gastosFijos: GastoFijoItem[];
  puntoEquilibrio: PuntoEquilibrioData;
}

const LABELS_CATEGORIAS: Record<string, string> = {
  // Ingresos
  RECAUDO_LIQUIDACION: "Recaudo Liquidación Vending",
  VENTA_DIRECTA: "Venta Directa / Eventos",
  OTRO_INGRESO: "Otros Ingresos",

  // Gastos
  COMPRA_INSUMOS: "Compra de Insumos (Café, Leche, etc.)",
  COMBUSTIBLE_TRANSPORTE: "Combustible y Transporte",
  MANTENIMIENTO_REPUESTOS: "Mantenimiento y Repuestos",
  VIATICOS_ALIMENTACION: "Viáticos y Alimentación",
  NOMINA_HONORARIOS: "Nómina y Honorarios Ruteros",
  SERVICIOS_ARRIENDO: "Servicios Públicos y Arriendos",
  PUBLICIDAD_MARKETING: "Publicidad y Mercadeo",
  OTRO_GASTO: "Otros Gastos Operativos",
};

export async function obtenerResumenContable(filtros?: {
  mes?: number;
  anio?: number;
  tipo?: string;
  categoria?: string;
}): Promise<{ success: boolean; data?: ResumenContable; error?: string }> {
  await requireAdmin();

  try {
    const hoy = new Date();
    const mes = filtros?.mes !== undefined ? filtros.mes : hoy.getMonth(); // 0 a 11
    const anio = filtros?.anio !== undefined ? filtros.anio : hoy.getFullYear();

    // Rango del período seleccionado
    const fechaInicio = new Date(anio, mes, 1, 0, 0, 0);
    const fechaFin = new Date(anio, mes + 1, 0, 23, 59, 59);

    // 1. Obtener todas las liquidaciones del período (Ingresos automáticos)
    const liquidaciones = await prisma.liquidacion.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      include: {
        cliente: true,
        maquina: true,
        operador: true,
        detalles: true,
      },
      orderBy: { fecha: "desc" },
    });

    // 2. Obtener todas las transacciones contables manuales del período
    const transaccionesManuales = await prisma.transaccionContable.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      include: {
        creadoPor: true,
      },
      orderBy: { fecha: "desc" },
    });

    // 3. Obtener configuración de Gastos Fijos
    const gastosFijosDb = await prisma.gastoFijo.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 4. Unificar transacciones
    const transaccionesUnificadas: TransaccionUnificada[] = [];

    // Mapear liquidaciones a transacciones tipo INGRESO
    liquidaciones.forEach((l) => {
      transaccionesUnificadas.push({
        id: `liq-${l.id}`,
        tipo: "INGRESO",
        categoria: "RECAUDO_LIQUIDACION",
        categoriaLabel: LABELS_CATEGORIAS["RECAUDO_LIQUIDACION"],
        monto: Number(l.totalFacturado),
        fecha: l.fecha.toISOString(),
        descripcion: `Liquidación #${l.consecutivo} - ${l.cliente.razonSocial} (${l.maquina.codigoSerial})`,
        referencia: `LIQ-${l.consecutivo}`,
        metodoPago: l.metodoPago,
        esFijo: false,
        esLiquidacion: true,
        reciboPdfUrl: l.reciboPdfUrl || `/api/liquidaciones/${l.id}/pdf`,
        creadoPorNombre: l.operador.name,
      });
    });

    // Mapear transacciones manuales
    transaccionesManuales.forEach((t) => {
      transaccionesUnificadas.push({
        id: t.id,
        tipo: t.tipo,
        categoria: t.categoria,
        categoriaLabel: LABELS_CATEGORIAS[t.categoria] || t.categoria,
        monto: Number(t.monto),
        fecha: t.fecha.toISOString(),
        descripcion: t.descripcion,
        referencia: t.referencia,
        metodoPago: t.metodoPago,
        esFijo: t.esFijo,
        esLiquidacion: false,
        creadoPorNombre: t.creadoPor?.name || "Administrador",
      });
    });

    // Ordenar cronológicamente descendente
    transaccionesUnificadas.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    // 5. Cálculos de Totales y KPIs
    let totalIngresos = 0;
    let totalGastos = 0;
    let efectivoTotal = 0;
    let transferenciaTotal = 0;
    const gastosPorCategoriaMap = new Map<string, number>();

    transaccionesUnificadas.forEach((t) => {
      if (t.tipo === "INGRESO") {
        totalIngresos += t.monto;
        if (t.metodoPago === "EFECTIVO") efectivoTotal += t.monto;
        if (t.metodoPago === "TRANSFERENCIA") transferenciaTotal += t.monto;
      } else if (t.tipo === "GASTO") {
        totalGastos += t.monto;
        const actual = gastosPorCategoriaMap.get(t.categoria) || 0;
        gastosPorCategoriaMap.set(t.categoria, actual + t.monto);
      }
    });

    const utilidadNeta = totalIngresos - totalGastos;
    const margenOperativo =
      totalIngresos > 0 ? (utilidadNeta / totalIngresos) * 100 : 0;

    // Desglose de gastos
    const desgloseGastos = Array.from(gastosPorCategoriaMap.entries())
      .map(([cat, monto]) => ({
        categoria: cat,
        label: LABELS_CATEGORIAS[cat] || cat,
        monto,
        porcentaje: totalGastos > 0 ? (monto / totalGastos) * 100 : 0,
      }))
      .sort((a, b) => b.monto - a.monto);

    // 6. Cálculo del Punto de Equilibrio (Break-Even)
    const tazasActuales = liquidaciones.reduce(
      (acc, l) => acc + l.detalles.reduce((dAcc, d) => dAcc + d.tazasNetas, 0),
      0
    );

    // Gastos fijos activos configurados + transacciones marcadas como fijas en el mes
    const gastosFijosTotales =
      gastosFijosDb
        .filter((gf) => gf.activo)
        .reduce((acc, gf) => acc + Number(gf.monto), 0) +
      transaccionesManuales
        .filter((t) => t.tipo === "GASTO" && t.esFijo)
        .reduce((acc, t) => acc + Number(t.monto), 0);

    // Costos variables actuales del mes (insumos, combustible variable, etc.)
    const costosVariablesActuales = transaccionesManuales
      .filter((t) => t.tipo === "GASTO" && !t.esFijo)
      .reduce((acc, t) => acc + Number(t.monto), 0);

    // Margen de contribución (%): (Ventas - Costos Variables) / Ventas
    const margenContribucionPct =
      totalIngresos > 0 && costosVariablesActuales > 0
        ? Math.max(0.1, (totalIngresos - costosVariablesActuales) / totalIngresos)
        : 0.65; // Estándar del 65% en vending de café si aún no hay egresos variables registrados

    // Punto de equilibrio en dinero ($ COP): Gastos Fijos / Margen de Contribución %
    const puntoEquilibrioDinero =
      margenContribucionPct > 0
        ? Math.round(gastosFijosTotales / margenContribucionPct)
        : 0;

    // Precio promedio por taza
    const precioPromedioTaza =
      tazasActuales > 0 ? Math.round(totalIngresos / tazasActuales) : 2500;

    // Costo variable promedio por taza
    const costoVariablePromedioTaza =
      tazasActuales > 0 && costosVariablesActuales > 0
        ? Math.round(costosVariablesActuales / tazasActuales)
        : 850;

    const margenContribucionTaza = Math.max(
      100,
      precioPromedioTaza - costoVariablePromedioTaza
    );

    // Punto de equilibrio en tazas: Gastos Fijos / Margen de Contribución por Taza
    const puntoEquilibrioTazas =
      margenContribucionTaza > 0
        ? Math.ceil(gastosFijosTotales / margenContribucionTaza)
        : 0;

    const porcentajeAlcanzado =
      puntoEquilibrioDinero > 0
        ? (totalIngresos / puntoEquilibrioDinero) * 100
        : 0;

    const diferenciaDinero = totalIngresos - puntoEquilibrioDinero;
    const diferenciaTazas = tazasActuales - puntoEquilibrioTazas;
    const estaEnEquilibrio =
      totalIngresos >= puntoEquilibrioDinero && puntoEquilibrioDinero > 0;

    const puntoEquilibrio: PuntoEquilibrioData = {
      gastosFijosTotales,
      ventasActuales: totalIngresos,
      costosVariablesActuales,
      margenContribucionPct,
      puntoEquilibrioDinero,
      tazasActuales,
      precioPromedioTaza,
      costoVariablePromedioTaza,
      margenContribucionTaza,
      puntoEquilibrioTazas,
      porcentajeAlcanzado,
      diferenciaDinero,
      diferenciaTazas,
      estaEnEquilibrio,
    };

    const gastosFijos: GastoFijoItem[] = gastosFijosDb.map((gf) => ({
      id: gf.id,
      concepto: gf.concepto,
      categoria: gf.categoria,
      categoriaLabel: LABELS_CATEGORIAS[gf.categoria] || gf.categoria,
      monto: Number(gf.monto),
      diaCobro: gf.diaCobro || 1,
      activo: gf.activo,
      descripcion: gf.descripcion,
    }));

    return {
      success: true,
      data: {
        totalIngresos,
        totalGastos,
        utilidadNeta,
        margenOperativo,
        transacciones: transaccionesUnificadas,
        desgloseGastos,
        metodosPago: {
          efectivo: efectivoTotal,
          transferencia: transferenciaTotal,
        },
        gastosFijos,
        puntoEquilibrio,
      },
    };
  } catch (error: any) {
    console.error("[obtenerResumenContable] Error:", error);
    return {
      success: false,
      error: error.message || "Error al calcular el resumen contable",
    };
  }
}

export async function crearTransaccion(formData: FormData) {
  const currentUser = await requireAdmin();

  try {
    const tipo = formData.get("tipo")?.toString() as TipoTransaccion;
    const categoria = formData.get("categoria")?.toString() as CategoriaTransaccion;
    const montoRaw = formData.get("monto")?.toString();
    const descripcion = formData.get("descripcion")?.toString().trim();
    const referencia = formData.get("referencia")?.toString().trim() || null;
    const fechaRaw = formData.get("fecha")?.toString();
    const metodoPago = (formData.get("metodoPago")?.toString() as MetodoPago) || MetodoPago.EFECTIVO;
    const esFijo = formData.get("esFijo") === "true" || formData.get("esFijo") === "on";

    if (!tipo || !categoria || !montoRaw || !descripcion) {
      return { success: false, error: "Todos los campos obligatorios deben ser diligenciados" };
    }

    const monto = parseFloat(montoRaw);
    if (isNaN(monto) || monto <= 0) {
      return { success: false, error: "El monto debe ser un valor positivo mayor a cero" };
    }

    const fecha = fechaRaw ? new Date(fechaRaw) : new Date();

    await prisma.transaccionContable.create({
      data: {
        tipo,
        categoria,
        monto,
        descripcion,
        referencia,
        metodoPago,
        esFijo,
        fecha,
        creadoPorId: currentUser.id,
      },
    });

    revalidatePath("/admin/contabilidad");
    return { success: true };
  } catch (error: any) {
    console.error("[crearTransaccion] Error:", error);
    return { success: false, error: error.message || "Error al registrar la transacción" };
  }
}

export async function eliminarTransaccion(id: string) {
  await requireAdmin();

  try {
    if (id.startsWith("liq-")) {
      return {
        success: false,
        error: "Las liquidaciones automáticas no se pueden eliminar desde contabilidad para proteger la integridad operativa.",
      };
    }

    await prisma.transaccionContable.delete({
      where: { id },
    });

    revalidatePath("/admin/contabilidad");
    return { success: true };
  } catch (error: any) {
    console.error("[eliminarTransaccion] Error:", error);
    return { success: false, error: error.message || "Error al eliminar la transacción" };
  }
}

// ========================================================
// ACCIONES PARA GASTOS FIJOS Y ESTRUCTURA DE COSTOS
// ========================================================

export async function obtenerGastosFijos() {
  await requireAdmin();

  try {
    const gastosFijos = await prisma.gastoFijo.findMany({
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: gastosFijos.map((gf) => ({
        id: gf.id,
        concepto: gf.concepto,
        categoria: gf.categoria,
        categoriaLabel: LABELS_CATEGORIAS[gf.categoria] || gf.categoria,
        monto: Number(gf.monto),
        diaCobro: gf.diaCobro || 1,
        activo: gf.activo,
        descripcion: gf.descripcion,
      })),
    };
  } catch (error: any) {
    console.error("[obtenerGastosFijos] Error:", error);
    return { success: false, error: error.message || "Error al obtener gastos fijos" };
  }
}

export async function guardarGastoFijo(formData: FormData) {
  await requireAdmin();

  try {
    const id = formData.get("id")?.toString();
    const concepto = formData.get("concepto")?.toString().trim();
    const categoria = formData.get("categoria")?.toString() as CategoriaTransaccion;
    const montoRaw = formData.get("monto")?.toString();
    const diaCobro = parseInt(formData.get("diaCobro")?.toString() || "1", 10);
    const descripcion = formData.get("descripcion")?.toString().trim() || null;
    const activo = formData.get("activo") === "false" ? false : true;

    if (!concepto || !montoRaw) {
      return { success: false, error: "Concepto y monto son obligatorios" };
    }

    const monto = parseFloat(montoRaw);
    if (isNaN(monto) || monto <= 0) {
      return { success: false, error: "El monto debe ser mayor a cero" };
    }

    if (id) {
      await prisma.gastoFijo.update({
        where: { id },
        data: {
          concepto,
          categoria: categoria || CategoriaTransaccion.SERVICIOS_ARRIENDO,
          monto,
          diaCobro,
          activo,
          descripcion,
        },
      });
    } else {
      await prisma.gastoFijo.create({
        data: {
          concepto,
          categoria: categoria || CategoriaTransaccion.SERVICIOS_ARRIENDO,
          monto,
          diaCobro,
          activo,
          descripcion,
        },
      });
    }

    revalidatePath("/admin/contabilidad");
    return { success: true };
  } catch (error: any) {
    console.error("[guardarGastoFijo] Error:", error);
    return { success: false, error: error.message || "Error al guardar el gasto fijo" };
  }
}

export async function eliminarGastoFijo(id: string) {
  await requireAdmin();

  try {
    await prisma.gastoFijo.delete({
      where: { id },
    });

    revalidatePath("/admin/contabilidad");
    return { success: true };
  } catch (error: any) {
    console.error("[eliminarGastoFijo] Error:", error);
    return { success: false, error: error.message || "Error al eliminar el gasto fijo" };
  }
}

