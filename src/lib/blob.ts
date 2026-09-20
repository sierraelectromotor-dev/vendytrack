import { put } from "@vercel/blob";

/**
 * Sube la foto de los contadores de la máquina a Vercel Blob.
 * @param file Archivo imagen (File o Buffer)
 * @param filename Nombre identificador del archivo
 * @returns URL pública del archivo subido en Vercel Blob
 */
export async function uploadCounterPhoto(
  file: File | Blob | Buffer,
  filename: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  // Si no hay token de Vercel Blob configurado (ej. entorno local sin Vercel vinculada),
  // se genera un mock representativo para no bloquear el flujo de desarrollo
  if (!token || token.includes("demo_token")) {
    console.warn("[Vercel Blob] BLOB_READ_WRITE_TOKEN no configurado. Usando fallback de desarrollo.");
    return `https://demo.public.blob.vercel-storage.com/evidencias/${Date.now()}-${filename}.jpg`;
  }

  const blob = await put(`evidencias/contadores/${Date.now()}-${filename}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return blob.url;
}

/**
 * Sube la firma del cliente capturada en Canvas a Vercel Blob.
 * Convierte el Data URL (Base64) a Buffer antes de subirlo.
 * @param base64Signature Cadena 'data:image/png;base64,...'
 * @param filename Nombre del archivo
 * @returns URL pública del PNG de la firma
 */
export async function uploadSignature(
  base64Signature: string,
  filename: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token || token.includes("demo_token")) {
    console.warn("[Vercel Blob] BLOB_READ_WRITE_TOKEN no configurado. Usando fallback de desarrollo.");
    return `https://demo.public.blob.vercel-storage.com/firmas/${Date.now()}-${filename}.png`;
  }

  // Extraer el contenido binario del data URL
  const base64Data = base64Signature.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const blob = await put(`firmas/${Date.now()}-${filename}.png`, buffer, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: true,
  });

  return blob.url;
}

/**
 * Sube el PDF oficial generado a Vercel Blob.
 * @param pdfBuffer Buffer del PDF generado
 * @param consecutivo Número de liquidación (ej. LIQ-0042)
 * @returns URL pública del PDF
 */
export async function uploadPdfReceipt(
  pdfBuffer: Buffer,
  consecutivo: string | number
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token || token.includes("demo_token")) {
    console.warn("[Vercel Blob] BLOB_READ_WRITE_TOKEN no configurado. Usando fallback de desarrollo.");
    return `https://demo.public.blob.vercel-storage.com/recibos/recibo-${consecutivo}.pdf`;
  }

  const blob = await put(`recibos/recibo-${consecutivo}.pdf`, pdfBuffer, {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: false,
  });

  return blob.url;
}
