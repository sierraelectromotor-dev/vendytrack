"use client";

import React, { useState } from "react";
import { Wallet, Search, CheckCircle2, Clock, AlertCircle, FileText, MessageCircle } from "lucide-react";
import { registrarAbono } from "@/actions/cartera";
import { useRouter } from "next/navigation";
import { EstadoPago, MetodoPago } from "@prisma/client";

type Abono = {
  id: string;
  monto: number;
  metodoPago: string;
  fecha: string;
};

type CuentaCobrar = {
  id: string;
  consecutivo: number;
  clienteNombre: string;
  clienteWhatsapp?: string | null;
  origen: string;
  pdfUrl?: string | null;
  montoTotal: number;
  saldoPendiente: number;
  estadoPago: string;
  fechaCreacion: string;
  fechaVencimiento: string | null;
  abonos: Abono[];
};

export function CarteraClient({ cuentas, userId }: { cuentas: CuentaCobrar[], userId: string }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaCobrar | null>(null);
  const [montoAbono, setMontoAbono] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.EFECTIVO);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCuentas = cuentas.filter(c => 
    c.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.consecutivo.toString().includes(searchTerm)
  );

  const handleOpenModal = (cuenta: CuentaCobrar) => {
    setSelectedCuenta(cuenta);
    setMontoAbono(cuenta.saldoPendiente.toString());
    setMetodoPago(MetodoPago.EFECTIVO);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCuenta(null);
    setMontoAbono("");
  };

  const handleSubmitAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCuenta) return;

    const monto = Number(montoAbono);
    if (isNaN(monto) || monto <= 0 || monto > selectedCuenta.saldoPendiente) {
      alert("Monto invǭlido");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registrarAbono({
        cuentaCobrarId: selectedCuenta.id,
        monto,
        metodoPago,
        registradoPorId: userId,
      });

      if (res.success) {
        alert("Abono registrado con xito");
        handleCloseModal();
        router.refresh();
      } else {
        alert((res as any).error || "Error al registrar el abono");
      }
    } catch (error) {
      alert("Ocurri un error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'PAGADO_TOTAL':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium rounded-full"><CheckCircle2 className="w-3 h-3" /> Pagado</span>;
      case 'PAGADO_PARCIAL':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-medium rounded-full"><Clock className="w-3 h-3" /> Parcial</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium rounded-full"><AlertCircle className="w-3 h-3" /> Pendiente</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o consecutivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500 transition-shadow outline-none dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 dark:bg-stone-900/50 text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="px-6 py-4 font-medium">Cuenta</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Saldo</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredCuentas.length > 0 ? (
                filteredCuentas.map((cuenta) => {
                  // Calcular días vencidos
                  const fechaReferencia = cuenta.fechaVencimiento ? new Date(cuenta.fechaVencimiento) : new Date(cuenta.fechaCreacion);
                  const diasVencidos = Math.floor((Date.now() - fechaReferencia.getTime()) / (1000 * 60 * 60 * 24));
                  const isVencido = cuenta.estadoPago !== 'PAGADO_TOTAL' && diasVencidos > 0;

                  return (
                    <tr key={cuenta.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-stone-900 dark:text-white flex items-center gap-2">
                          #{cuenta.consecutivo}
                        </div>
                        <div className="text-[11px] font-medium text-coffee-600 bg-coffee-50 dark:bg-coffee-900/30 dark:text-coffee-300 inline-block px-1.5 py-0.5 rounded mt-1 mb-1">
                          {cuenta.origen}
                        </div>
                        <div className="text-xs text-stone-500">
                          {new Date(cuenta.fechaCreacion).toLocaleDateString()}
                        </div>
                        {isVencido && (
                          <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1">
                            {diasVencidos} días {cuenta.fechaVencimiento ? 'vencido' : 'desde emisión'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-stone-900 dark:text-stone-200">
                          {cuenta.clienteNombre}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-stone-600 dark:text-stone-300">
                        {formatCurrency(cuenta.montoTotal)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-amber-600 dark:text-amber-500">
                          {formatCurrency(cuenta.saldoPendiente)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(cuenta.estadoPago)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {cuenta.pdfUrl && (
                            <>
                              <a
                                href={cuenta.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-stone-800 rounded-lg transition-colors border border-transparent shadow-xs"
                                title="Ver Recibo PDF"
                              >
                                <FileText className="w-4 h-4" />
                              </a>
                              {cuenta.clienteWhatsapp && (
                                <a
                                  href={`https://wa.me/${cuenta.clienteWhatsapp.replace(/\D/g, '')}?text=Hola,%20te%20compartimos%20el%20recibo%20de%20tu%20cuenta:%20${encodeURIComponent(cuenta.pdfUrl)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-stone-800 rounded-lg transition-colors border border-transparent shadow-xs"
                                  title="Enviar por WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </a>
                              )}
                            </>
                          )}
                          {cuenta.estadoPago !== 'PAGADO_TOTAL' && (
                            <button
                              onClick={() => handleOpenModal(cuenta)}
                              className="px-3 py-1.5 bg-coffee-600 hover:bg-coffee-700 text-white text-xs font-medium rounded-lg transition-colors ml-2"
                            >
                              Abonar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-500">
                    <Wallet className="w-12 h-12 mx-auto text-stone-300 dark:text-stone-600 mb-3" />
                    <p>No se encontraron cuentas por cobrar.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedCuenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                Registrar Abono - #{selectedCuenta.consecutivo}
              </h3>
              <p className="text-sm text-stone-500 mt-1">
                Cliente: {selectedCuenta.clienteNombre}
              </p>
            </div>
            
            <form onSubmit={handleSubmitAbono} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Saldo Pendiente
                </label>
                <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl text-lg font-bold text-amber-600 dark:text-amber-500">
                  {formatCurrency(selectedCuenta.saldoPendiente)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Monto a Abonar (COP)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedCuenta.saldoPendiente}
                  step="1"
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-coffee-500 outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Mtodo de Pago
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                  className="w-full px-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-coffee-500 outline-none dark:text-white"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-coffee-600 hover:bg-coffee-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Registrando..." : "Confirmar Abono"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
