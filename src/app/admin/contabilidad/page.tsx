import React from "react";
import { obtenerResumenContable } from "@/actions/contabilidad";
import ContabilidadView from "@/components/admin/ContabilidadView";

export default async function ContabilidadPage() {
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  const res = await obtenerResumenContable({ mes: mesActual, anio: anioActual });

  const initialData = res.data || {
    totalIngresos: 0,
    totalGastos: 0,
    utilidadNeta: 0,
    margenOperativo: 0,
    transacciones: [],
    desgloseGastos: [],
    metodosPago: {
      efectivo: 0,
      transferencia: 0,
    },
  };

  return (
    <ContabilidadView
      initialData={initialData}
      mesInicial={mesActual}
      anioInicial={anioActual}
    />
  );
}
