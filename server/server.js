const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`Cihaz bağlandı: ${socket.id} -> Oda: ${roomId}`);
    });

    socket.on('videoAction', (data) => {
        socket.to(data.roomId).emit('videoActionFromServer', data);
    });
});

server.listen(3000, () => {
    console.log('Haberci 3000 portunda aktif!');
});