import { MobileLiquidacionForm } from "@/components/liquidacion/MobileLiquidacionForm";

export const dynamic = "force-dynamic";

export default function NuevaLiquidacionPage({
  searchParams,
}: {
  searchParams: { maquinaId?: string };
}) {
  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 py-3 sm:py-6">
      <main className="max-w-lg mx-auto px-4 space-y-5">
        <MobileLiquidacionForm initialMaquinaId={searchParams.maquinaId} />
      </main>
    </div>
  );
}
