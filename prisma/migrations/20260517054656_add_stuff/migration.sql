/*
  Warnings:

  - You are about to alter the column `qa_survival` on the `GamePlayer` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "GamePlayer" ALTER COLUMN "qa_survival" SET DATA TYPE INTEGER;
