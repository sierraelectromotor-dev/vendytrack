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
import React from "react";
import { formatFechaColombia } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";

/**
 * Consulta los datos de la máquina, cliente, precios configurados
 * y el último Contador Anterior (C.F) registrado para cada una de las bebidas.
 */
export async function obtenerDatosMaquina(maquinaId: string) {
  try {
    const currentUser = await getCurrentUser();
    const user = currentUser;
    if (!currentUser) {
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

    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);
    const ultimaLiq = maquina.liquidaciones[0];
    const liquidadaHoy = ultimaLiq ? new Date(ultimaLiq.fecha) >= hoyInicio : false;
    const totalTazas = ultimaLiq?.detalles.reduce((acc: number, d: any) => acc + d.tazasNetas, 0) || 0;

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
          liquidadaHoy,
          ultimoConsecutivo: ultimaLiq?.consecutivo,
          ultimaLiquidacionFecha: ultimaLiq?.fecha,
          ultimoTotalFacturado: ultimaLiq?.totalFacturado,
          ultimoTotalTazas: totalTazas,
          ultimoMetodoPago: ultimaLiq?.metodoPago,
          ultimoReciboPdfUrl: ultimaLiq?.reciboPdfUrl,
          ultimaLiquidacionId: ultimaLiq?.id,
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
    const user = currentUser;
    if (!currentUser) {
      return { success: false, error: "Debes iniciar sesión para registrar una liquidación." };
    }

    // 2. Validación estricta con Zod
    const validatedData = liquidacionFormSchema.parse(formData);

    // Verificar que la máquina pertenece a una ruta asignada al operador
    if (currentUser.rol !== 'ADMIN') {
      const maquinaCheck = await prisma.maquina.findUnique({
        where: { id: validatedData.maquinaId },
        select: { ruta: { select: { operadorId: true } } },
      });
      if (!maquinaCheck?.ruta || maquinaCheck.ruta.operadorId !== currentUser.id) {
        return { success: false, error: 'No tienes permiso para liquidar esta máquina.' };
      }
    }

    // 2.1 Verificar si la máquina ya fue liquidada hoy (bloqueo estricto contra reenvío) - Fast Path
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);

    const liqExistenteHoy = await prisma.liquidacion.findFirst({
      where: { empresaId: currentUser.empresaId,
        maquinaId: validatedData.maquinaId,
        fecha: { gte: hoyInicio },
      },
      select: { id: true, consecutivo: true },
    });

    if (liqExistenteHoy && currentUser.rol !== "ADMIN") {
      const numLiq =
        typeof liqExistenteHoy.consecutivo === "number"
          ? `LIQ-${liqExistenteHoy.consecutivo.toString().padStart(4, "0")}`
          : liqExistenteHoy.consecutivo;
      return {
        success: false,
        error: `Esta máquina ya fue liquidada hoy (${numLiq}). No se puede editar o reenviar hasta que un administrador reasigne la ruta.`,
      };
    }

    // 3. Subida de evidencias a Vercel Blob (foto es opcional)
    const [fotoContadorUrl, uploadedFirmaUrl] = await Promise.all([
      validatedData.fotoContadorBase64 && validatedData.fotoContadorBase64.length > 50
        ? uploadCounterPhoto(
            Buffer.from(
              validatedData.fotoContadorBase64.replace(/^data:image\/\w+;base64,/, ""),
              "base64"
            ),
            `contador-${validatedData.maquinaId}`,
            validatedData.fotoContadorBase64
          )
        : Promise.resolve(""),
      uploadSignature(
        validatedData.firmaClienteBase64,
        `firma-${validatedData.clienteId}`
      ),
    ]);

    // Garantizar que la firma nunca sea vacía ni una URL rota
    const firmaClienteUrl = uploadedFirmaUrl || validatedData.firmaClienteBase64;

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
    const txResult = await prisma.$transaction(async (tx) => {
      // 0. Revisión de liquidación existente dentro de transacción
      if (currentUser.rol !== "ADMIN") {
        const liqExistente = await tx.liquidacion.findFirst({
          where: { empresaId: currentUser.empresaId,
            maquinaId: validatedData.maquinaId, fecha: { gte: hoyInicio } },
        });
        if (liqExistente) {
          throw new Error("Esta máquina ya fue liquidada hoy. Intento bloqueado.");
        }
      }

      // Obtener precios oficiales del servidor
      const preciosOficiales = await tx.precioMaquina.findMany({
        where: { empresaId: currentUser.empresaId,
            maquinaId: validatedData.maquinaId },
      });
      const preciosConfig = await tx.configBebidaMaquina.findMany({
        where: { empresaId: currentUser.empresaId,
            maquinaId: validatedData.maquinaId },
      });
      
      // Crear mapa de precios oficiales
      const precioMap = new Map<string, number>();
      preciosOficiales.forEach(p => precioMap.set(p.bebida, Number(p.precioUnitario)));
      preciosConfig.forEach(c => {
        if (!precioMap.has(c.bebida)) {
          precioMap.set(c.bebida, Number(c.precio));
        }
      });

      // 4. Cálculos matemáticos en servidor
      let totalTazasNetas = 0;
      let totalFacturado = 0;

      const lineasCalculadas = validatedData.detalles.map((d) => {
        const subtotalContador = d.contadorActual - d.contadorAnterior;
        const tazasNetas = Math.max(0, subtotalContador - d.bebidasDanadas);
        const precioOficial = precioMap.get(d.bebida) || d.precioUnitario;
        const valorLinea = tazasNetas * precioOficial;

        totalTazasNetas += tazasNetas;
        totalFacturado += valorLinea;

        return {
          bebida: d.bebida,
          contadorAnterior: d.contadorAnterior,
          contadorActual: d.contadorActual,
          bebidasDanadas: d.bebidasDanadas,
          tazasNetas,
          precioUnitario: precioOficial,
          subtotal: valorLinea,
        };
      });

      const montoEfectivo = validatedData.montoEfectivo || 0;
      const montoTransferencia = validatedData.montoTransferencia || 0;
      const montoTotalPagado = montoEfectivo + montoTransferencia;
      const saldoPendiente = Math.max(0, totalFacturado - montoTotalPagado);
      
      let estadoPago: "PENDIENTE" | "PAGADO_PARCIAL" | "PAGADO_TOTAL" = "PENDIENTE";
      if (saldoPendiente === 0) estadoPago = "PAGADO_TOTAL";
      else if (saldoPendiente < totalFacturado) estadoPago = "PAGADO_PARCIAL";

      const abonosData: any[] = [];
      if (montoEfectivo > 0) {
        abonosData.push({
          empresaId: currentUser.empresaId,
          monto: montoEfectivo,
          metodoPago: "EFECTIVO",
          registradoPor: { connect: { id: operadorId } },
          fecha: new Date(),
        });
      }
      if (montoTransferencia > 0) {
        abonosData.push({
          monto: montoTransferencia,
          metodoPago: "TRANSFERENCIA",
          registradoPor: { connect: { id: operadorId } },
          fecha: new Date(),
        });
      }

      // A. Crear cabecera de liquidación con CuentaCobrar
      const liq = await tx.liquidacion.create({
        data: {
              empresa: { connect: { id: currentUser.empresaId } },
            cliente: { connect: { id: validatedData.clienteId } },
          maquina: { connect: { id: validatedData.maquinaId } },
          operador: { connect: { id: operadorId } },
          metodoPago: montoTransferencia > 0 && montoEfectivo === 0 ? "TRANSFERENCIA" : "EFECTIVO",
          totalFacturado: totalFacturado,
          estadoPago: estadoPago,
          fotoContadorUrl: fotoContadorUrl,
          firmaClienteUrl: firmaClienteUrl,
          notas: validatedData.notas,
          detalles: {
            create: lineasCalculadas.map((l) => ({
                empresaId: currentUser.empresaId,
              bebida: l.bebida,
              contadorAnterior: l.contadorAnterior,
              contadorActual: l.contadorActual,
              bebidasDanadas: l.bebidasDanadas,
              tazasNetas: l.tazasNetas,
              precioUnitario: l.precioUnitario,
              subtotal: l.subtotal,
            })),
          },
          cuentaCobrar: {
            create: {
                empresa: { connect: { id: currentUser.empresaId } },
                  cliente: { connect: { id: validatedData.clienteId } },
                montoTotal: totalFacturado,
              saldoPendiente: saldoPendiente,
              estadoPago: estadoPago,
              fechaCreacion: new Date(),
              abonos: {
                create: abonosData
              }
            }
          }
        },
      });

      // B. Kárdex Serverless: Descuento teórico de insumos según calibración de la máquina
      const configMaquina = await tx.configBebidaMaquina.findMany({
        where: { empresaId: currentUser.empresaId,
            maquinaId: validatedData.maquinaId },
      });
      const configMap = new Map(configMaquina.map((c) => [c.bebida, c]));

      const insumosList = await tx.insumo.findMany({ where: { empresaId: currentUser.empresaId } });
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

      const descontarInsumo = async (insumoId: string, cantidad: number, referencia: string) => {
        if (cantidad <= 0) return;

        // 1. Descontar global (retrocompatibilidad)
        const insumoActual = await tx.insumo.findUnique({ where: { id: insumoId } });
        if (insumoActual && Number(insumoActual.stockActual) < cantidad) {
          console.warn(`[Liquidación] Stock insuficiente para insumo ${insumoId}. Stock: ${insumoActual.stockActual}, Requerido: ${cantidad}`);
        }
        await tx.insumo.update({
          where: { empresaId: currentUser.empresaId,
            id: insumoId },
          data: { stockActual: { decrement: cantidad } },
        });

        // 2. Descontar FIFO de Bodega Máquina
        const bodegaMaquina = await tx.bodega.findFirst({
          where: { empresaId: currentUser.empresaId,
            maquinaId: validatedData.maquinaId, tipo: "MAQUINA" },
        });

        if (bodegaMaquina) {
          const existencias = await tx.existencia.findMany({
            where: { empresaId: currentUser.empresaId,
                bodegaId: bodegaMaquina.id, insumoId },
            include: { lote: true },
            orderBy: { lote: { fechaVencimiento: "asc" } },
          });

          let cantidadRestante = cantidad;

          if (existencias.length === 0) {
            await tx.movimientoInventario.create({
              data: {
                  empresaId: currentUser.empresaId,
                insumoId,
                tipo: "SALIDA_TEORICA_LIQUIDACION",
                cantidad,
                referencia,
                bodegaOrigenId: bodegaMaquina.id,
              },
            });
          } else {
            for (let i = 0; i < existencias.length; i++) {
              const ex = existencias[i];
              const cantDisponible = Number(ex.cantidad);
              const esUltima = i === existencias.length - 1;

              if (cantidadRestante <= 0) break;

              if (cantDisponible > 0 || esUltima) {
                const cantDescontarLote = (cantDisponible >= cantidadRestante || esUltima) 
                  ? cantidadRestante 
                  : cantDisponible;
                
                if (cantDescontarLote > 0) {
                  await tx.existencia.update({
                    where: { empresaId: currentUser.empresaId,
                        id: ex.id },
                    data: { cantidad: { decrement: cantDescontarLote } },
                  });

                  await tx.movimientoInventario.create({
                    data: {
                        empresaId: currentUser.empresaId,
                        insumoId,
                      tipo: "SALIDA_TEORICA_LIQUIDACION",
                      cantidad: cantDescontarLote,
                      referencia,
                      bodegaOrigenId: bodegaMaquina.id,
                      loteId: ex.loteId,
                    },
                  });

                  cantidadRestante -= cantDescontarLote;
                }
              }
            }
          }
        } else {
          // Fallback sin bodega
          await tx.movimientoInventario.create({
            data: {
                empresaId: currentUser.empresaId,
                insumoId,
              tipo: "SALIDA_TEORICA_LIQUIDACION",
              cantidad,
              referencia,
            },
          });
        }
      };

      // 1. Descontar Premezclas configuradas directamente
      for (const [insumoId, gramosTotales] of Array.from(descuentosPorInsumo.entries())) {
        const insumoTarget = insumosList.find((i) => i.id === insumoId);
        if (!insumoTarget || gramosTotales <= 0) continue;

        const cantDescontar = insumoTarget.unidadMedida === "KG" ? gramosTotales / 1000 : gramosTotales;
        await descontarInsumo(insumoId, cantDescontar, `Liquidación #${liq.consecutivo} - ${maquinaData.codigoSerial} (${insumoTarget.nombre})`);
      }

      // 2. Descontar Café fallback (si hubo ranuras sin premezcla explícita)
      if (idCafe && totalGramosCafe > 0) {
        await descontarInsumo(idCafe, totalGramosCafe / 1000, `Liquidación #${liq.consecutivo} - ${maquinaData.codigoSerial}`);
      }

      // Descontar Leche fallback
      if (idLeche && totalGramosLeche > 0) {
        await descontarInsumo(idLeche, totalGramosLeche / 1000, `Liquidación #${liq.consecutivo} - ${maquinaData.codigoSerial}`);
      }

      // Descontar Cocoa fallback
      if (idCocoa && totalGramosCocoa > 0) {
        await descontarInsumo(idCocoa, totalGramosCocoa / 1000, `Liquidación #${liq.consecutivo} - ${maquinaData.codigoSerial}`);
      }

      // Descontar Vasos y Mezcladores
      if (idVasos && totalTazasNetas > 0) {
        await descontarInsumo(idVasos, totalTazasNetas, `Liquidación #${liq.consecutivo} - ${maquinaData.codigoSerial}`);
      }

      if (idMezcl && totalTazasNetas > 0) {
        await descontarInsumo(idMezcl, totalTazasNetas, `Liquidación #${liq.consecutivo} - ${maquinaData.codigoSerial}`);
      }

      // C. Actualizar contador actual de la máquina con el valor más reciente
      const maxContadorRegistrado = Math.max(
        ...lineasCalculadas.map((l) => l.contadorActual),
        (maquinaData as any).contadorActual ?? 0
      );
      await tx.maquina.update({
        where: { empresaId: currentUser.empresaId,
            id: validatedData.maquinaId },
        data: { contadorActual: maxContadorRegistrado },
      });

      return { liq, totalTazasNetas, totalFacturado, lineasCalculadas };
    });

    const consecutivoGenerado = txResult.liq.consecutivo;
    const liquidacionId = txResult.liq.id;
    const { totalTazasNetas, totalFacturado, lineasCalculadas } = txResult;

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
      metodoPago: (validatedData.montoTransferencia || 0) > 0 && (validatedData.montoEfectivo || 0) > 0 ? "MIXTO" : (validatedData.montoTransferencia || 0) > 0 ? "TRANSFERENCIA" : "EFECTIVO",
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
      firmaClienteUrl: firmaClienteUrl || validatedData.firmaClienteBase64,
      notas: validatedData.notas,
    };

    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!baseUrl) {
      try {
        const { headers } = await import("next/headers");
        const headersList = headers();
        const host = headersList.get("x-forwarded-host") || headersList.get("host");
        const proto =
          headersList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
        if (host) {
          baseUrl = `${proto}://${host}`;
        }
      } catch {
        // Fallback si headers() no está disponible
      }
    }

    if (!baseUrl) {
      baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
    }

    let reciboPdfUrl = `${baseUrl}/api/liquidaciones/${liquidacionId}/pdf`;

    try {
      const { renderToBuffer } = await import("@react-pdf/renderer");
      const { LiquidacionReceiptPdf } = await import("@/components/pdf/LiquidacionReceiptPdf");
      const pdfElement = React.createElement(LiquidacionReceiptPdf, { data: pdfData }) as any;
      const pdfBuffer = await renderToBuffer(pdfElement);
      const uploadedUrl = await uploadPdfReceipt(pdfBuffer, consecutivoGenerado);
      if (uploadedUrl && uploadedUrl !== 'upload-failed' && !uploadedUrl.includes("demo.public.blob")) {
        reciboPdfUrl = uploadedUrl;
      }
    } catch (pdfError) {
      console.error("[registrarLiquidacion] Error generando o subiendo PDF:", pdfError);
    }

    // Actualizar Liquidación con la URL del PDF generado
    await prisma.liquidacion.update({
      where: { empresaId: currentUser.empresaId,
        id: liquidacionId },
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
      metodoPago: (validatedData.montoTransferencia || 0) > 0 && (validatedData.montoEfectivo || 0) > 0 ? "MIXTO" : (validatedData.montoTransferencia || 0) > 0 ? "TRANSFERENCIA" : "EFECTIVO",
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
