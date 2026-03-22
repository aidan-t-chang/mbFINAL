import { WebSocketServer, WebSocket } from "ws";
import { prisma } from "./db/index.js";

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

            // create room if it doesn't exist
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Map());
            }

            try {
                await prisma.game.upsert({
                    where: { id: roomId },
                    update: {},
                    create: {
                        id: roomId,
                        status: "WAITING",
                        type: "standard" // change this depending on the gamemode
                    }
                });
            } catch (e) {
                console.error("Error creating/upserting game:", e);
            }

            const room = rooms.get(roomId)!;

            if (room.size >= 2) {
                socket.send(JSON.stringify({ type: "ERROR", message: "Room is full" }));
                return;
            }

            room.set(socket, user);
            currentRoomId = roomId;
            currentUser = user;

            try {
                await prisma.gamePlayer.upsert({
                    where: {
                        userId_gameId: {
                            userId: user.id,
                            gameId: roomId
                        }
                    }, 
                    update: {},
                    create: {
                        userId: user.id,
                        gameId: roomId
                    }
                });
            } catch (e) {
                console.error("Error creating/upserting player:", e);
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