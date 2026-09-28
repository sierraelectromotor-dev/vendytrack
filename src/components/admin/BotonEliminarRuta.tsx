"use client";

import React, { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { eliminarRuta } from "@/actions/admin";
import { toast } from "sonner";

export function BotonEliminarRuta({ rutaId, nombre }: { rutaId: string, nombre: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la ruta "${nombre}"? Las máquinas asociadas quedarán sin ruta asignada.`)) {
      return;
    }

    setIsDeleting(true);
    const res = await eliminarRuta(rutaId);
    setIsDeleting(false);

    if (res.success) {
      toast.success("Ruta eliminada correctamente");
    } else {
      toast.error("Error al eliminar la ruta: " + res.error);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors disabled:opacity-50"
      title="Eliminar Ruta"
    >
      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}
