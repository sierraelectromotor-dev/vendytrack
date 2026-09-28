import { formatCOP, formatFechaColombia } from "./utils";

export interface WhatsAppMessagePayload {
  consecutivo: number | string;
  clienteNombre: string;
  sede: string;
  maquinaSerial: string;
  maquinaModelo: string;
  totalFacturado: number;
  totalTazasNetas: number;
  metodoPago: "EFECTIVO" | "TRANSFERENCIA" | "MIXTO" | string;
  pdfUrl?: string | null;
  fecha?: Date | string;
}

/**
 * Limpia y normaliza el número de teléfono con indicativo internacional.
 * Si no incluye el código de país (ej. 3001234567 para Colombia), antepone '57'.
 */
export function normalizarTelefono(telefono: string): string {
  // Elimina caracteres no numéricos
  const clean = telefono.replace(/\D/g, "");
  
  // Si tiene 10 dígitos (formato estándar móvil Colombia sin indicativo), añadir '57'
  if (clean.length === 10 && clean.startsWith("3")) {
    return `57${clean}`;
  }
  
  return clean;
}

/**
 * Genera el deep link de WhatsApp con el mensaje prearmado y codificado.
 */
export function buildWhatsAppLink(
  telefono: string,
  data: WhatsAppMessagePayload
): string {
  const phone = normalizarTelefono(telefono);
  const fechaStr = formatFechaColombia(data.fecha || new Date());
  const consecutivoFormatted = typeof data.consecutivo === "number" 
    ? `LIQ-${data.consecutivo.toString().padStart(4, "0")}`
    : data.consecutivo;

  const lines = [
    `☕ *VendyTrack - Comprobante de Liquidación*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📄 *N° Liquidación:* ${consecutivoFormatted}`,
    `📅 *Fecha:* ${fechaStr}`,
    `🏢 *Cliente:* ${data.clienteNombre} (${data.sede})`,
    `🤖 *Máquina:* ${data.maquinaSerial} - ${data.maquinaModelo}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📊 *Resumen de la Visita:*`,
    `• Tazas Netas Despachadas: *${data.totalTazasNetas}*`,
    `• Total Facturado: *${formatCOP(data.totalFacturado)}*`,
    `• Método de Pago: *${data.metodoPago}*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
  ];

  if (data.pdfUrl) {
    lines.push(
      `📥 *Descargar Recibo Oficial en PDF (Firmado):*`,
      `${data.pdfUrl}`,
      `━━━━━━━━━━━━━━━━━━━━━━`
    );
  }

  lines.push(`_¡Gracias por preferir nuestro servicio de café vending institucional!_`);

  const message = lines.join("\n");
  const encodedMessage = encodeURIComponent(message);

  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
}

export interface WhatsAppDespachoPayload {
  consecutivo: number | string;
  clienteNombre: string;
  sede?: string;
  maquinaSerial?: string;
  tipoDespacho: string;
  fecha?: Date | string;
}

export function buildWhatsAppDespachoLink(
  telefono: string,
  data: WhatsAppDespachoPayload
): string {
  const phone = normalizarTelefono(telefono);
  const fechaStr = formatFechaColombia(data.fecha || new Date());
  
  const consecutivoFormatted = typeof data.consecutivo === "number" 
    ? `DESP-${data.consecutivo.toString().padStart(4, "0")}`
    : data.consecutivo;

  const lines = [
    `☕ *VendyTrack - Comprobante de Despacho*`,
    `➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖`,
    `📄 *Nº Despacho:* ${consecutivoFormatted}`,
    `📅 *Fecha:* ${fechaStr}`,
    `🏢 *Cliente:* ${data.clienteNombre}${data.sede ? ` (${data.sede})` : ''}`,
  ];

  if (data.maquinaSerial) {
    lines.push(`📠 *Máquina:* ${data.maquinaSerial}`);
  }

  lines.push(
    `🔄 *Tipo:* ${data.tipoDespacho === 'VENTA_BOLSA' ? 'Venta Directa de Producto' : 'Abastecimiento de Insumos'}`,
    `➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖`,
    `✅ _El despacho fue entregado exitosamente._`,
    `_¡Gracias por confiar en nosotros!_`
  );

  const message = lines.join("\n");
  const encodedMessage = encodeURIComponent(message);

  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
}
