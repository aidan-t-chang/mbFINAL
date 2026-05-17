"use server";

import { prisma } from "../server/src/db/index";
import crypto from "crypto";
import { cookies } from "next/headers";
import { calculateLevel } from "./utils";

async function createAccount(formData: FormData) {
    const email = formData.get("email") as string;
    const username = formData.get("username") as string;
    let rawPass = formData.get("password") as string;

    if (!email || !username || !rawPass) {
        return { success: false, error: "Missing fields" };
    }

    try {
        const salt = crypto.randomBytes(16).toString("hex");

        const pepper = process.env.pepper || "";
        rawPass += pepper;

        const hashedPass = crypto
        .scryptSync(rawPass, salt, 64)
        .toString("hex");

        const newUser = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPass,
                salt: salt,
            },
        });
        return { success: true, user: { id: newUser.id, email: newUser.email, username: newUser.username } };
    } catch (error: any) {
        if (error.code === "P2002") {
            return { success: false, error: "Email or username already exists" };
        }
        return { success: false, error: error.message || "Error creating account" };
    }

}

async function login(formData: FormData) {
    const fEmail = formData.get("email") as string;
    let rawPass = formData.get("password") as string;

    if (!fEmail || !rawPass) {
        return { success: false, error: "Missing fields" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: fEmail },
        });
        if (!user) {
            return { success: false, error: "Invalid email or password" };
        }

        const pepper = process.env.pepper || "";
        rawPass += pepper;

        const hashedPass = crypto
            .scryptSync(rawPass, user.salt, 64)
            .toString("hex");

        if (hashedPass !== user.password) {
            return { success: false, error: "Invalid email or password" };
        }

        const signature = crypto
            .createHmac("sha256", process.env.SESSION_SECRET || "default_secret")
            .update(user.id.toString())
            .digest("hex");

        const cookieStore = await cookies();
        cookieStore.set("sessionId", `${user.id}.${signature}`, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 30, // 1 month
        });

        await prisma.user.update({
            where: { id: user.id },
            data: { lastOnline: new Date() }
        });

        return { success: true, user: { id: user.id, email: user.email, username: user.username } };
    } catch (error: any) {
        return { success: false, error: error.message || "Error logging in" };
    }
}

async function getCurrentUser() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("sessionId")?.value;

    if (!sessionCookie || !sessionCookie.includes(".")) {
        return null;
    }

    const [idStr, signature] = sessionCookie.split(".");
    
    // Verify signature to prevent session hijacking
    const expectedSignature = crypto
        .createHmac("sha256", process.env.SESSION_SECRET || "default_secret")
        .update(idStr)
        .digest("hex");

    if (signature !== expectedSignature) {
        return null;
    }

    const parsedId = Number(idStr);
    if (isNaN(parsedId)) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: parsedId },
        select: { id: true, 
            username: true, 
            mbrr: true, 
            createdAt: true,
            totalExp: true,
            gamesPlayed: true,
            timePlayed: true,
            lastOnline: true,
            level: true,
            rank: true,
            wins: true,
            losses: true,
            avgAnswerTime: true,
            friends: true,
            bestSurvivalScore: true,
            bestRaceTime: true,
        }
    });

    return user;
}

async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete("sessionId");
}

async function getGameQuestions(roomId: string) {
    return await prisma.question.findMany({
        where: { gameId: roomId },
        orderBy: { id: "asc" }
    });
}

async function cleanUpQuestions(roomId: string, questionIndex: number) {
    const currentUser = await getCurrentUser();
    if (!currentUser) return;

    // Ensure the user is an active participant in this game
    const isPlayer = await prisma.gamePlayer.findUnique({
        where: {
            userId_gameId: {
                userId: currentUser.id,
                gameId: roomId
            }
        }
    });

    if (!isPlayer) return;

    const allQuestions = await getGameQuestions(roomId);

    const unusedQuestions = allQuestions.slice(questionIndex);
    const unusedQuestionIds = unusedQuestions.map((q: { id: number }) => q.id);

    if (unusedQuestionIds.length > 0) {
        try {
            await prisma.question.deleteMany({
                where: { id: { in: unusedQuestionIds } }
            });
            console.log(`Cleaned up ${unusedQuestionIds.length} questions for game ${roomId}`);
        } catch (e) {
            console.error("Error cleaning up questions:", e);
        }
    }
}

async function saveGameResults(roomId: string, score: number, isWinner: boolean, highestCombo: number, questionsAnswered: number, averageAnswerTime: number) {
    const user = await getCurrentUser();
    if (!user) {
        return;
    }

    // Basic sanity checks 
    const maxPossibleScorePerQuestion = 1500 + (highestCombo * 50);
    if (
        score < 0 || questionsAnswered < 0 || highestCombo < 0 || 
        score > (questionsAnswered * maxPossibleScorePerQuestion) ||
        highestCombo > questionsAnswered
    ) {
        console.error(`Suspicious multiplayer score discarded for user ${user.id}`);
        return { success: false, error: "Suspicious score detected" };
    }

    // score is around 70-80k for full match
    // divide by 10, 7000-8000 xp
    // combo around 25-30, bonus of 50xp per combo so 1250-1500
    // questions answered 25-30, bonus of 25xp per question so 625-750
    // win: 1000xp

    // need to check level up as well - each level should be level * 5000 xp

    const baseExp = Math.floor(score / 10); 
    const comboBonus = highestCombo * 50;
    const qAnsweredBonus = questionsAnswered * 25;
    const finalScore = baseExp + comboBonus + qAnsweredBonus + (isWinner ? 1000 : 0);

    const oldTotalExp = user.totalExp || 0;
    const newTotalExp = oldTotalExp + finalScore;

    const oldLevelData = calculateLevel(oldTotalExp);
    const newLevelData = calculateLevel(newTotalExp);
    const incLevel = newLevelData.level - oldLevelData.level;
    // not even going to worry about glicko2 rating implementation for right now

    const timePlayed = averageAnswerTime * questionsAnswered / 3600; // convert seconds to hours

    try {
        await prisma.gamePlayer.update({
            where: {
                userId_gameId: {
                    userId: user.id,
                    gameId: roomId
                }
            },
            data: {
                score: score,
                isWinner: isWinner
            }
        });

        await prisma.game.update({
            where: {
                id: roomId
            },
            data: {
                status: "FINISHED"
            }
        });

        await prisma.user.update({
            where: { id: user.id },  
            data: { 
                totalExp: { increment: finalScore }, 
                gamesPlayed: { increment: 1 },
                ...(incLevel > 0 && { level: { increment: incLevel } }),
                ...(isWinner ? { wins: { increment: 1 } } : { losses: { increment: 1 } }),
                avgAnswerTime: user.avgAnswerTime ? ((user.avgAnswerTime * (user.gamesPlayed) + averageAnswerTime) / (user.gamesPlayed + 1)) : averageAnswerTime,
                timePlayed: { increment: timePlayed }
             }
        });

        return {
            success: true,
            expGained: finalScore,
            oldTotalExp: oldTotalExp,
            newTotalExp: newTotalExp,
        }

    } catch (e) {
        console.error("Error saving game results:", e);
        return { success: false, error: e };
    }
}

async function getUserByUsername(username: string) {
    return await prisma.user.findUnique({
        where: { username },
        select: { id: true, 
            username: true, 
            mbrr: true, 
            createdAt: true,
            totalExp: true,
            gamesPlayed: true,
            timePlayed: true,
            lastOnline: true,
            level: true,
            rank: true,
            wins: true,
            losses: true,
            avgAnswerTime: true,
            friends: true,
            bestSurvivalScore: true,
        }
    })
}

async function sendFriendRequest(targetUserId: number) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Not logged in" };
    }

    if (currentUser.id === targetUserId) {
        return { success: false, error: "Cannot send friend request to yourself" };
    }

    try {
        await prisma.friendship.create({
            data: {
                userId: currentUser.id,
                friendId: targetUserId,
                status: "PENDING"
            }
        });

        await prisma.notification.create({
            data: {
                userId: targetUserId,
                type: "FRIEND_REQUEST",
                message: `${currentUser.username} has sent you a friend request`,
                link: `/profile/${currentUser.username}`
            }
        });

        return { success: true };
    } catch (e: any) {
        if (e.code === "P2002") {
            return { success: false, error: "Friend request already sent" };
        }
        return { success: false, error: e };
    }
}

export async function getPendingFriendRequests() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Not logged in" };
    }

    try {
        const requests = await prisma.friendship.findMany({
            where: {
                friendId: currentUser?.id,
                status: "PENDING"
            },
            include: {
                user: {
                    select: { id: true, username: true, mbrr: true }
                }
            }
        });
        return { success: true, requests };
    } catch (e) {
        console.error("Error fetching friend requests:", e);
        return { success: false, error: "Error fetching friend requests" };
    }
}

export async function getFriends() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Not logged in" };
    }

    try {
        const friends = await prisma.friendship.findMany({
            where: {
                OR: [
                    { userId: currentUser.id, status: "ACCEPTED" },
                    { friendId: currentUser.id, status: "ACCEPTED" }
                ]
            },
            include: {
                user: {
                    select: { id: true, username: true, mbrr: true }
                },
                friend: {
                    select: { id: true, username: true, mbrr: true }
                }
            }
        })
        return { success: true, friends, numFriends: friends.length };
    } catch (e) {
        console.error("Error fetching friends:", e);
        return { success: false, error: "Error fetching friends" };
    }
}

export async function getFriendsByUserId(userId: number) {
    try {
        const friends = await prisma.friendship.findMany({
            where: {
                OR: [
                    { userId: userId, status: "ACCEPTED" },
                    { friendId: userId, status: "ACCEPTED" }
                ]
            },
            include: {
                user: { select: { id: true, username: true, mbrr: true } },
                friend: { select: { id: true, username: true, mbrr: true } }
            }
        });
        return { success: true, friends };
    } catch (e) {
        console.error("Error fetching friends by user ID:", e);
        return { success: false, error: "Error fetching friends by user ID" };
    }
}

export async function updateLastOnline() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return;
    }
    await prisma.user.update({
        where: { id: currentUser.id },
        data: { lastOnline: new Date() }
    })
}

export async function acceptFriendRequest(userId: number, friendId: number) {
    const currentUser = await getCurrentUser();
    
    // Ensure the current user is the one receiving the request
    if (!currentUser || currentUser.id !== friendId) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.friendship.update({
            where: {
                userId_friendId: {
                    userId,
                    friendId
                }
            },
            data: { status: "ACCEPTED" }
        })

        await prisma.user.update({
            where: { id: userId },
            data: {
                friends: { increment: 1 }
            }
        })
    }
    catch (e) {
        console.error("Error accepting friend request:", e);
    }
}

export async function searchUsers(searchTerm: string) {
    if (!searchTerm || searchTerm.length < 3) {
        return { success: true, users: [] };
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                username: {
                    startsWith: searchTerm,
                    mode: 'insensitive'
                }
            },
            select: {
                id: true,
                username: true,
                mbrr: true,
                createdAt: true,
                timePlayed: true,
            },
            take: 10
        });
        return { success: true, users };
    } catch (e) {
        console.error("Error searching users:", e);
        return { success: false, error: "Error searching users" };
    }
}

export async function getLeaderboard(limit: number = 50, byWhat: "mbrr" | "totalExp" | "bestSurvivalScore" | "bestRaceTime" = "mbrr") {
    try {
        const topUsers = await prisma.user.findMany({
            take: limit,
            where: byWhat === "bestRaceTime" ? { bestRaceTime: { gt: 0 } } : undefined,
            orderBy: { [byWhat]: byWhat === "bestRaceTime" ? "asc" : "desc" },
            select: {
                id: true,
                username: true,
                mbrr: true,
                rank: true,
                level: true,
                totalExp: true,
                bestSurvivalScore: true,
                bestRaceTime: true,
            }
        })
        return { success: true, users: topUsers };
    } catch (e) {
        console.error("Error fetching leaderboard:", e);
        return { success: false, error: "Failed to fetch leaderboard" };
    }
}

export async function getSurvivalBatch(roomId: string, batchSize: number = 50) {
    const newQuestions = [];
    const uniqueQuestions = new Set<string>();

    while (newQuestions.length < batchSize) {
        const num1 = Math.floor(Math.random() * 20) + 1; 
        const num2 = Math.floor(Math.random() * 20) + 1;

        const isAddition = Math.random() > 0.5;
        const questionText = isAddition ? `${num1} + ${num2}` : `${num1} - ${num2}`;
        const answer = isAddition ? (num1 + num2) : (num1 - num2);

        if (!uniqueQuestions.has(questionText)) {
            uniqueQuestions.add(questionText);
            newQuestions.push({
                gameId: roomId,
                question: questionText,
                correctAnswer: answer
            });
        }
    }

    try {
        // We aren't creating them in DB for survival mode anymore to dodge gameId constraint
        // when a Game doesn't exist for it.
        return newQuestions;
    } catch (e) {
        console.error("Error creating survival questions:", e);
        return null;
    }
}

export async function saveSurvivalScore(score: number, questionsAnswered: number, highestCombo: number, roomId: string, timeSurvived: number) {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not logged in" };
    }

    // Basic sanity checks to prevent blatant script-kiddie cheating
    const maxPossibleScorePerQuestion = 1500 + (highestCombo * 50); // generous max limit
    if (
        score < 0 || questionsAnswered < 0 || highestCombo < 0 || 
        score > (questionsAnswered * maxPossibleScorePerQuestion) ||
        highestCombo > questionsAnswered || timeSurvived < 0
    ) {
        console.error(`Suspicious survival score discarded for user ${user.id}`);
        return { success: false, error: "Suspicious score detected" };
    }

    try {
        const currentUserData = await prisma.user.findUnique({
            where: { id: user.id },
            select: { bestSurvivalScore: true } 
        });

        // Store timeSurvived (perhaps multiplied by 100 to store as INT, or just store the raw seconds)
        const scoreToSave = Math.floor(timeSurvived);
        
        const newBest = currentUserData?.bestSurvivalScore 
            ? Math.max(currentUserData.bestSurvivalScore, scoreToSave) 
            : scoreToSave;

        const baseExp = Math.floor(score / 10);
        const comboBonus = highestCombo * 50;
        const qAnsweredBonus = questionsAnswered * 25;
        const expGained = baseExp + comboBonus + qAnsweredBonus;
        
        const oldTotalExp = user.totalExp || 0;
        const newTotalExp = oldTotalExp + expGained;

        await prisma.user.update({
            where: { id: user.id },
            data: {
                bestSurvivalScore: newBest,
                totalExp: { increment: expGained },
                gamesPlayed: { increment: 1 }
            }
        });

        // Create the game record so it shows up in history
        try {
            await prisma.game.upsert({
                where: { id: roomId },
                update: { status: "FINISHED" },
                create: { id: roomId, status: "FINISHED", type: "survival" }
            });

            await prisma.gamePlayer.upsert({
                where: { userId_gameId: { userId: user.id, gameId: roomId } },
                update: { score: score, isWinner: true, time_survival: timeSurvived }, 
                create: { userId: user.id, gameId: roomId, score: score, isWinner: true, time_survival: timeSurvived }
            });
        } catch (dbErr) {
            console.error("Failed to save solo game/player record:", dbErr);
        }

        return { success: true, newBest, expGained, oldTotalExp, newTotalExp };
    } catch (e) {
        console.error("Error saving survival score:", e);
        return { success: false, error: "Failed to save score" };
    }
}

export async function generateEzAddition(roomId: string, numQuestions: number) {
    const allQuestions = [];
    let counter: number = 0;
    while (counter < numQuestions) {
        const num1 = Math.floor(Math.random() * 10) + 1; // 1-10
        const num2 = Math.floor(Math.random() * 10) + 1; // 1-10

        const questionText = `${num1} + ${num2}`;
        const answer = (num1 + num2);

        allQuestions.push({
            gameId: roomId,
            question: questionText,
            correctAnswer: answer
        });
        counter++;
    }
    return allQuestions;
}

export async function saveRaceScore(roomId: string, time: number, questionIndex: number) {
    const user = await getCurrentUser();
    if (!user) {
        return;
    }

    const timeInSeconds = time / 1000; // convert ms to seconds

    let score = 15000 - Math.floor(time / 10);
    score += questionIndex * 25; // bonus for each question answered
    score = Math.max(0, score);

    const bestRaceTime = user.bestRaceTime ? Math.min(user.bestRaceTime, timeInSeconds) : timeInSeconds;
    const oldTotalExp = user.totalExp || 0;
    const newTotalExp = oldTotalExp + score;

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: { totalExp: { increment: score },
                gamesPlayed: { increment: 1 },
                bestRaceTime: bestRaceTime
            }
        })

        // Create the game record so it shows up in history
        try {
            await prisma.game.upsert({
                where: { id: roomId },
                update: { status: "FINISHED" },
                create: { id: roomId, status: "FINISHED", type: "race" }
            });

            await prisma.gamePlayer.upsert({
                where: { userId_gameId: { userId: user.id, gameId: roomId } },
                update: { score: score, isWinner: true, time_race: timeInSeconds },
                create: { userId: user.id, gameId: roomId, score: score, isWinner: true, time_race: timeInSeconds }
            });
        } catch (dbErr) {
            console.error("Failed to save solo game/player record for race:", dbErr);
        }

        return { success: true, expGained: score, oldTotalExp, newTotalExp };
    } catch (e) {
        console.error("Error saving race score:", e);
        return { success: false, error: e };
    }
}

export async function getUserHistory(username: string, skip: number = 0, take: number = 20, typeFilter?: string) {
    try {
        const whereClause: any = {
            user: { username }
        };
        
        if (typeFilter && typeFilter !== "all") {
            if (typeFilter === "standard") {
                whereClause.game = { type: { notIn: ["race", "survival"] } }; 
            } else {
                whereClause.game = { type: typeFilter };
            }
        }

        const history = await prisma.gamePlayer.findMany({
            where: whereClause,
            orderBy: {
                joinedAt: 'desc'
            },
            skip,
            take,
            include: {
                game: {
                    include: {
                        questions: true,
                        players: {
                            include: {
                                user: {
                                    select: { username: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const totalCount = await prisma.gamePlayer.count({
            where: whereClause
        });

        return { success: true, history, totalCount };
    } catch (e) {
        console.error("Error fetching user history:", e);
        return { success: false, error: "Error fetching user history" };
    }
}

export { createAccount, login, getCurrentUser, logout, getGameQuestions, cleanUpQuestions, saveGameResults, getUserByUsername, sendFriendRequest };