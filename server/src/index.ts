import { WebSocketServer, WebSocket } from "ws";
import { prisma } from "./db/index.js";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import "dotenv/config";

const server = new WebSocketServer({ port: 8081 });

const rooms = new Map<string, Map<WebSocket, any>>();

interface QueuePlayer {
    socket: WebSocket;
    user: any;
    mbrr: number;
    joinedAt: number;
}

let matchmakingQueue: QueuePlayer[] = [];

// matchmaking
setInterval(() => {
    if (matchmakingQueue.length < 2) {
        return;
    }

    const now = Date.now();
    let i = 0;

    while (i < matchmakingQueue.length) {
        const p1 = matchmakingQueue[i];

        if (!p1) {
            i++;
            continue;
        }

        const secondsWaiting = Math.floor((now - p1.joinedAt) / 1000);

        const acceptableRange = 50 + (secondsWaiting * 10);

        let matchFoundIndex = -1;

        for (let j = i + 1; j < matchmakingQueue.length; j++) {
            const p2 = matchmakingQueue[j];

            if (!p2) continue;

            const p2SecondsWaiting = Math.floor((now - p2.joinedAt) / 1000);
            const p2AcceptableRange = 50 + (p2SecondsWaiting * 10);

            const actualDiff = Math.abs(p1.mbrr - p2.mbrr);

            if (actualDiff <= acceptableRange && actualDiff <= p2AcceptableRange) {
                matchFoundIndex = j;
                break;
            }
        }

        if (matchFoundIndex !== -1) {
            const p2 = matchmakingQueue[matchFoundIndex];
            if (!p2) {
                i++;
                continue;
            }

            matchmakingQueue.splice(matchFoundIndex, 1);
            matchmakingQueue.splice(i, 1);

            const matchRoomId = randomUUID();
            const payload = JSON.stringify({
                type: "MATCH_FOUND", roomId: matchRoomId
            });

            if (p1.socket.readyState === WebSocket.OPEN) {
                p1.socket.send(payload);
            }
            if (p2.socket.readyState === WebSocket.OPEN) {
                p2.socket.send(payload);
            }
        } else {
            i++;
        }
    }
}, 2000);

function getRoomUpdate(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return null;

    const players = Array.from(room.values());
    const message = JSON.stringify({ type: "PLAYER_JOIN", players });

    room.forEach((_, client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

async function generateAddition(roomId: string, numQuestions: number) {
    // create the math questions, the answers, and put them in the database
    const newQuestions = [];
    const uniqueQuestions = new Set<string>();

    while (newQuestions.length < numQuestions) {
        const num1 = Math.floor(Math.random() * 40) + 1; // 1-40
        const num2 = Math.floor(Math.random() * 40) + 1; // 1-40

        const questionText = `${num1} + ${num2}`;
        const answer = (num1 + num2);

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
        await prisma.question.createMany({
            data: newQuestions
        });
        console.log(`Created ${numQuestions} questions for game ${roomId}`);
        return newQuestions;
    } catch (e) {
        console.error("Error creating questions:", e);
        return null;
    }
}

async function generateSubtraction(roomId: string, numQuestions: number) {
    // create the math questions, the answers, and put them in the database
    const newQuestions = [];
    const uniqueQuestions = new Set<string>();

    while (newQuestions.length < numQuestions) {
        const num1 = Math.floor(Math.random() * 40) + 1; // 1-40
        const num2 = Math.floor(Math.random() * 40) + 1; // 1-40

        const questionText = `${num1} - ${num2}`;
        const answer = (num1 - num2);

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
        await prisma.question.createMany({
            data: newQuestions
        });
        console.log(`Created ${numQuestions} questions for game ${roomId}`);
        return newQuestions;
    } catch (e) {
        console.error("Error creating questions:", e);
        return null;
    }
}

// generate both addition and subtraction questions for a game
async function generateBoth(roomId: string, numQuestions: number) {
    let counter: number = 0;
    while (counter < numQuestions) {
        if (Math.random() < 0.5) { // addition
            const question = await generateAddition(roomId, 1);
        } else {
            const question = await generateSubtraction(roomId, 1);
        }
        counter++;
    }
}

server.on('connection', socket => {
    let currentRoomId: string | null = null;
    let currentUser: any = null;

    socket.on('message', async message => {
        const data = JSON.parse(message.toString());

        if (data.type === "JOIN_ROOM") {
            const roomId = data.roomId;
            const user = data.user;

            let isFirstPlayer = false;
            let room = rooms.get(roomId);

            if (!room) {
                isFirstPlayer = true;
                room = new Map();
                rooms.set(roomId, room);
            }

            if (room.size >= 2) {
                socket.send(JSON.stringify({ type: "ERROR", message: "Room is full" }));
                return;
            }

            const userAlreadyInRoom = Array.from(room.values()).some((u) => u.id === user.id);

            if (userAlreadyInRoom) {
                socket.send(JSON.stringify({ type: "ERROR", message: `User already in room ${roomId}` }));
                return;
            }

            room.set(socket, user);
            currentRoomId = roomId;
            currentUser = user;

            if (isFirstPlayer) {
                try {
                    await prisma.game.create({
                        data: {
                            id: roomId,
                            status: "WAITING",
                            type: "standard" // change this later
                        }
                    });
                } catch (e) {
                    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                        console.log(`Game with ID ${roomId} already exists. Skipping creation`);
                    } else {
                    console.error("Error creating game:", e);
                    }
                }
            } else {
                try {
                    await prisma.game.update({
                        where: { id: roomId },
                        data: { status: "ROOM_FULL" }
                    })
                } catch (e) {
                    console.error("Error updating game status:", e);
                }
            }

            // every player creates a GamePlayer
            try {
                await prisma.gamePlayer.create({
                    data: {
                        userId: Number(user.id),
                        gameId: roomId,
                    }
                });
            } catch (e) {
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                    console.log(`GamePlayer for user ${user.id} in game ${roomId} already exists. Skipping creation`);
                } else {
                    console.error("Error creating game player:", e);
                }
            }

            socket.send(JSON.stringify({ type: "SUCCESS", message: `Joined room ${roomId}` }));

            getRoomUpdate(roomId);
            if (room.size === 2) {
                try {
                    await prisma.game.update({
                        where: { id: roomId },
                        data: { status: "GAME_FULL" }
                    });
                } catch (e) {
                    console.error("Error updating game status:", e);
                }
                room.forEach((_, client) => {
                    client.send(JSON.stringify({ type: "GAME_READY", message: "Game is ready!" }));
                })
            }
        } else if (data.type === "GAME_ACTION") {
            if (currentRoomId && rooms.has(currentRoomId)) {
                const room = rooms.get(currentRoomId)!;

                room.forEach((_, client) => {
                    if (client !== socket && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });

                if (room.size === 0) {
                    rooms.delete(currentRoomId);
                }
            }
        } else if (data.type === "GAME_LOADING") {
            // generate questions and put them in the database
            if (currentRoomId) {
                await generateBoth(currentRoomId, 100);

                const room = rooms.get(currentRoomId)!;
                room.forEach((_, client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: "QUESTIONS_READY" }));
                    }
                })
            } else {
                console.error("No current room ID found for GAME_LOADING action");
            }
        } else if (data.type === "FIND_MATCH") {
            const user = data.user;
            const mbrr = data.mbrr;

            if (!matchmakingQueue.find(p => p.user.id === user.id)) {
                matchmakingQueue.push({
                    socket,
                    user,
                    mbrr,
                    joinedAt: Date.now()
                });
                console.log(`User ${user.username} added to matchmaking queue with MBRR ${mbrr}`);
            }
            return;
        }

        if (data.type === "CANCEL_MATCH") {
            const user = data.user;
            matchmakingQueue = matchmakingQueue.filter(p => p.user.id !== user.id);
            return;
        }
    });

    socket.on('close', () => {
        matchmakingQueue = matchmakingQueue.filter(p => p.socket !== socket);
        if (currentRoomId && rooms.has(currentRoomId)) {
            const room = rooms.get(currentRoomId)!;
            room.delete(socket);

            if (room.size === 0) {
                rooms.delete(currentRoomId);
                // figure out what to here: delete game from db or set to abandoned?
            } else {
                getRoomUpdate(currentRoomId);
            }
        }
    })
})