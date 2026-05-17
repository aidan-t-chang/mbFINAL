/*
  Warnings:

  - You are about to drop the column `qa_survival` on the `GamePlayer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GamePlayer" DROP COLUMN "qa_survival",
ADD COLUMN     "time_survival" DOUBLE PRECISION;
