import React from "react";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import DespachosManager from "@/components/admin/DespachosManager";

export const dynamic = "force-dynamic";

export default async function AdminDespachosPage() {
  await requireAdmin();

  const ordenes = await prisma.ordenDespacho.findMany({
    orderBy: { fechaCreacion: "desc" },
    include: {
      maquina: { include: { cliente: true } },
      cliente: true,
      operador: true,
      detalles: { include: { insumo: true } },
    },
  });

  const clientes = await prisma.cliente.findMany({
    include: { maquinas: true },
    orderBy: { razonSocial: "asc" },
  });

  const operadores = await prisma.user.findMany({
    where: { rol: "OPERADOR_RUTA" },
    orderBy: { name: "asc" },
  });

  const existencias = await prisma.existencia.findMany({
    where: { bodega: { maquinaId: null }, cantidad: { gt: 0 } },
    include: { insumo: true, lote: true },
  });

  return (
    <DespachosManager
      ordenes={ordenes}
      clientes={clientes}
      operadores={operadores}
      existencias={existencias}
    />
  );
}
