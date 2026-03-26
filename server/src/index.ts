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
                // change later to send to server to change buttons to game start state
                room.forEach((_, client) => {
                    client.send(JSON.stringify({ type: "START_GAME", message: "Game is starting!" }));
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