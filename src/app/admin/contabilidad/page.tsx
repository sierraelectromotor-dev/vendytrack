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
    gastosFijos: [],
    puntoEquilibrio: {
      gastosFijosTotales: 0,
      ventasActuales: 0,
      costosVariablesActuales: 0,
      margenContribucionPct: 0.65,
      puntoEquilibrioDinero: 0,
      tazasActuales: 0,
      precioPromedioTaza: 2500,
      costoVariablePromedioTaza: 850,
      margenContribucionTaza: 1650,
      puntoEquilibrioTazas: 0,
      porcentajeAlcanzado: 0,
      diferenciaDinero: 0,
      diferenciaTazas: 0,
      estaEnEquilibrio: false,
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
