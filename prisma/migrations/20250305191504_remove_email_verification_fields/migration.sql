/*
  Warnings:

  - You are about to drop the column `email_verified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email_verified_at` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verification_expires` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verification_token` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_verification_token_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email_verified",
DROP COLUMN "email_verified_at",
DROP COLUMN "verification_expires",
DROP COLUMN "verification_token";
