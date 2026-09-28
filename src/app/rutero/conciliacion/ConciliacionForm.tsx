"use client";

import { useState, useRef } from "react";
import { cerrarTurno } from "@/actions/rutero";
import SignaturePad from "react-signature-canvas";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  totalEfectivo: number;
  totalTransferencias: number;
}

export default function ConciliacionForm({ totalEfectivo, totalTransferencias }: Props) {
  const [observaciones, setObservaciones] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signatureRef = useRef<SignaturePad>(null);
  const router = useRouter();

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    signatureRef.current?.clear();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast.error("La firma del administrador es requerida");
      return;
    }

    setIsSubmitting(true);
    try {
      const firmaBase64 = signatureRef.current.getTrimmedCanvas().toDataURL("image/png");
      await cerrarTurno(totalEfectivo, totalTransferencias, observaciones, firmaBase64);
      toast.success("Turno cerrado exitosamente");
      router.push("/rutero");
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al cerrar el turno");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg border">
        <h2 className="text-lg font-semibold mb-4">Resumen del Día</h2>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Total Efectivo a entregar:</span>
          <span className="text-xl font-bold text-green-600">
            ${totalEfectivo.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Transferencias:</span>
          <span className="text-xl font-bold text-blue-600">
            ${totalTransferencias.toLocaleString()}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observaciones (Opcional)
        </label>
        <textarea
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          rows={3}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Diferencias de caja, billetes falsos, etc..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Firma de quien recibe (Admin)
        </label>
        <div className="border-2 border-dashed rounded-lg bg-white">
          <SignaturePad
            ref={signatureRef}
            canvasProps={{
              className: "w-full h-48 rounded-lg cursor-crosshair touch-none",
            }}
          />
        </div>
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Limpiar firma
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-red-600 text-white font-bold py-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? "Cerrando turno..." : "Confirmar Cierre de Turno"}
      </button>
    </form>
  );
}
