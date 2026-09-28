"use client";

import { useState } from "react";
import { generarBackupJson } from "@/actions/backup";
import { DatabaseBackup, Download, UploadCloud, AlertTriangle } from "lucide-react";

export function BackupClient() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const res = await generarBackupJson();
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vendytrack_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert("Copia de seguridad descargada exitosamente.");
      } else {
        alert("Error al exportar: " + res.error);
      }
    } catch(e) {
      alert("Error crítico al exportar");
    }
    
    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-stone-800 flex items-center gap-2">
          <DatabaseBackup /> Gestión de Backups
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200 space-y-4">
          <h3 className="font-bold text-lg text-emerald-900 flex items-center gap-2">
            <Download className="text-emerald-600" /> Exportar Datos (Backup JSON)
          </h3>
          <p className="text-sm text-stone-600">
            Genera un archivo JSON con absolutamente todos los registros de la base de datos (Empresas, Usuarios, Clientes, Máquinas, Liquidaciones, Inventario, etc).
          </p>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            <Download className="w-5 h-5" />
            {isExporting ? "Generando JSON..." : "Descargar Copia de Seguridad"}
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 space-y-4">
          <h3 className="font-bold text-lg text-red-900 flex items-center gap-2">
            <UploadCloud className="text-red-600" /> Restaurar Datos
          </h3>
          <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm border border-red-100 flex gap-3">
            <AlertTriangle className="w-8 h-8 flex-shrink-0" />
            <p>
              <strong>¡Advertencia Peligrosa!</strong> La restauración a partir de JSON es destructiva. Limpiará toda la base de datos actual antes de inyectar los datos. 
              Por seguridad en arquitectura Multi-Tenant, la restauración se debe realizar directamente mediante scripts de base de datos (PostgreSQL / Neon) o Prisma Studio.
            </p>
          </div>
          <button disabled className="w-full py-3 bg-stone-300 text-stone-500 font-bold rounded-xl cursor-not-allowed">
            Restauración Deshabilitada en Producción
          </button>
        </div>
      </div>
    </div>
  );
}
