"use client";

import React, { useState } from "react";
import { ArrowUp, ArrowDown, Save, Loader2, GripVertical } from "lucide-react";
import { actualizarOrdenMaquinas } from "@/actions/rutas";
import { toast } from "sonner";

export function OrdenamientoMaquinasRuta({ 
  rutaId, 
  maquinasInciales 
}: { 
  rutaId: string; 
  maquinasInciales: any[] 
}) {
  const [maquinas, setMaquinas] = useState(maquinasInciales);
  const [isSaving, setIsSaving] = useState(false);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newM = [...maquinas];
    const temp = newM[index];
    newM[index] = newM[index - 1];
    newM[index - 1] = temp;
    setMaquinas(newM);
  };

  const moveDown = (index: number) => {
    if (index === maquinas.length - 1) return;
    const newM = [...maquinas];
    const temp = newM[index];
    newM[index] = newM[index + 1];
    newM[index + 1] = temp;
    setMaquinas(newM);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const ids = maquinas.map(m => m.id);
    const res = await actualizarOrdenMaquinas(rutaId, ids);
    setIsSaving(false);
    if (res.success) {
      toast.success("Orden de ruta guardado con éxito");
    } else {
      toast.error("Error al guardar el orden: " + res.error);
    }
  };

  if (maquinas.length === 0) {
    return (
      <p className="text-xs text-stone-400 italic">
        Aún no hay máquinas agregadas a esta ruta. Puedes asignarlas en la sección de Clientes y Máquinas.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        {maquinas.map((m, idx) => (
          <div
            key={m.id}
            className="bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-800 flex items-center gap-3 text-xs"
          >
            <div className="flex flex-col gap-1 items-center bg-white dark:bg-stone-900 rounded-md border border-stone-200 dark:border-stone-700 p-0.5 shadow-sm">
              <button 
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="text-stone-500 disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800 p-0.5 rounded"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => moveDown(idx)}
                disabled={idx === maquinas.length - 1}
                className="text-stone-500 disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800 p-0.5 rounded"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="bg-coffee-100 text-coffee-800 dark:bg-coffee-900/40 dark:text-coffee-300 font-bold px-1.5 py-0.5 rounded-md text-[10px]">
                  #{idx + 1}
                </span>
                <span className="font-bold text-stone-900 dark:text-white block">
                  {m.codigoSerial}
                </span>
              </div>
              <span className="text-stone-500 text-[11px] block mt-1">
                {m.clienteNombre} ({m.sede})
              </span>
              <span className="text-[10px] text-stone-400">
                {m.ubicacion}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar Nuevo Orden
      </button>
    </div>
  );
}

