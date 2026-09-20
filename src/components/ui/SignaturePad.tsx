"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { RotateCcw, Check, PenTool, Eraser } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  initialValue?: string;
  disabled?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  onClear,
  initialValue,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokes, setStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);

  // Configuración del canvas con soporte para alta resolución (Retina / Mobile)
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b"; // Azul oscuro / carbón profesional
    ctx.lineWidth = 2.5;

    redrawStrokes(strokes);
  }, [strokes]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, [setupCanvas]);

  // Redibuja todos los trazos registrados
  const redrawStrokes = (strokeList: Array<Array<{ x: number; y: number }>>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;

    strokeList.forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  };

  const getCoordinates = (e: React.TouchEvent | React.MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setCurrentStroke([coords]);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    setCurrentStroke((prev) => [...prev, coords]);
    setHasDrawn(true);
  };

  const stopDrawing = (e?: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || disabled) return;
    if (e) e.preventDefault();

    setIsDrawing(false);
    if (currentStroke.length > 0) {
      const updatedStrokes = [...strokes, currentStroke];
      setStrokes(updatedStrokes);
      setCurrentStroke([]);

      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = canvas.toDataURL("image/png");
        onSave(dataUrl);
      }
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setStrokes([]);
    setCurrentStroke([]);
    setHasDrawn(false);
    onSave("");
    if (onClear) onClear();
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const updatedStrokes = strokes.slice(0, -1);
    setStrokes(updatedStrokes);
    redrawStrokes(updatedStrokes);

    const canvas = canvasRef.current;
    if (canvas) {
      if (updatedStrokes.length === 0) {
        setHasDrawn(false);
        onSave("");
      } else {
        onSave(canvas.toDataURL("image/png"));
      }
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
        <span className="flex items-center gap-1 font-medium">
          <PenTool className="w-3.5 h-3.5 text-coffee-600" />
          Firma táctil del encargado en pantalla
        </span>
        {hasDrawn && (
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
            <Check className="w-3.5 h-3.5" /> Registrada
          </span>
        )}
      </div>

      <div className="relative border-2 border-dashed border-stone-300 dark:border-stone-700 bg-white rounded-xl overflow-hidden shadow-inner touch-none">
        <canvas
          ref={canvasRef}
          className="w-full h-44 cursor-crosshair block bg-stone-50/50"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Línea guía de firma para el usuario */}
        <div className="absolute bottom-7 left-8 right-8 border-b border-stone-300 pointer-events-none flex justify-between text-[10px] text-stone-400">
          <span>X</span>
          <span>Firma del cliente / encargado del local</span>
        </div>

        {!hasDrawn && !isDrawing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-stone-400 text-xs select-none">
            Toque o dibuje con el dedo aquí para firmar
          </div>
        )}
      </div>

      {/* Botones de acción táctil */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={handleUndo}
          disabled={strokes.length === 0 || disabled}
          className="px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 rounded-lg hover:bg-stone-200 transition-colors flex items-center gap-1 disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Deshacer
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasDrawn || disabled}
          className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1 disabled:opacity-40"
        >
          <Eraser className="w-3.5 h-3.5" /> Limpiar firma
        </button>
      </div>
    </div>
  );
};
