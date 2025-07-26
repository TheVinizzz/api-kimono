-- Adicionar campo originalPrice à tabela ProductVariant
ALTER TABLE "ProductVariant" ADD COLUMN "originalPrice" DECIMAL(10,2);

-- Atualizar variações existentes para usar o preço atual como preço original
UPDATE "ProductVariant" SET "originalPrice" = "price" WHERE "originalPrice" IS NULL; 