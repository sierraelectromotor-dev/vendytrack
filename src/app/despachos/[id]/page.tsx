import React from "react";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, MapPin, Package, Clock, Truck, CheckCircle } from "lucide-react";
import { EntregaForm } from "@/components/despachos/EntregaForm";

export const dynamic = "force-dynamic";

export default async function DetalleDespachoPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  
  const orden = await prisma.ordenDespacho.findUnique({
    where: { id: params.id },
    include: {
      maquina: { include: { cliente: true } },
      cliente: true,
      detalles: {
        include: {
          insumo: true,
          lote: true,
        }
      },
    },
  });

  if (!orden) {
    notFound();
  }

  // Si el usuario no es el operador asignado ni un admin, no debera verlo, 
  // pero para el MVP podemos relajar o restringirlo.
  if (orden.operadorId !== user.id && user.rol !== "ADMIN") {
    notFound();
  }

  const destinoNombre = orden.maquina?.codigoSerial || orden.cliente?.razonSocial || "Destino desconocido";
  const destinoDireccion = orden.cliente?.direccion || "Dirección no registrada";

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 pb-20">
      <div className="max-w-lg mx-auto">
        <header className="bg-coffee-900 text-white px-4 py-4 sticky top-0 z-20 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/despachos" className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="font-bold">Orden #{orden.consecutivo}</h1>
              <p className="text-xs text-coffee-200">
                {format(new Date(orden.fechaCreacion), "dd MMM yyyy, HH:mm")}
              </p>
            </div>
          </div>
          
          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
            orden.estado === "CREADA" ? "bg-amber-500/20 text-amber-300" :
            orden.estado === "EN_RUTA" ? "bg-blue-500/20 text-blue-300" :
            orden.estado === "ENTREGADA" ? "bg-emerald-500/20 text-emerald-300" :
            "bg-red-500/20 text-red-300"
          }`}>
            {orden.estado.replace("_", " ")}
          </div>
        </header>

        <main className="p-4 space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 shadow-sm">
            <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Información de Entrega</h2>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-coffee-100 dark:bg-stone-800 flex items-center justify-center text-coffee-600 dark:text-amber-400 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-stone-900 dark:text-white">{destinoNombre}</p>
                <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5">{destinoDireccion}</p>
                {orden.cliente?.whatsapp && (
                  <p className="text-sm text-stone-500 mt-1">Tel: {orden.cliente.whatsapp}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 shadow-sm">
            <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" /> Resumen de Insumos ({orden.detalles.length})
            </h2>
            
            <div className="space-y-3">
              {orden.detalles.map((detalle) => (
                <div key={detalle.id} className="flex justify-between items-center py-2 border-b border-stone-100 dark:border-stone-800 last:border-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-stone-900 dark:text-white text-sm">
                      {detalle.insumo.nombre}
                    </p>
                    <p className="text-xs text-stone-500">
                      Lote: {detalle.lote.numeroLote}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-coffee-700 dark:text-amber-400">
                      {detalle.cantidad} <span className="text-xs font-medium text-stone-500">{detalle.insumo.unidadMedida}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formulario de entrega (Marcar en ruta, firmar y entregar) */}
          {orden.estado !== "ENTREGADA" && orden.estado !== "CANCELADA" && (
            <EntregaForm ordenId={orden.id} estadoActual={orden.estado} tipoDespacho={orden.tipo} />
          )}

          {orden.estado === "ENTREGADA" && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-5 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-bold text-emerald-900 dark:text-emerald-100">Orden Entregada</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                La entrega se completó exitosamente el {format(new Date(orden.fechaEntrega || new Date()), "dd/MM/yyyy a las HH:mm")}.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
