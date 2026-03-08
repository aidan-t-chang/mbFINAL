import { WebSocketServer } from "ws";

const server = new WebSocketServer({ port: 8081 });

server.on('connection', socket => {

    socket.on('message', message => {

        socket.send(`Echo: ${message}`);
    })
})