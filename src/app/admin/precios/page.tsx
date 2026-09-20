import React from "react";
import prisma from "@/lib/prisma";
import { PreciosManager } from "@/components/admin/PreciosManager";
import { DollarSign } from "lucide-react";

export default async function PreciosPage() {
  let maquinasData: Array<{
    id: string;
    codigoSerial: string;
    modelo: string;
    clienteNombre: string;
    sede: string;
    precios: Record<string, number>;
  }> = [];

  try {
    const maquinas = await prisma.maquina.findMany({
      include: {
        cliente: true,
        precios: true,
      },
      orderBy: { codigoSerial: "asc" },
    });

    if (maquinas.length > 0) {
      maquinasData = maquinas.map((m) => {
        const mapa: Record<string, number> = {};
        m.precios.forEach((p) => {
          mapa[p.bebida] = Number(p.precioUnitario);
        });

        return {
          id: m.id,
          codigoSerial: m.codigoSerial,
          modelo: m.modelo,
          clienteNombre: m.cliente.razonSocial,
          sede: m.cliente.sede,
          precios: mapa,
        };
      });
    }
  } catch (error) {
    console.warn("[PreciosPage] Fallback a datos mock:", error);
  }

  // Fallback demo si no hay datos en DB
  if (maquinasData.length === 0) {
    maquinasData = [
      {
        id: "maq-demo-01",
        codigoSerial: "MAQ-COL-2024-089",
        modelo: "Bianchi Soluble 4 Tolvas",
        clienteNombre: "Hospital Universitario San José",
        sede: "Sede Centro",
        precios: {
          CAPUCHINO_VAINILLA: 2500,
          CAPUCHINO_TRADICIONAL: 2500,
          MOCACCINO: 2800,
          CAFE_CORTO_EXPRESO: 1800,
          CAFE_LARGO_TINTO: 1800,
          LATTE: 2600,
          CHOCOLATE_CHOCOMILK: 2400,
        },
      },
      {
        id: "maq-demo-02",
        codigoSerial: "MAQ-COL-2024-112",
        modelo: "Necta Brio 3 Tolvas",
        clienteNombre: "Edificio Corporativo Torre 100",
        sede: "Chicó Norte",
        precios: {
          CAPUCHINO_VAINILLA: 3000,
          CAPUCHINO_TRADICIONAL: 3000,
          MOCACCINO: 3200,
          CAFE_CORTO_EXPRESO: 2000,
          CAFE_LARGO_TINTO: 2000,
          LATTE: 3000,
          CHOCOLATE_CHOCOMILK: 2800,
        },
      },
    ];
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-coffee-600 dark:text-amber-400" />
          Configuración de Precios por Máquina y Cliente
        </h2>
        <p className="text-xs text-stone-500">
          Personaliza las tarifas de cada una de las 7 bebidas para cada punto de atención
        </p>
      </div>

      <PreciosManager maquinas={maquinasData} />
    </div>
  );
}
