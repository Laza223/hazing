-- AlterEnum
ALTER TYPE "ShippingMethod" ADD VALUE 'retiro';

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN "trackingUrl" TEXT;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN "shippingSurcharge" DECIMAL(12,2) NOT NULL DEFAULT 2000;
