import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET debe tener al menos 32 caracteres'),
});

function validateEnv() {
  // Only validate critical vars, don't fail in edge runtime
  if (typeof process !== 'undefined' && process.env) {
    const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) {
      console.error('[VendyTrack] CRITICAL: SESSION_SECRET no está configurado o es muy corto (mínimo 32 caracteres).');
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET no configurado. La aplicación no puede iniciar de forma segura.');
      }
    }
  }
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET no está configurado. Configure esta variable de entorno.');
    }
    // Solo en desarrollo: usar clave de desarrollo (NUNCA en producción)
    console.warn('[VendyTrack] WARNING: Usando clave de sesión de desarrollo. NO usar en producción.');
    return 'dev-only-insecure-key-vendytrack-2026-do-not-use-in-prod';
  }
  return secret;
}

validateEnv();
