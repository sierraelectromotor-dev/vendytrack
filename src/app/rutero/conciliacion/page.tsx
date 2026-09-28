import { getResumenDia } from "@/actions/rutero";
import ConciliacionForm from "./ConciliacionForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConciliacionPage() {
  const { totalEfectivo, totalTransferencias } = await getResumenDia();

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center mb-6">
        <Link href="/rutero" className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Conciliación de Turno</h1>
      </div>

      <ConciliacionForm
        totalEfectivo={totalEfectivo}
        totalTransferencias={totalTransferencias}
      />
    </div>
  );
}
