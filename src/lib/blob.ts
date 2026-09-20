import { put } from "@vercel/blob";

/**
 * Sube la foto de los contadores de la máquina a Vercel Blob.
 * Si Vercel Blob no está configurado o falla, devuelve el fallback Base64 para no romper la imagen.
 * @param file Archivo imagen (File o Buffer)
 * @param filename Nombre identificador del archivo
 * @param fallbackBase64 Cadena base64 opcional en caso de que Blob no esté disponible
 * @returns URL pública del archivo subido en Vercel Blob o cadena Base64
 */
export async function uploadCounterPhoto(
  file: File | Blob | Buffer,
  filename: string,
  fallbackBase64?: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  // Si no hay token de Vercel Blob configurado, usamos el fallback base64
  if (!token || token.includes("demo_token")) {
    console.warn("[Vercel Blob] BLOB_READ_WRITE_TOKEN no configurado. Usando imagen Base64 local.");
    return fallbackBase64 || "";
  }

  try {
    const blob = await put(`evidencias/contadores/${Date.now()}-${filename}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return blob.url;
  } catch (error) {
    console.warn("[Vercel Blob] Error subiendo foto a Blob, usando fallback:", error);
    return fallbackBase64 || "";
  }
}

/**
 * Sube la firma del cliente capturada en Canvas a Vercel Blob.
 * Si Vercel Blob no está configurado o falla, devuelve directamente el Data URL (Base64),
 * garantizando que la firma siempre se visualice en el Dashboard y en el PDF.
 * @param base64Signature Cadena 'data:image/png;base64,...'
 * @param filename Nombre del archivo
 * @returns URL pública de Vercel Blob o la misma cadena Data URL Base64
 */
export async function uploadSignature(
  base64Signature: string,
  filename: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token || token.includes("demo_token")) {
    console.warn("[Vercel Blob] BLOB_READ_WRITE_TOKEN no configurado. Almacenando firma como Data URL Base64.");
    return base64Signature;
  }

  try {
    // Extraer el contenido binario del data URL
    const base64Data = base64Signature.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const blob = await put(`firmas/${Date.now()}-${filename}.png`, buffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: true,
    });

    return blob.url;
  } catch (error) {
    console.warn("[Vercel Blob] Error al subir firma a Blob, usando Data URL Base64:", error);
    return base64Signature;
  }
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
): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token || token.includes("demo_token")) {
    console.warn("[Vercel Blob] BLOB_READ_WRITE_TOKEN no configurado.");
    return null;
  }

  try {
    const blob = await put(`recibos/recibo-${consecutivo}.pdf`, pdfBuffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: false,
    });

    return blob.url;
  } catch (error) {
    console.error("[Vercel Blob] Error subiendo PDF:", error);
    return null;
  }
}
