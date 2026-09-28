"use server"

import prisma from "@/lib/prisma"
import { TipoMovimientoInventario, TipoBodega } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"

export async function getFormulas() {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("No auth");

  try {
    const formulas = await prisma.formula.findMany({
        where: { empresaId: currentUser.empresaId },
        include: {
        insumoResultante: true,
        ingredientes: {
          include: {
            insumo: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: formulas }
  } catch (error) {
    console.error("Error al obtener formulas:", error)
    return { success: false, error: "Error interno al obtener fórmulas" }
  }
}

export async function crearFormula(
  nombre: string,
  insumoResultanteId: string,
  ingredientes: { insumoId: string; cantidadRequerida: number }[]
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("No auth");
  try {
    const nuevaFormula = await prisma.formula.create({
      data: {
          empresaId: currentUser.empresaId,
        nombre,
        insumoResultanteId,
        ingredientes: {
          create: ingredientes.map((ing) => ({
            empresaId: currentUser.empresaId,
            insumoIngredienteId: ing.insumoId,
            cantidadRequerida: ing.cantidadRequerida,
          })),
        },
      },
    })
    revalidatePath("/produccion")
    return { success: true, data: nuevaFormula }
  } catch (error) {
    console.error("Error al crear formula:", error)
    return { success: false, error: "Error interno al crear la fórmula" }
  }
}

export async function ejecutarProduccion(
  formulaId: string,
  cantidadProducida: number,
  numeroLoteResultante: string,
  lotesSeleccionados: { insumoId: string; loteId: string; cantidadUsada: number }[]
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("No auth");
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.id) {
      return { success: false, error: "No autorizado" }
    }

    const usuarioId = currentUser.id

    // Check if the formula exists
    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      include: { insumoResultante: true }
    })

    if (!formula) {
      return { success: false, error: "Fórmula no encontrada" }
    }

    // Wrap the entire production execution in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Fetch the selected lots, find the earliest fechaVencimiento
      let earliestDate: Date | null = null
      const selectedLotesDb = await tx.lote.findMany({
        where: {
            empresaId: currentUser.empresaId,
            id: { in: lotesSeleccionados.map((l) => l.loteId) } },
      })

      for (const lote of selectedLotesDb) {
        if (!earliestDate || lote.fechaVencimiento < earliestDate) {
          earliestDate = lote.fechaVencimiento
        }
      }

      if (!earliestDate) {
        throw new Error("No se encontraron lotes para calcular la fecha de vencimiento")
      }

      // 2. Create the new Lote for insumoResultante
      const nuevoLote = await tx.lote.create({
        data: {
            empresaId: currentUser.empresaId,
            numeroLote: numeroLoteResultante,
          fechaVencimiento: earliestDate,
          insumoId: formula.insumoResultanteId,
        },
      })

      // Get the principal bodega
      const bodegaPrincipal = await tx.bodega.findFirst({
        where: {
            empresaId: currentUser.empresaId,
            tipo: TipoBodega.PRINCIPAL },
      })

      if (!bodegaPrincipal) {
        throw new Error("No se encontró la bodega principal")
      }

      // 3 & 6. Decrement the ingredient Existencia, create MovimientoInventario for SALIDA
      for (const req of lotesSeleccionados) {
        // Find existing Existencia
        const existencia = await tx.existencia.findUnique({
          where: {
            bodegaId_loteId_insumoId: {
              bodegaId: bodegaPrincipal.id,
              loteId: req.loteId,
              insumoId: req.insumoId,
            }
          }
        })

        if (!existencia || existencia.cantidad < req.cantidadUsada) {
          throw new Error(`Inventario insuficiente para el insumo ${req.insumoId} en lote ${req.loteId}`)
        }

        await tx.existencia.update({
          where: {
              empresaId: currentUser.empresaId,
            id: existencia.id },
          data: { cantidad: { decrement: req.cantidadUsada } }
        })

        // Decrement general stock
        await tx.insumo.update({
          where: {
              empresaId: currentUser.empresaId,
            id: req.insumoId },
          data: { stockActual: { decrement: req.cantidadUsada } }
        })

        await tx.movimientoInventario.create({
          data: {
              empresaId: currentUser.empresaId,
            insumoId: req.insumoId,
            tipo: TipoMovimientoInventario.SALIDA_PRODUCCION,
            cantidad: req.cantidadUsada,
            loteId: req.loteId,
            bodegaOrigenId: bodegaPrincipal.id,
            operadorId: usuarioId,
          }
        })
      }

      // 4. Increment/Create the new Existencia for the new product
      await tx.existencia.upsert({
        where: {
          bodegaId_loteId_insumoId: {
            bodegaId: bodegaPrincipal.id,
            loteId: nuevoLote.id,
            insumoId: formula.insumoResultanteId,
          }
        },
        create: {
            empresaId: currentUser.empresaId,
            bodegaId: bodegaPrincipal.id,
          loteId: nuevoLote.id,
          insumoId: formula.insumoResultanteId,
          cantidad: cantidadProducida
        },
        update: {
          cantidad: { increment: cantidadProducida }
        }
      })

      // Increment general stock
      await tx.insumo.update({
        where: {
            empresaId: currentUser.empresaId,
            id: formula.insumoResultanteId },
        data: { stockActual: { increment: cantidadProducida } }
      })

      await tx.movimientoInventario.create({
        data: {
            empresaId: currentUser.empresaId,
            insumoId: formula.insumoResultanteId,
          tipo: TipoMovimientoInventario.ENTRADA_PRODUCCION,
          cantidad: cantidadProducida,
          loteId: nuevoLote.id,
          bodegaDestinoId: bodegaPrincipal.id,
          operadorId: usuarioId,
        }
      })

      // 5. Create the Produccion and DetalleProduccion records
      await tx.produccion.create({
        data: {
            empresaId: currentUser.empresaId,
            formulaId,
          loteResultanteId: nuevoLote.id,
          cantidadProducida,
          usuarioId,
          detalles: {
            create: lotesSeleccionados.map((ls) => ({
              empresaId: currentUser.empresaId,
              insumoId: ls.insumoId,
              loteId: ls.loteId,
              cantidadUsada: ls.cantidadUsada
            }))
          }
        }
      })
    })

    revalidatePath("/produccion")
    return { success: true }
  } catch (error: any) {
    console.error("Error al ejecutar produccion:", error)
    return { success: false, error: error.message || "Error interno en producción" }
  }
}

export async function editarFormula(
  formulaId: string,
  nombre: string,
  ingredientes: { insumoId: string; cantidad: number }[]
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("No auth");
  try {
    await prisma.$transaction(async (tx) => {
      // Update the formula name
      await tx.formula.update({
        where: {
            empresaId: currentUser.empresaId,
            id: formulaId },
        data: { nombre },
      })

      // Delete existing ingredients
      await tx.ingredienteFormula.deleteMany({
        where: {
            empresaId: currentUser.empresaId,
            formulaId },
      })

      // Recreate ingredients
      if (ingredientes.length > 0) {
        await tx.ingredienteFormula.createMany({
          data: ingredientes.map((ing) => ({
            empresaId: currentUser.empresaId,
            formulaId,
            insumoIngredienteId: ing.insumoId,
            cantidadRequerida: ing.cantidad,
          })),
        })
      }
    })

    revalidatePath("/admin/produccion")
    return { success: true }
  } catch (error: any) {
    console.error("Error al editar formula:", error)
    return { success: false, error: "Error interno al editar fórmula" }
  }
}

export async function eliminarFormula(formulaId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("No auth");

  try {
    await prisma.$transaction(async (tx) => {
      // First delete the relations (IngredienteFormula)
      await tx.ingredienteFormula.deleteMany({
        where: {
            empresaId: currentUser.empresaId,
            formulaId },
      })

      // Then delete the formula
      await tx.formula.delete({
        where: { id: formulaId },
      })
    })

    revalidatePath("/admin/produccion")
    return { success: true }
  } catch (error: any) {
    console.error("Error al eliminar formula:", error)
    // Prisma usually throws an error code if relation to Produccion restricts deletion (e.g. P2003)
    if (error.code === 'P2003') {
      return { success: false, error: "No se puede eliminar la fórmula porque tiene producciones asociadas." }
    }
    return { success: false, error: "Error interno al eliminar fórmula" }
  }
}
