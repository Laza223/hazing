-- CreateTable
CREATE TABLE "HomeContent" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeContent_pkey" PRIMARY KEY ("id")
);

-- RLS sin políticas: Hazing solo accede por Prisma (como el resto de las tablas).
ALTER TABLE "HomeContent" ENABLE ROW LEVEL SECURITY;
