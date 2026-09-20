"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { BodegaData, RutaConPuntos } from "./MapaRutas";
import { Loader2 } from "lucide-react";

const MapaRutasClient = dynamic(() => import("./MapaRutas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-stone-500 text-xs shadow-sm">
      <Loader2 className="w-6 h-6 animate-spin text-amber-600 dark:text-amber-400" />
      <span>Cargando mapa interactivo de rutas...</span>
    </div>
  ),
});

export default function MapaRutasWrapper(props: {
  bodega: BodegaData;
  rutas: RutaConPuntos[];
}) {
  return <MapaRutasClient {...props} />;
}
