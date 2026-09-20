import React from "react";
import { obtenerUsuarios } from "@/actions/admin";
import { getCurrentUser } from "@/lib/auth";
import { Users } from "lucide-react";
import { UsuariosManager } from "@/components/admin/UsuariosManager";

export default async function RuterosPage() {
  const [usuariosRes, currentUser] = await Promise.all([
    obtenerUsuarios(),
    getCurrentUser(),
  ]);

  const usuarios = usuariosRes.data || [];

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-coffee-600 dark:text-amber-400" />
          Equipo y Usuarios del Sistema
        </h2>
        <p className="text-xs text-stone-500">
          Gestión de personal de campo (ruteros) y administradores, edición de nombres, credenciales y bajas
        </p>
      </div>

      {/* Gestor Interactivo de Usuarios */}
      <UsuariosManager
        usuarios={usuarios}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}
