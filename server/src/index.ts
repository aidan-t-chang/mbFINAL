import { WebSocketServer, WebSocket } from "ws";
import { prisma } from "./db/index.js";
import { Prisma } from "@prisma/client";
import "dotenv/config";

const server = new WebSocketServer({ port: 8081 });

const rooms = new Map<string, Map<WebSocket, any>>();

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
            } else {
                console.error("No current room ID found for GAME_LOADING action");
            }

        }
    });

    socket.on('close', () => {
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