import React from "react";
import { obtenerDashboardRecaudos } from "@/actions/admin";
import { DashboardRecaudos } from "@/components/admin/DashboardRecaudos";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const res = await obtenerDashboardRecaudos();

  return (
    <DashboardRecaudos
      initialData={
        res.success && res.data
          ? (res.data as any)
          : { liquidaciones: [], clientes: [] }
      }
    />
  );
}
