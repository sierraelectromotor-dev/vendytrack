import prisma from "@/lib/prisma";
import { getFormulas } from "@/actions/produccion";
import ProduccionClient from "./ProduccionClient";

export const metadata = {
  title: "Producción - VendyTrack"
};

export const dynamic = "force-dynamic";

export default async function ProduccionPage() {
  const [formulasRes, insumos] = await Promise.all([
    getFormulas(),
    prisma.insumo.findMany({
      include: {
        existencias: {
          include: {
            lote: true,
            bodega: true,
          }
        }
      },
      orderBy: { nombre: 'asc' }
    })
  ]);

  // Filtrar existencias solo para la bodega principal y que tengan cantidad > 0
  const insumosProcesados = insumos.map((insumo: any) => ({
    ...insumo,
    existencias: insumo.existencias.filter(
      (e: any) => e.bodega.tipo === "PRINCIPAL" && Number(e.cantidad) > 0
    )
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Módulo de Producción
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Gestiona las fórmulas, recetas y la producción de insumos compuestos.
        </p>
      </div>
      
      <ProduccionClient 
        formulas={formulasRes.data || []} 
        insumos={insumosProcesados}
      />
    </div>
  );
}
