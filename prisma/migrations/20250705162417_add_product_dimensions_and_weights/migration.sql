/*
  Warnings:

  - Made the column `weight` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/

-- Primeiro, atualizar valores NULL existentes com valores padrão
UPDATE "Product" SET "weight" = 0.5 WHERE "weight" IS NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "height" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "length" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
ADD COLUMN     "width" DOUBLE PRECISION NOT NULL DEFAULT 25.0,
ALTER COLUMN "weight" SET NOT NULL,
ALTER COLUMN "weight" SET DEFAULT 0.5;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "weight" DOUBLE PRECISION;
