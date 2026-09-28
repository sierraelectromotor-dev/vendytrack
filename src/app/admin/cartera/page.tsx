import React from "react";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CarteraClient } from "./CarteraClient";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CarteraPage() {
  const user = await getCurrentUser();
  if (!user || (user.rol !== "ADMIN" && user.rol !== "SUPERADMIN")) {
    redirect("/login");
  }

  const cuentasCobrar = await prisma.cuentaCobrar.findMany({
    where: user.rol === "SUPERADMIN" ? {} : { empresaId: user.empresaId },
    include: {
      cliente: true,
      abonos: {
        orderBy: { fecha: "desc" },
      },
      liquidaciones: { select: { id: true, consecutivo: true, reciboPdfUrl: true } },
      ordenesDespacho: { select: { consecutivo: true, tipo: true } }
    },
    orderBy: {
      fechaCreacion: "desc",
    },
  });

  // Serialization for safe passing to client component
  const cuentasSerialized = cuentasCobrar.map(c => {
    let origen = "Desconocido";
    let pdfUrl: string | null = null;
    
    if (c.liquidaciones && c.liquidaciones.length > 0) {
      origen = `LiquidaciÃ³n #${c.liquidaciones[0].consecutivo}`;
      pdfUrl = (!c.liquidaciones[0].reciboPdfUrl || c.liquidaciones[0].reciboPdfUrl === 'upload-failed') ? `/api/liquidaciones/${c.liquidaciones[0].id}/pdf` : c.liquidaciones[0].reciboPdfUrl;
    } else if (c.ordenesDespacho && c.ordenesDespacho.length > 0) {
      const tipo = c.ordenesDespacho[0].tipo === "VENTA_BOLSA" ? "Venta Directa" : "Despacho";
      origen = `${tipo} #${c.ordenesDespacho[0].consecutivo}`;
    }

    return {
      id: c.id,
      consecutivo: c.consecutivo,
      clienteNombre: c.cliente.razonSocial,
      clienteWhatsapp: c.cliente.whatsapp,
      origen,
      pdfUrl,
      montoTotal: Number(c.montoTotal),
      saldoPendiente: Number(c.saldoPendiente),
      estadoPago: c.estadoPago,
      fechaCreacion: c.fechaCreacion.toISOString(),
      fechaVencimiento: c.fechaVencimiento?.toISOString() || null,
      abonos: c.abonos.map(a => ({
        id: a.id,
        monto: Number(a.monto),
        metodoPago: a.metodoPago,
        fecha: a.fecha.toISOString(),
      }))
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-stone-900 dark:text-white flex items-center gap-2 tracking-tight">
          <Wallet className="w-6 h-6 text-coffee-700 dark:text-amber-400" />
          Cartera y Cuentas por Cobrar
        </h2>
        <p className="text-xs text-stone-500">
          Administracin de cuentas por cobrar, abonos y estado de pagos de clientes
        </p>
      </div>

      <CarteraClient cuentas={cuentasSerialized} userId={user.id} />
    </div>
  );
}



