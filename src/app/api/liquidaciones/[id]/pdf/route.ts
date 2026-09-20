import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { LiquidacionReceiptPdf } from "@/components/pdf/LiquidacionReceiptPdf";
import { formatFechaColombia } from "@/lib/utils";
import { BEBIDAS_CATALOGO } from "@/types/liquidacion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const liquidacionId = params.id;

    // Buscar la liquidación en Prisma
    const liq = await prisma.liquidacion.findUnique({
      where: { id: liquidacionId },
      include: {
        cliente: true,
        maquina: true,
        operador: true,
        detalles: true,
      },
    }).catch(() => null);

    if (!liq) {
      return NextResponse.json(
        { error: "Liquidación no encontrada" },
        { status: 404 }
      );
    }

    const nombreBebidasMap = Object.fromEntries(
      BEBIDAS_CATALOGO.map((b) => [b.id, b.nombre])
    );

    let totalTazasNetas = 0;
    const detallesFormateados = liq.detalles.map((d) => {
      totalTazasNetas += d.tazasNetas;
      return {
        bebida: d.bebida as any,
        nombreBebida: nombreBebidasMap[d.bebida] || d.bebida,
        contadorAnterior: d.contadorAnterior,
        contadorActual: d.contadorActual,
        bebidasDanadas: d.bebidasDanadas,
        tazasNetas: d.tazasNetas,
        precioUnitario: Number(d.precioUnitario),
        subtotal: Number(d.subtotal),
      };
    });

    const pdfData = {
      consecutivo: liq.consecutivo,
      fecha: formatFechaColombia(liq.fecha),
      cliente: {
        razonSocial: liq.cliente.razonSocial,
        sede: liq.cliente.sede,
        direccion: liq.cliente.direccion,
        contacto: liq.cliente.contacto,
        whatsapp: liq.cliente.whatsapp,
      },
      maquina: {
        codigoSerial: liq.maquina.codigoSerial,
        modelo: liq.maquina.modelo,
        ubicacion: liq.maquina.ubicacion,
      },
      operadorNombre: liq.operador.name,
      metodoPago: liq.metodoPago,
      detalles: detallesFormateados,
      totales: {
        totalTazasNetas,
        totalFacturado: Number(liq.totalFacturado),
      },
      firmaClienteUrl: liq.firmaClienteUrl,
      notas: liq.notas || undefined,
    };

    const pdfElement = React.createElement(LiquidacionReceiptPdf, { data: pdfData }) as any;
    const pdfBuffer = await renderToBuffer(pdfElement);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="recibo-liq-${pdfData.consecutivo}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("[PDF Route Handler] Error:", error);
    return NextResponse.json(
      { error: "Error generando el archivo PDF", details: error.message },
      { status: 500 }
    );
  }
}
