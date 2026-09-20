"use client";

import React, { useState } from "react";
import { Flame } from "lucide-react";
import { ReinicioSistemaModal } from "./ReinicioSistemaModal";

export const BotonReinicioSistema: React.FC = () => {
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalAbierto(true)}
        className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition-all group shadow-2xs"
        title="Borrar todos los datos y reiniciar el sistema"
      >
        <Flame className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
        <span>Reinicio de Fábrica</span>
      </button>

      {modalAbierto && <ReinicioSistemaModal onClose={() => setModalAbierto(false)} />}
    </>
  );
};
