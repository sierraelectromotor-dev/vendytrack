"use client";

import React, { useState, useEffect } from "react";
import { UserCheck, Shield, Truck, Building } from "lucide-react";

export type RolApp = "ADMIN" | "OPERADOR_RUTA" | "CLIENTE";

export const RoleSwitcher: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<RolApp>("OPERADOR_RUTA");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Leer cookie 'vendytrack_role' si existe
    const match = document.cookie.match(new RegExp("(^| )vendytrack_role=([^;]+)"));
    if (match && (match[2] === "ADMIN" || match[2] === "OPERADOR_RUTA" || match[2] === "CLIENTE")) {
      setCurrentRole(match[2] as RolApp);
    }
  }, []);

  const handleRoleChange = (newRole: RolApp) => {
    // Guardar en cookie por 30 días
    document.cookie = `vendytrack_role=${newRole}; path=/; max-age=2592000`;
    setCurrentRole(newRole);
    setIsOpen(false);
    // Recargar para que el middleware y la UI tomen el nuevo rol
    window.location.reload();
  };

  const roleLabels: Record<RolApp, { label: string; icon: any; color: string }> = {
    OPERADOR_RUTA: {
      label: "Rutero / Operador",
      icon: Truck,
      color: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300",
    },
    ADMIN: {
      label: "Administrador",
      icon: Shield,
      color: "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300",
    },
    CLIENTE: {
      label: "Cliente",
      icon: Building,
      color: "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300",
    },
  };

  const currentConfig = roleLabels[currentRole];
  const IconComponent = currentConfig.icon;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all shadow-sm ${currentConfig.color}`}
      >
        <IconComponent className="w-3.5 h-3.5" />
        <span>Rol: {currentConfig.label}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-stone-900 shadow-xl border border-stone-200 dark:border-stone-800 z-50 p-1 space-y-1 animate-in fade-in zoom-in-95">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
            Cambiar Rol de Sesión
          </div>

          {(["OPERADOR_RUTA", "ADMIN", "CLIENTE"] as RolApp[]).map((r) => {
            const config = roleLabels[r];
            const Icon = config.icon;
            const isSelected = currentRole === r;

            return (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleChange(r)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-stone-100 dark:bg-stone-800 font-bold text-coffee-800 dark:text-amber-300"
                    : "text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{config.label}</span>
                </div>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
