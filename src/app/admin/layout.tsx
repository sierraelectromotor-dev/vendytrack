import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminNavigationLayout } from "@/components/admin/AdminNavigationLayout";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  let empresaNombre = "Vending Institucional";
  if (currentUser?.empresaId) {
    try {
      const empresa = await prisma.empresa.findUnique({
        where: { id: currentUser.empresaId },
        select: { nombre: true },
      });
      if (empresa?.nombre) {
        empresaNombre = empresa.nombre;
      }
    } catch (e) {
      console.warn("No se pudo obtener el nombre de la empresa:", e);
    }
  }

  return (
    <AdminNavigationLayout
      currentUser={currentUser}
      empresaNombre={empresaNombre}
    >
      {children}
    </AdminNavigationLayout>
  );
}
