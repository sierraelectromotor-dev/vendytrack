import { put } from "@vercel/blob";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

function checkSize(size: number) {
  if (size > MAX_FILE_SIZE) {
    throw new Error("El archivo excede el límite de 4MB.");
  }
}

/**
 * Sube la foto de los contadores de la máquina a Vercel Blob.
 * @param file Archivo imagen (File o Buffer)
 * @param filename Nombre identificador del archivo
 * @returns URL pública del archivo subido en Vercel Blob
 */
export async function uploadCounterPhoto(
  file: File | Blob | Buffer,
  filename: string,
  fallbackBase64?: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN no configurado.");
  }

  const size = Buffer.isBuffer(file) ? file.length : file.size;
  checkSize(size);

  try {
    const blob = await put(`evidencias/contadores/${Date.now()}-${filename}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return blob.url;
  } catch (error) {
    console.error("[Vercel Blob] Error subiendo foto a Blob:", error);
    return 'upload-failed';
  }
}

/**
 * Sube la firma del cliente capturada en Canvas a Vercel Blob.
 * @param base64Signature Cadena 'data:image/png;base64,...'
 * @param filename Nombre del archivo
 * @returns URL pública de Vercel Blob
 */
export async function uploadSignature(
  base64Signature: string,
  filename: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN no configurado.");
  }

  try {
    // Extraer el contenido binario del data URL
    const base64Data = base64Signature.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    checkSize(buffer.length);

    const blob = await put(`firmas/${Date.now()}-${filename}.png`, buffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: true,
    });

    return blob.url;
  } catch (error) {
    console.error("[Vercel Blob] Error al subir firma a Blob:", error);
    return 'upload-failed';
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

  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN no configurado.");
  }

  checkSize(pdfBuffer.length);

  try {
    const blob = await put(`recibos/recibo-${consecutivo}.pdf`, pdfBuffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: true,
    });

    return blob.url;
  } catch (error) {
    console.error("[Vercel Blob] Error subiendo PDF:", error);
    return 'upload-failed';
  }
}
