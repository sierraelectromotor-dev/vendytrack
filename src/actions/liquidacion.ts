"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { uploadCounterPhoto, uploadSignature, uploadPdfReceipt } from "@/lib/blob";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import {
  liquidacionFormSchema,
  LiquidacionFormData,
  BEBIDAS_CATALOGO,
  TipoBebidaEnum,
} from "@/types/liquidacion";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { LiquidacionReceiptPdf } from "@/components/pdf/LiquidacionReceiptPdf";
import { formatFechaColombia } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";

/**
 * Consulta los datos de la máquina, cliente, precios configurados
 * y el último Contador Anterior (C.F) registrado para cada una de las bebidas.
 */
export async function obtenerDatosMaquina(maquinaId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autorizado: Inicia sesión." };
    }

    const maquina = await prisma.maquina.findUnique({
      where: { id: maquinaId },
      include: {
        cliente: true,
        precios: true,
        configuraciones: true,
        liquidaciones: {
          orderBy: { fecha: "desc" },
          take: 1,
          include: { detalles: true },
        },
      },
    });

    if (!maquina) {
      return {
        success: false,
        error: "Máquina no encontrada o aún no configurada en la base de datos.",
      };
    }

    if (!maquina.cliente) {
      return {
        success: false,
        error: "Esta máquina se encuentra en bodega / taller y no tiene cliente asignado para liquidar.",
      };
    }

    // Mapear el último contador de cada bebida
    const ultimosDetalles = maquina.liquidaciones[0]?.detalles || [];
    const mapaUltimosContadores: Record<string, number> = {};
    ultimosDetalles.forEach((d) => {
      mapaUltimosContadores[d.bebida] = d.contadorActual;
    });

    // Mapear precios configurados
    const mapaPrecios: Record<string, number> = {};
    maquina.precios.forEach((p) => {
      mapaPrecios[p.bebida] = Number(p.precioUnitario);
    });

    // Precios por defecto si no están definidos
    const preciosPorDefecto: Record<TipoBebidaEnum, number> = {
      CAPUCHINO_VAINILLA: 2500,
      CAPUCHINO_TRADICIONAL: 2500,
      MOCACCINO: 2800,
      CAFE_CORTO_EXPRESO: 1800,
      CAFE_LARGO_TINTO: 1800,
      LATTE: 2600,
      CHOCOLATE_CHOCOMILK: 2400,
    };

    // Si la máquina tiene configuraciones personalizadas de bebidas activas, usar solo esas
    const maxBebidas = maquina.numeroProductos || 4;
    let bebidasConContadores;
    const configsActivas = (maquina.configuraciones || []).filter((c) => c.activa);

    if (configsActivas.length > 0) {
      bebidasConContadores = configsActivas
        .slice(0, maxBebidas)
        .map((c) => {
          const catalogo = BEBIDAS_CATALOGO.find((b) => b.id === c.bebida);
          return {
            bebida: c.bebida,
            nombre: catalogo?.nombre || c.bebida,
            icono: catalogo?.icono || "☕",
            contadorAnterior:
              mapaUltimosContadores[c.bebida] ??
              (c as any).contadorInicial ??
              (maquina as any).contadorActual ??
              0,
            precioUnitario:
              Number(c.precio) ||
              mapaPrecios[c.bebida] ||
              preciosPorDefecto[c.bebida as TipoBebidaEnum],
          };
        });
    } else {
      bebidasConContadores = BEBIDAS_CATALOGO.slice(0, maxBebidas).map((b) => ({
        bebida: b.id,
        nombre: b.nombre,
        icono: b.icono,
        contadorAnterior: mapaUltimosContadores[b.id] ?? (maquina as any).contadorActual ?? 0,
        precioUnitario: mapaPrecios[b.id] ?? preciosPorDefecto[b.id],
      }));
    }

    return {
      success: true,
      data: {
        maquina: {
          id: maquina.id,
          codigoSerial: maquina.codigoSerial,
          modelo: maquina.modelo,
          ubicacion: maquina.ubicacion,
          numeroProductos: maquina.numeroProductos,
          tipo: "MANUAL_RUTA",
        },
        cliente: {
          id: maquina.cliente.id,
          razonSocial: maquina.cliente.razonSocial,
          sede: maquina.cliente.sede,
          direccion: maquina.cliente.direccion,
          contacto: maquina.cliente.contacto,
          whatsapp: maquina.cliente.whatsapp,
        },
        bebidas: bebidasConContadores,
      },
    };
  } catch (error: any) {
    console.error("[obtenerDatosMaquina] Error:", error);
    return {
      success: false,
      error: error.message || "Error al obtener datos de la máquina",
    };
  }
}

/**
 * Server Action principal:
 * 1. Valida el usuario autenticado
 * 2. Valida el formulario con Zod
 * 3. Sube la foto del contador (opcional) y la firma táctil a Vercel Blob
 * 4. Registra la liquidación y detalles en Postgres con Prisma
 * 5. Aplica el Kárdex serverless (descuento teórico de insumos según recetas)
 * 6. Genera el PDF con @react-pdf/renderer y lo almacena en Vercel Blob
 * 7. Construye el deep link oficial de WhatsApp para disparo directo
 */
export async function registrarLiquidacion(formData: LiquidacionFormData) {
  try {
    // 1. Verificar autenticación del operador
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Debes iniciar sesión para registrar una liquidación." };
    }

    // 2. Validación estricta con Zod
    const validatedData = liquidacionFormSchema.parse(formData);

    // 3. Subida de evidencias a Vercel Blob (foto es opcional)
    const [fotoContadorUrl, firmaClienteUrl] = await Promise.all([
      validatedData.fotoContadorBase64 && validatedData.fotoContadorBase64.length > 50
        ? uploadCounterPhoto(
            Buffer.from(
              validatedData.fotoContadorBase64.replace(/^data:image\/\w+;base64,/, ""),
              "base64"
            ),
            `contador-${validatedData.maquinaId}`
          )
        : Promise.resolve(""),
      uploadSignature(
        validatedData.firmaClienteBase64,
        `firma-${validatedData.clienteId}`
      ),
    ]);

    // 4. Cálculos matemáticos en servidor
    let totalTazasNetas = 0;
    let totalFacturado = 0;

    const lineasCalculadas = validatedData.detalles.map((d) => {
      const subtotalContador = d.contadorActual - d.contadorAnterior;
      const tazasNetas = Math.max(0, subtotalContador - d.bebidasDanadas);
      const valorLinea = tazasNetas * d.precioUnitario;

      totalTazasNetas += tazasNetas;
      totalFacturado += valorLinea;

      return {
        bebida: d.bebida,
        contadorAnterior: d.contadorAnterior,
        contadorActual: d.contadorActual,
        bebidasDanadas: d.bebidasDanadas,
        tazasNetas,
        precioUnitario: d.precioUnitario,
        subtotal: valorLinea,
      };
    });

    // 5. Validar existencia real de cliente y máquina en la base de datos
    const clienteDb = await prisma.cliente.findUnique({
      where: { id: validatedData.clienteId },
    });
    const maquinaDb = await prisma.maquina.findUnique({
      where: { id: validatedData.maquinaId },
    });

    if (!clienteDb || !maquinaDb) {
      return {
        success: false,
        error: "El cliente o la máquina no existen en la base de datos.",
      };
    }

    const clienteData = clienteDb;
    const maquinaData = maquinaDb;
    const operadorId = currentUser.id;
    const operadorNombre = currentUser.name;

    // Transacción en base de datos
    const nuevaLiquidacion = await prisma.$transaction(async (tx) => {
      // A. Crear cabecera de liquidación
      const liq = await tx.liquidacion.create({
        data: {
          clienteId: validatedData.clienteId,
          maquinaId: validatedData.maquinaId,
          operadorId: operadorId,
          metodoPago: validatedData.metodoPago,
          totalFacturado: totalFacturado,
          fotoContadorUrl: fotoContadorUrl,
          firmaClienteUrl: firmaClienteUrl,
          notas: validatedData.notas,
          detalles: {
            create: lineasCalculadas.map((l) => ({
              bebida: l.bebida,
              contadorAnterior: l.contadorAnterior,
              contadorActual: l.contadorActual,
              bebidasDanadas: l.bebidasDanadas,
              tazasNetas: l.tazasNetas,
              precioUnitario: l.precioUnitario,
              subtotal: l.subtotal,
            })),
          },
        },
      });

      // B. Kárdex Serverless: Descuento teórico de insumos según calibración de la máquina
      const configMaquina = await tx.configBebidaMaquina.findMany({
        where: { maquinaId: validatedData.maquinaId },
      });
      const configMap = new Map(configMaquina.map((c) => [c.bebida, c]));

      const insumosList = await tx.insumo.findMany();
      const insumosMap = new Map(insumosList.map((i) => [i.codigo, i.id]));
      const idCafe = insumosMap.get("INS-CAFE-SOLUBLE");
      const idLeche = insumosMap.get("INS-LECHE-POLVO");
      const idCocoa = insumosMap.get("INS-COCOA");
      const idVasos = insumosMap.get("INS-VASOS-7OZ");
      const idMezcl = insumosMap.get("INS-MEZCLADORES");

      // Descuento de Premezclas e Insumos por ranura configurada
      const descuentosPorInsumo = new Map<string, number>();
      let totalGramosCafe = 0;
      let totalGramosLeche = 0;
      let totalGramosCocoa = 0;

      for (const linea of lineasCalculadas) {
        const cfg = configMap.get(linea.bebida);
        const insumoId = (cfg as any)?.insumoId;
        const gramosPorTaza = Number((cfg as any)?.gramosPorTaza || 0);

        if (insumoId && gramosPorTaza > 0) {
          const gramosTotales = linea.tazasNetas * gramosPorTaza;
          const previo = descuentosPorInsumo.get(insumoId) || 0;
          descuentosPorInsumo.set(insumoId, previo + gramosTotales);
        } else {
          // Retrocompatibilidad: Si no tiene premezcla asignada, usar café/leche/cocoa
          const gramosCafe = cfg ? Number(cfg.gramosCafe) : 2.0;
          const gramosLeche = cfg ? Number(cfg.gramosLeche) : 0;
          const gramosCocoa = cfg ? Number(cfg.gramosCocoa) : 0;

          totalGramosCafe += linea.tazasNetas * gramosCafe;
          totalGramosLeche += linea.tazasNetas * gramosLeche;
          totalGramosCocoa += linea.tazasNetas * gramosCocoa;
        }
      }

      // 1. Descontar Premezclas configuradas directamente
      for (const [insumoId, gramosTotales] of Array.from(descuentosPorInsumo.entries())) {
        const insumoTarget = insumosList.find((i) => i.id === insumoId);
        if (!insumoTarget || gramosTotales <= 0) continue;

        const cantDescontar = insumoTarget.unidadMedida === "KG" ? gramosTotales / 1000 : gramosTotales;

        await tx.insumo.update({
          where: { id: insumoId },
          data: { stockActual: { decrement: cantDescontar } },
        });

        await tx.movimientoInventario.create({
          data: {
            insumoId,
            tipo: "SALIDA_TEORICA_LIQUIDACION",
            cantidad: cantDescontar,
            referencia: `Liquidación #${liq.consecutivo} - ${maquinaData.codigoSerial} (${insumoTarget.nombre})`,
          },
        });
      }

      // 2. Descontar Café fallback (si hubo ranuras sin premezcla explícita)
      if (idCafe && totalGramosCafe > 0) {
        const cantKg = totalGramosCafe / 1000;
        await tx.insumo.update({
          where: { id: idCafe },
          data: { stockActual: { decrement: cantKg } },
        });
        await tx.movimientoInventario.create({
          data: {
            insumoId: idCafe,
            tipo: "SALIDA_TEORICA_LIQUIDACION",
            cantidad: cantKg,
            referencia: `Liquidación #${liq.consecutivo} - ${maquinaData.codigoSerial}`,
          },
        });
      }

      // Descontar Leche fallback
      if (idLeche && totalGramosLeche > 0) {
        const cantKg = totalGramosLeche / 1000;
        await tx.insumo.update({
          where: { id: idLeche },
          data: { stockActual: { decrement: cantKg } },
        });
        await tx.movimientoInventario.create({
          data: {
            insumoId: idLeche,
            tipo: "SALIDA_TEORICA_LIQUIDACION",
            cantidad: cantKg,
            referencia: `Liquidación #${liq.consecutivo} - ${maquinaData.codigoSerial}`,
          },
        });
      }

      // Descontar Cocoa fallback
      if (idCocoa && totalGramosCocoa > 0) {
        const cantKg = totalGramosCocoa / 1000;
        await tx.insumo.update({
          where: { id: idCocoa },
          data: { stockActual: { decrement: cantKg } },
        });
        await tx.movimientoInventario.create({
          data: {
            insumoId: idCocoa,
            tipo: "SALIDA_TEORICA_LIQUIDACION",
            cantidad: cantKg,
            referencia: `Liquidación #${liq.consecutivo} - ${maquinaData.codigoSerial}`,
          },
        });
      }

      // Descontar Vasos y Mezcladores
      if (idVasos && totalTazasNetas > 0) {
        await tx.insumo.update({
          where: { id: idVasos },
          data: { stockActual: { decrement: totalTazasNetas } },
        });
        await tx.movimientoInventario.create({
          data: {
            insumoId: idVasos,
            tipo: "SALIDA_TEORICA_LIQUIDACION",
            cantidad: totalTazasNetas,
            referencia: `Liquidación #${liq.consecutivo} - ${maquinaData.codigoSerial}`,
          },
        });
      }

      if (idMezcl && totalTazasNetas > 0) {
        await tx.insumo.update({
          where: { id: idMezcl },
          data: { stockActual: { decrement: totalTazasNetas } },
        });
        await tx.movimientoInventario.create({
          data: {
            insumoId: idMezcl,
            tipo: "SALIDA_TEORICA_LIQUIDACION",
            cantidad: totalTazasNetas,
            referencia: `Liquidación #${liq.consecutivo} - ${maquinaData.codigoSerial}`,
          },
        });
      }

      // C. Actualizar contador actual de la máquina con el valor más reciente
      const maxContadorRegistrado = Math.max(
        ...lineasCalculadas.map((l) => l.contadorActual),
        (maquinaData as any).contadorActual ?? 0
      );
      await tx.maquina.update({
        where: { id: validatedData.maquinaId },
        data: { contadorActual: maxContadorRegistrado },
      });

      return liq;
    });

    const consecutivoGenerado = nuevaLiquidacion.consecutivo;
    const liquidacionId = nuevaLiquidacion.id;

    // 6. Generación de PDF
    const pdfData = {
      consecutivo: consecutivoGenerado,
      fecha: formatFechaColombia(new Date()),
      cliente: {
        razonSocial: clienteData.razonSocial,
        sede: clienteData.sede,
        direccion: clienteData.direccion,
        contacto: clienteData.contacto,
        whatsapp: clienteData.whatsapp,
      },
      maquina: {
        codigoSerial: maquinaData.codigoSerial,
        modelo: maquinaData.modelo,
        ubicacion: maquinaData.ubicacion,
      },
      operadorNombre: operadorNombre,
      metodoPago: validatedData.metodoPago,
      detalles: lineasCalculadas.map((l) => ({
        bebida: l.bebida,
        nombreBebida: BEBIDAS_CATALOGO.find((b) => b.id === l.bebida)?.nombre || l.bebida,
        contadorAnterior: l.contadorAnterior,
        contadorActual: l.contadorActual,
        bebidasDanadas: l.bebidasDanadas,
        tazasNetas: l.tazasNetas,
        precioUnitario: l.precioUnitario,
        subtotal: l.subtotal,
      })),
      totales: {
        totalTazasNetas,
        totalFacturado,
      },
      firmaClienteUrl: validatedData.firmaClienteBase64,
      notas: validatedData.notas,
    };

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    let reciboPdfUrl = `${baseUrl}/api/liquidaciones/${liquidacionId}/pdf`;

    try {
      const pdfElement = React.createElement(LiquidacionReceiptPdf, { data: pdfData }) as any;
      const pdfBuffer = await renderToBuffer(pdfElement);
      const uploadedUrl = await uploadPdfReceipt(pdfBuffer, consecutivoGenerado);
      if (uploadedUrl && !uploadedUrl.includes("demo.public.blob")) {
        reciboPdfUrl = uploadedUrl;
      }
    } catch (pdfError) {
      console.error("[registrarLiquidacion] Error generando o subiendo PDF:", pdfError);
    }

    // Actualizar Liquidación con la URL del PDF generado
    await prisma.liquidacion.update({
      where: { id: liquidacionId },
      data: { reciboPdfUrl },
    }).catch(() => null);

    // 7. Generar Deep Link de WhatsApp
    const whatsappLink = buildWhatsAppLink(clienteData.whatsapp, {
      consecutivo: consecutivoGenerado,
      clienteNombre: clienteData.razonSocial,
      sede: clienteData.sede,
      maquinaSerial: maquinaData.codigoSerial,
      maquinaModelo: maquinaData.modelo,
      totalFacturado: totalFacturado,
      totalTazasNetas: totalTazasNetas,
      metodoPago: validatedData.metodoPago,
      pdfUrl: reciboPdfUrl,
    });

    revalidatePath("/liquidacion");
    revalidatePath("/");

    return {
      success: true,
      data: {
        liquidacionId,
        consecutivo: consecutivoGenerado,
        totalFacturado,
        totalTazasNetas,
        pdfUrl: reciboPdfUrl,
        whatsappLink,
      },
    };
  } catch (error: any) {
    console.error("[registrarLiquidacion] Error general:", error);
    return {
      success: false,
      error: error.message || "Error al procesar la liquidación",
    };
  }
}
