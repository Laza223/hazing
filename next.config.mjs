/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma con driver adapter fuera del bundle del servidor — ver ADR 0002 y ADR 0005.
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
