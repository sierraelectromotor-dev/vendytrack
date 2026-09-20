"use client";

import React, { useState, useTransition } from "react";
import { X, Building2, MapPin, Search, Phone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { guardarBodegaPrincipal } from "@/actions/admin";

interface ConfigurarBodegaModalProps {
  bodega: {
    nombre: string;
    direccion: string;
    latitud: number;
    longitud: number;
    telefono?: string | null;
  };
  onClose: () => void;
  onSaved?: () => void;
}

export const ConfigurarBodegaModal: React.FC<ConfigurarBodegaModalProps> = ({
  bodega,
  onClose,
  onSaved,
}) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [direccion, setDireccion] = useState(bodega.direccion || "");
  const [latitud, setLatitud] = useState<number>(bodega.latitud || 4.64828);
  const [longitud, setLongitud] = useState<number>(bodega.longitud || -74.11667);
  const [buscandoGeo, setBuscandoGeo] = useState(false);
  const [geoMensaje, setGeoMensaje] = useState<string | null>(null);

  // Geocodificación asistida con OpenStreetMap Nominatim
  const buscarCoordenadas = async () => {
    if (!direccion.trim()) {
      setGeoMensaje("Ingresa primero una dirección.");
      return;
    }

    setBuscandoGeo(true);
    setGeoMensaje(null);

    try {
      const query = encodeURIComponent(`${direccion}, Colombia`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setLatitud(lat);
        setLongitud(lon);
        setGeoMensaje(`✓ Ubicación encontrada: ${data[0].display_name.slice(0, 60)}...`);
      } else {
        setGeoMensaje("No se encontraron coordenadas automáticas. Puedes ingresarlas manualmente.");
      }
    } catch (e) {
      setGeoMensaje("Error al consultar el servicio de geocodificación.");
    } finally {
      setBuscandoGeo(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.set("latitud", latitud.toString());
    formData.set("longitud", longitud.toString());

    startTransition(async () => {
      const res = await guardarBodegaPrincipal(formData);
      if (res.success) {
        setSuccess(true);
        if (onSaved) onSaved();
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setError(res.error || "Error al guardar la configuración de la bodega");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-amber-500/10 dark:bg-amber-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-sm">
                Configurar Bodega Principal
              </h3>
              <p className="text-[11px] text-stone-500">
                Punto de partida y retorno para todos los circuitos de rutas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Bodega principal guardada con éxito</span>
            </div>
          )}

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Nombre de la Bodega *
            </label>
            <input
              type="text"
              name="nombre"
              required
              defaultValue={bodega.nombre || "Bodega Central VendyTrack"}
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Dirección Principal *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="direccion"
                required
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="ej. Calle 13 # 68-35, Bogotá"
                className="flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-amber-500 font-medium"
              />
              <button
                type="button"
                onClick={buscarCoordenadas}
                disabled={buscandoGeo}
                className="px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-700 dark:text-stone-300 font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                title="Obtener coordenadas desde la dirección"
              >
                {buscandoGeo ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                )}
                <span>Buscar GPS</span>
              </button>
            </div>
            {geoMensaje && (
              <p className="text-[11px] text-stone-500 mt-1 italic">{geoMensaje}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Latitud GPS *
              </label>
              <input
                type="number"
                step="any"
                required
                value={latitud}
                onChange={(e) => setLatitud(parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Longitud GPS *
              </label>
              <input
                type="number"
                step="any"
                required
                value={longitud}
                onChange={(e) => setLongitud(parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Teléfono de Contacto (Opcional)
            </label>
            <input
              type="text"
              name="telefono"
              defaultValue={bodega.telefono || ""}
              placeholder="ej. +57 300 123 4567"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Guardar Bodega</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
