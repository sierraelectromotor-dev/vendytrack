"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

export async function actualizarOrdenMaquinas(rutaId: string, maquinasIds: string[]) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("No auth");
  try {
    await prisma.$transaction(
      maquinasIds.map((id, index) =>
        prisma.maquina.update({
          where: {
              empresaId: currentUser.empresaId,
            id },
          data: { ordenRuta: index + 1 },
        })
      )
    );
    revalidatePath("/admin/rutas");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
