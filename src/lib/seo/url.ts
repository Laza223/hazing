/** Base pública de la app (sitemap, robots, OG). */
export function appBaseUrl(): string {
  // `||` (no `??`): una env var vacía ("") en Vercel tiene que caer al default
  // igual que si no estuviera: `new URL("")` rompe el build (pasó en glamify).
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/** Convierte un path relativo en URL absoluta; deja pasar las que ya son http(s). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return new URL(path, appBaseUrl()).toString();
}
