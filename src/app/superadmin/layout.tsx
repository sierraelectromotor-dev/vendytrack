import { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";

export default async function SuperadminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  
  if (!user || user.rol !== "SUPERADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <header className="bg-stone-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="text-amber-400" />
          <h1 className="font-bold text-lg">Superadmin Console</h1>
        </div>
        <div className="flex items-center space-x-4">
          <nav className="space-x-4 text-sm font-medium">
            <Link href="/superadmin/empresas" className="hover:text-amber-400 transition">Empresas</Link>
            <Link href="/superadmin/backups" className="hover:text-amber-400 transition">Backups (JSON)</Link>
            <Link href="/admin" className="text-stone-400 hover:text-white transition">Ir a ERP</Link>
          </nav>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl text-xs font-semibold transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
