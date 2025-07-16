-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "originCity" TEXT NOT NULL DEFAULT 'São Paulo',
ADD COLUMN     "originCnpj" TEXT NOT NULL DEFAULT '00.000.000/0001-00',
ADD COLUMN     "originCompanyName" TEXT NOT NULL DEFAULT 'Sua Empresa',
ADD COLUMN     "originEmail" TEXT NOT NULL DEFAULT 'contato@empresa.com',
ADD COLUMN     "originNeighborhood" TEXT NOT NULL DEFAULT 'Centro',
ADD COLUMN     "originPhone" TEXT NOT NULL DEFAULT '(11) 99999-9999',
ADD COLUMN     "originState" TEXT NOT NULL DEFAULT 'SP',
ADD COLUMN     "originStateReg" TEXT NOT NULL DEFAULT '000.000.000.000',
ADD COLUMN     "originStreet" TEXT NOT NULL DEFAULT 'Rua Exemplo, 123',
ADD COLUMN     "originZipCode" TEXT NOT NULL DEFAULT '01234-567';

-- CreateTable
CREATE TABLE "InvoiceNumber" (
    "id" SERIAL NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "series" TEXT NOT NULL DEFAULT '1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceNumber_pkey" PRIMARY KEY ("id")
);
