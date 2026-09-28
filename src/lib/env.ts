export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    return "vendytrack-default-session-secret-key-32-chars-minimum-2026";
  }
  return secret;
}
