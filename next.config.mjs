import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma con driver adapter en Cloudflare Workers — ver ADR 0002 (docs/decisions/0002-prisma-en-workers.md).
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "@prisma/adapter-pg",
    "pg",
  ],
  images: {
    remotePatterns: [
      // Supabase Storage público (host real se setea por env cuando exista el proyecto)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;

// Habilita getCloudflareContext() durante `next dev` (no-op fuera de dev).
initOpenNextCloudflareForDev();
