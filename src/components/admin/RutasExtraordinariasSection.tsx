"use client";

import React, { useState, useTransition } from "react";
import { AlertOctagon, PlusCircle } from "lucide-react";
import { VisitaExtraordinariaItem, obtenerVisitasExtraordinarias } from "@/actions/visitas";
import { CrearVisitaModal } from "./CrearVisitaModal";
import { VisitasExtraordinariasList } from "./VisitasExtraordinariasList";

interface RutasExtraordinariasSectionProps {
  maquinas: {
    id: string;
    codigoSerial: string;
    clienteNombre: string;
    sede: string;
    ubicacion: string;
  }[];
  ruteros: {
    id: string;
    name: string;
    email: string;
  }[];
  initialVisitas: VisitaExtraordinariaItem[];
}

export default function RutasExtraordinariasSection({
  maquinas,
  ruteros,
  initialVisitas,
}: RutasExtraordinariasSectionProps) {
  const [visitas, setVisitas] = useState<VisitaExtraordinariaItem[]>(initialVisitas);
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [isPending, startTransition] = useTransition();

  const recargarVisitas = () => {
    startTransition(async () => {
      const res = await obtenerVisitasExtraordinarias();
      if (res.success && res.data) {
        setVisitas(res.data);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Barra de Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white">
              Servicio de Emergencias y Visitas Extraordinarias
            </h3>
            <p className="text-[11px] text-stone-500">
              ¿Llamó un cliente por falla técnica o falta de producto? Despacha una orden inmediata sin anular las liquidaciones de hoy.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalCrearAbierto(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>+ Asignar Visita Extraordinaria</span>
        </button>
      </div>

      {/* Lista de Visitas */}
      <VisitasExtraordinariasList
        visitas={visitas}
        onVisitaCancelada={recargarVisitas}
      />

      {/* Modal Crear */}
      {modalCrearAbierto && (
        <CrearVisitaModal
          maquinas={maquinas}
          ruteros={ruteros}
          onClose={() => setModalCrearAbierto(false)}
          onCreated={recargarVisitas}
        />
      )}
    </div>
  );
}
