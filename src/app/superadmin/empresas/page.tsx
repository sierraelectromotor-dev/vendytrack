import { obtenerEmpresas } from "@/actions/superadmin";
import { EmpresasClient } from "./EmpresasClient";

export const metadata = {
  title: "Gestión de Empresas | Superadmin",
};

export default async function EmpresasPage() {
  const result = await obtenerEmpresas();
  
  if (!result.success) {
    return <div className="p-4 text-red-500">Error: {result.error}</div>;
  }

  return <EmpresasClient initialEmpresas={result.data || []} />;
}
