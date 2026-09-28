import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const fechaFormatter = new Intl.DateTimeFormat('es-CO', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

/**
 * Formatea un valor numérico a moneda colombiana ($ COP).
 */
export function formatCOP(value: number | string | bigint): string {
  const numericValue = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(numericValue)) return "$ 0";
  return copFormatter.format(numericValue);
}

/**
 * Formatea una fecha a formato local de Colombia.
 */
export function formatFechaColombia(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Fecha inválida";
  return fechaFormatter.format(d);
}

const fechaCortaFormatter = new Intl.DateTimeFormat('es-CO', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

/**
 * Formatea una fecha a formato corto (DD/MM/YYYY HH:MM).
 */
export function formatFechaCorta(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Fecha inválida";
  return fechaCortaFormatter.format(d);
}
