"use client";

import React, { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Building2,
  Navigation,
  Truck,
  Coffee,
  ExternalLink,
  Settings,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";
import { ConfigurarBodegaModal } from "./ConfigurarBodegaModal";

export interface MaquinaPunto {
  id: string;
  codigoSerial: string;
  clienteNombre: string;
  sede: string;
  direccion: string;
  ubicacion: string;
  latitud: number | null;
  longitud: number | null;
  tieneGpsPropio?: boolean;
}

export interface RutaConPuntos {
  id: string;
  nombre: string;
  descripcion?: string | null;
  diasFrecuencia?: string | null;
  operadorId?: string | null;
  operadorNombre: string;
  maquinas: MaquinaPunto[];
}

export interface BodegaData {
  id: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  telefono?: string | null;
}

interface MapaRutasProps {
  bodega: BodegaData;
  rutas: RutaConPuntos[];
}

// Colores visuales atractivos para distinguir rutas
const COLORES_RUTAS = [
  "#d97706", // Amber 600
  "#2563eb", // Blue 600
  "#059669", // Emerald 600
  "#7c3aed", // Violet 600
  "#dc2626", // Red 600
  "#0891b2", // Cyan 600
];

export default function MapaRutas({ bodega, rutas }: MapaRutasProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersGroupRef = useRef<any>(null);

  const [rutaSeleccionadaId, setRutaSeleccionadaId] = useState<string>("TODAS");
  const [modalBodegaAbierto, setModalBodegaAbierto] = useState(false);
  const [bodegaActual, setBodegaActual] = useState<BodegaData>(bodega);

  // Filtrar rutas según selección
  const rutasAMostrar =
    rutaSeleccionadaId === "TODAS"
      ? rutas
      : rutas.filter((r) => r.id === rutaSeleccionadaId);

  // Inicializar Leaflet
  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;
      const L = (await import("leaflet")).default;

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const initialLat = bodegaActual.latitud || 4.64828;
        const initialLng = bodegaActual.longitud || -74.11667;

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 12,
          scrollWheelZoom: true,
        });

        // Capa de OpenStreetMap (estándar limpio y rápido)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        layersGroupRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      if (!isMounted) return;
      dibujarMapa(L);
    }

    initLeaflet();

    return () => {
      isMounted = false;
    };
  }, [bodegaActual]);

  // Redibujar capas al cambiar ruta seleccionada
  useEffect(() => {
    async function updateLayers() {
      if (!mapInstanceRef.current) return;
      const L = (await import("leaflet")).default;
      dibujarMapa(L);
    }
    updateLayers();
  }, [rutaSeleccionadaId, rutas]);

  const dibujarMapa = (L: any) => {
    if (!mapInstanceRef.current || !layersGroupRef.current) return;

    layersGroupRef.current.clearLayers();
    const bounds: [number, number][] = [];

    // 1. Marcador de Bodega Principal
    const bLat = bodegaActual.latitud;
    const bLng = bodegaActual.longitud;
    bounds.push([bLat, bLng]);

    const bodegaIconHtml = `
      <div style="
        background: #f59e0b;
        color: #1c1917;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        font-weight: 900;
        font-size: 18px;
      ">
        🏢
      </div>
    `;

    const bodegaIcon = L.divIcon({
      html: bodegaIconHtml,
      className: "custom-bodega-marker",
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -20],
    });

    const bodegaMarker = L.marker([bLat, bLng], { icon: bodegaIcon });
    bodegaMarker.bindPopup(`
      <div style="font-family: inherit; min-width: 180px; padding: 4px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="font-size: 14px;">🏢</span>
          <strong style="color: #1c1917; font-size: 13px;">${bodegaActual.nombre}</strong>
        </div>
        <p style="margin: 0; font-size: 11px; color: #57534e;">${bodegaActual.direccion}</p>
        <div style="margin-top: 6px; padding: 4px 8px; background: #fef3c7; color: #92400e; border-radius: 6px; font-size: 10px; font-weight: bold; text-align: center;">
          Punto de Partida y Retorno
        </div>
      </div>
    `);
    layersGroupRef.current.addLayer(bodegaMarker);

    // 2. Paradas y Trazado por cada Ruta
    rutasAMostrar.forEach((ruta, rIdx) => {
      const color = COLORES_RUTAS[rIdx % COLORES_RUTAS.length];
      const coordenadasCircuito: [number, number][] = [[bLat, bLng]];

      ruta.maquinas.forEach((m, mIdx) => {
        // Si no tiene coordenadas, calculamos una posición referencial cercana para no perder la parada
        const pLat =
          m.latitud !== null && !isNaN(m.latitud)
            ? m.latitud
            : bLat + (Math.sin((rIdx + 1) * 2 + mIdx) * 0.035);
        const pLng =
          m.longitud !== null && !isNaN(m.longitud)
            ? m.longitud
            : bLng + (Math.cos((rIdx + 1) * 2 + mIdx) * 0.035);

        coordenadasCircuito.push([pLat, pLng]);
        bounds.push([pLat, pLng]);

        const stopNumber = mIdx + 1;
        const markerHtml = `
          <div style="
            background: ${color};
            color: #ffffff;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            font-weight: 800;
            font-size: 12px;
          ">
            ${stopNumber}
          </div>
        `;

        const stopIcon = L.divIcon({
          html: markerHtml,
          className: "custom-stop-marker",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        });

        const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pLat},${pLng}`;

        const marker = L.marker([pLat, pLng], { icon: stopIcon });
        marker.bindPopup(`
          <div style="font-family: inherit; min-width: 200px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
              <span style="font-weight: 800; font-size: 11px; background: ${color}; color: white; padding: 2px 6px; border-radius: 6px;">
                Parada #${stopNumber}
              </span>
              <span style="font-size: 10px; color: #78716c;">${ruta.nombre}</span>
            </div>
            <strong style="display: block; color: #1c1917; font-size: 13px;">${m.clienteNombre}</strong>
            <p style="margin: 2px 0; font-size: 11px; color: #44403c;">${m.sede} • ${m.ubicacion}</p>
            <p style="margin: 0; font-size: 10px; color: #78716c;">📍 ${m.direccion}</p>
            <div style="margin-top: 6px; font-size: 10px; color: #1c1917; font-weight: 600;">
              ☕ Máquina: <span style="font-family: monospace;">${m.codigoSerial}</span>
            </div>
            <div style="margin-top: 3px; font-size: 9px; display: flex; align-items: center; gap: 4px;">
              ${
                m.tieneGpsPropio
                  ? `<span style="background: #ffe4e6; color: #e11d48; padding: 1px 5px; border-radius: 4px; font-weight: bold;">📍 GPS Máquina</span> <span style="font-family: monospace; color: #44403c;">${pLat.toFixed(4)}, ${pLng.toFixed(4)}</span>`
                  : m.latitud !== null
                  ? `<span style="background: #f5f5f4; color: #78716c; padding: 1px 5px; border-radius: 4px;">📍 GPS Cliente</span> <span style="font-family: monospace; color: #44403c;">${pLat.toFixed(4)}, ${pLng.toFixed(4)}</span>`
                  : `<span style="background: #fef3c7; color: #b45309; padding: 1px 5px; border-radius: 4px;">📍 Estimado</span>`
              }
            </div>
            <div style="margin-top: 4px; font-size: 10px; color: #57534e;">
              👤 Rutero: <strong>${ruta.operadorNombre}</strong>
            </div>
            <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" style="
              display: inline-flex;
              align-items: center;
              gap: 4px;
              margin-top: 8px;
              padding: 5px 10px;
              background: #1c1917;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-size: 10px;
              font-weight: bold;
            ">
              Navegar con Google Maps ➔
            </a>
          </div>
        `);
        layersGroupRef.current.addLayer(marker);
      });

      // Si hay paradas, cerramos el circuito regresando a la bodega
      if (coordenadasCircuito.length > 1) {
        coordenadasCircuito.push([bLat, bLng]);

        const polyline = L.polyline(coordenadasCircuito, {
          color: color,
          weight: 4,
          opacity: 0.85,
          dashArray: "6, 8",
          lineJoin: "round",
        });

        polyline.bindTooltip(
          `<strong>${ruta.nombre}</strong><br/>${ruta.maquinas.length} máquinas`,
          { sticky: true }
        );

        layersGroupRef.current.addLayer(polyline);
      }
    });

    // Ajustar el zoom para ver todos los puntos
    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 14,
      });
    }
  };

  // Generar URL completa de Google Maps con todos los waypoints para la ruta seleccionada
  const generarGoogleMapsRutaCompleta = () => {
    if (rutasAMostrar.length === 0) return "#";
    const ruta = rutasAMostrar[0];
    if (!ruta || ruta.maquinas.length === 0) return "#";

    const origin = `${bodegaActual.latitud},${bodegaActual.longitud}`;
    const destination = origin; // Retorno a bodega

    const waypoints = ruta.maquinas
      .map((m) => {
        const lat = m.latitud || bodegaActual.latitud;
        const lng = m.longitud || bodegaActual.longitud;
        return `${lat},${lng}`;
      })
      .join("|");

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`;
  };

  const totalMaquinasVisibles = rutasAMostrar.reduce(
    (acc, r) => acc + r.maquinas.length,
    0
  );

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden space-y-0">
      {/* Barra de Control Superior del Mapa */}
      <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-50/70 dark:bg-stone-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-md shrink-0">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
              Recorrido Geográfico de Rutas
              <span className="px-2 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-full font-extrabold">
                {rutasAMostrar.length} {rutasAMostrar.length === 1 ? "Ruta" : "Rutas"} • {totalMaquinasVisibles} Paradas
              </span>
            </h3>
            <p className="text-[11px] text-stone-500">
              Circuito de atención partiendo y regresando a la Bodega Principal
            </p>
          </div>
        </div>

        {/* Acciones y Selectores */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Ruta */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-2.5 py-1.5 text-xs shadow-sm">
            <Layers className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={rutaSeleccionadaId}
              onChange={(e) => setRutaSeleccionadaId(e.target.value)}
              className="bg-transparent font-bold text-stone-800 dark:text-stone-200 outline-none cursor-pointer"
            >
              <option value="TODAS">Ver Todas las Rutas ({rutas.length})</option>
              {rutas.map((r, i) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} ({r.maquinas.length} paradas)
                </option>
              ))}
            </select>
          </div>

          {/* Botón Configurar Bodega */}
          <button
            type="button"
            onClick={() => setModalBodegaAbierto(true)}
            className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Settings className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Configurar Bodega</span>
          </button>

          {/* Botón Abrir Recorrido en Google Maps */}
          {rutaSeleccionadaId !== "TODAS" && totalMaquinasVisibles > 0 && (
            <a
              href={generarGoogleMapsRutaCompleta()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-coffee-800 hover:bg-coffee-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir en Google Maps</span>
            </a>
          )}
        </div>
      </div>

      {/* Contenedor del Mapa Leaflet */}
      <div className="relative w-full h-[450px] z-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Leyenda Flotante en la esquina inferior del mapa */}
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-3 rounded-xl border border-stone-200 dark:border-stone-800 shadow-lg text-[11px] space-y-1.5 max-w-xs">
          <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5 mb-1">
            <Info className="w-3.5 h-3.5 text-amber-500" /> Convenciones del Mapa
          </div>
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
            <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-[10px] shadow-sm">
              🏢
            </span>
            <span>
              <strong>Bodega Principal:</strong> {bodegaActual.nombre}
            </span>
          </div>
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
            <span className="w-4 h-4 rounded-full bg-coffee-800 text-white flex items-center justify-center font-bold text-[9px] shadow-sm">
              1
            </span>
            <span>
              <strong>Pines Numerados:</strong> Secuencia de paradas
            </span>
          </div>
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
            <span className="w-4 h-1 bg-amber-600 rounded-full inline-block" />
            <span>
              <strong>Línea Punteada:</strong> Trayectoria del circuito
            </span>
          </div>
        </div>
      </div>

      {/* Modal para configurar la bodega */}
      {modalBodegaAbierto && (
        <ConfigurarBodegaModal
          bodega={bodegaActual}
          onClose={() => setModalBodegaAbierto(false)}
          onSaved={() => {
            // Se refresca el estado local
          }}
        />
      )}
    </div>
  );
}
