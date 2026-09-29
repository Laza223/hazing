-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- RLS sin políticas: Hazing solo accede por Prisma (como el resto de las tablas).
ALTER TABLE "RateLimit" ENABLE ROW LEVEL SECURITY;
