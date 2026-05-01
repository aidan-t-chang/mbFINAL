/*
  Warnings:

  - A unique constraint covering the columns `[userId,gameId]` on the table `GamePlayer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GamePlayer_userId_gameId_key" ON "GamePlayer"("userId", "gameId");
