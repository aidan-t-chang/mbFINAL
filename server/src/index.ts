import { WebSocketServer, WebSocket } from "ws";

const server = new WebSocketServer({ port: 8081 });

const rooms = new Map<string, Set<WebSocket>>();

server.on('connection', socket => {
    let currentRoomId: string | null = null;

    socket.on('message', message => {
        const data = JSON.parse(message.toString());

        if (data.type === "JOIN_ROOM") {
            const roomId = data.roomId;

            // create room if it doesn't exist
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }

            const room = rooms.get(roomId)!;

            if (room.size >= 2) {
                socket.send(JSON.stringify({ type: "ERROR", message: "Room is full" }));
                return;
            }

            room.add(socket);
            currentRoomId = roomId;
            socket.send(JSON.stringify({ type: "SUCCESS", message: `Joined room ${roomId}` }));

            if (room.size === 2) {
                // change later to send to server to change buttons to game start state
                room.forEach(client => {
                    client.send(JSON.stringify({ type: "START_GAME", message: "Game is starting!" }));
                })
            }
        } else if (data.type === "GAME_ACTION") {
            if (currentRoomId && rooms.has(currentRoomId)) {
                const room = rooms.get(currentRoomId)!;

                room.forEach(client => {
                    if (client !== socket && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });

                if (room.size === 0) {
                    rooms.delete(currentRoomId);
                }
            }
        }

    })
})