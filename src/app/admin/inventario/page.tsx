import React from "react";
import { obtenerInventarioBodega } from "@/actions/admin";
import { InventarioBodegaManager } from "@/components/admin/InventarioBodegaManager";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const res = await obtenerInventarioBodega();

  return (
    <InventarioBodegaManager
      initialData={
        res.success && res.data
          ? (res.data as any)
          : { insumos: [], movimientos: [] }
      }
    />
  );
}
