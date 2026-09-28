import React from "react";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { format } from "date-fns";
import { Package, MapPin, Clock, ArrowRight, Truck, ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OperadorDespachosPage() {
  const user = await requireUser();

  const ordenes = await prisma.ordenDespacho.findMany({
    where: {
      operadorId: user.id,
      estado: { in: ["CREADA", "EN_RUTA"] },
    },
    orderBy: { fechaCreacion: "asc" },
    include: {
      maquina: { include: { cliente: true } },
      cliente: true,
      detalles: true,
    },
  });

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 pb-20">
      <div className="max-w-lg mx-auto">
        <header className="bg-coffee-900 text-white p-6 rounded-b-[2rem] shadow-md mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
            <Truck className="w-48 h-48 -mt-10 -mr-10" />
          </div>
          
          <div className="relative z-10 flex items-center gap-3 mb-4">
            <Link href="/" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <ChevronLeft className="w-5 h-5 text-white" />
            </Link>
            <h1 className="text-2xl font-bold">Mis Despachos</h1>
          </div>
          
          <p className="text-coffee-100 text-sm opacity-90 relative z-10 ml-11">
            {ordenes.length} despachos pendientes
          </p>
        </header>

        <div className="px-4 space-y-4">
          {ordenes.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 text-center shadow-sm">
              <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-stone-900 dark:text-white font-bold">No hay despachos</h3>
              <p className="text-stone-500 text-sm mt-1">
                No tienes órdenes de despacho asignadas actualmente.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-2 bg-coffee-600 hover:bg-coffee-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Volver al inicio
              </Link>
            </div>
          ) : (
            ordenes.map((orden) => (
              <Link key={orden.id} href={`/rutero/despachos/${orden.id}`}>
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 shadow-sm  transition-transform flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase mb-2">
                        {orden.estado === "CREADA" && <Clock className="w-3 h-3" />}
                        {orden.estado === "EN_RUTA" && <Truck className="w-3 h-3" />}
                        {orden.estado.replace("_", " ")}
                      </span>
                      <h3 className="font-bold text-stone-900 dark:text-white">
                        {orden.maquina?.codigoSerial || orden.cliente?.razonSocial}
                      </h3>
                      <p className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {orden.cliente?.razonSocial}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-stone-900 dark:text-stone-300">
                        #{orden.consecutivo}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-1">
                        {format(new Date(orden.fechaCreacion), "dd/MM HH:mm")}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-1 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-stone-400" />
                      {orden.detalles.length} ítem(s) para entregar
                    </div>
                    <div className="w-8 h-8 rounded-full bg-coffee-50 dark:bg-stone-800 flex items-center justify-center text-coffee-600 dark:text-amber-400">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

