/*
  Warnings:

  - You are about to drop the column `time_survival` on the `GamePlayer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GamePlayer" DROP COLUMN "time_survival",
ADD COLUMN     "qa_survival" DOUBLE PRECISION;
