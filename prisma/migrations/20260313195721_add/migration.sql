/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `gamesPlayed` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastOnline` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rank` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timePlayed` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalExp` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `username` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gamesPlayed" INTEGER NOT NULL,
ADD COLUMN     "lastOnline" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "level" INTEGER NOT NULL,
ADD COLUMN     "rank" TEXT NOT NULL,
ADD COLUMN     "timePlayed" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalExp" INTEGER NOT NULL,
ALTER COLUMN "username" SET NOT NULL;

-- DropTable
DROP TABLE "Post";
