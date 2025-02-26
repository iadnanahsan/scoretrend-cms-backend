/*
  Warnings:

  - You are about to drop the column `html_content` on the `SectionTranslation` table. All the data in the column will be lost.
  - You are about to drop the column `raw_content` on the `SectionTranslation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SectionTranslation" DROP COLUMN "html_content",
DROP COLUMN "raw_content";
