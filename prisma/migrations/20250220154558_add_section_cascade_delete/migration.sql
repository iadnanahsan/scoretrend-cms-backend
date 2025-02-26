-- AlterEnum
ALTER TYPE "PageType" ADD VALUE 'SYSTEM';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SectionType" ADD VALUE 'GRAPH_EXAMPLE';
ALTER TYPE "SectionType" ADD VALUE 'EVENTS';
ALTER TYPE "SectionType" ADD VALUE 'STATS';

-- DropForeignKey
ALTER TABLE "SectionTranslation" DROP CONSTRAINT "SectionTranslation_section_id_fkey";

-- CreateTable
CREATE TABLE "FAQCategory" (
    "id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQCategoryTranslation" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "language" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FAQCategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQItem" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQItemTranslation" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "language" VARCHAR(2) NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FAQItemTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FAQCategoryTranslation_category_id_language_key" ON "FAQCategoryTranslation"("category_id", "language");

-- CreateIndex
CREATE INDEX "FAQItem_category_id_order_index_idx" ON "FAQItem"("category_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "FAQItemTranslation_item_id_language_key" ON "FAQItemTranslation"("item_id", "language");

-- CreateIndex
CREATE INDEX "BlogPost_category_id_idx" ON "BlogPost"("category_id");

-- CreateIndex
CREATE INDEX "BlogPost_author_id_idx" ON "BlogPost"("author_id");

-- CreateIndex
CREATE INDEX "BlogPost_created_at_idx" ON "BlogPost"("created_at");

-- CreateIndex
CREATE INDEX "BlogPost_status_idx" ON "BlogPost"("status");

-- CreateIndex
CREATE INDEX "BlogPost_view_count_idx" ON "BlogPost"("view_count");

-- CreateIndex
CREATE INDEX "BlogPost_reading_time_idx" ON "BlogPost"("reading_time");

-- CreateIndex
CREATE INDEX "PostTranslation_language_idx" ON "PostTranslation"("language");

-- CreateIndex
CREATE INDEX "PostTranslation_title_idx" ON "PostTranslation"("title");

-- AddForeignKey
ALTER TABLE "SectionTranslation" ADD CONSTRAINT "SectionTranslation_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FAQCategoryTranslation" ADD CONSTRAINT "FAQCategoryTranslation_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "FAQCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FAQItem" ADD CONSTRAINT "FAQItem_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "FAQCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FAQItemTranslation" ADD CONSTRAINT "FAQItemTranslation_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "FAQItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
