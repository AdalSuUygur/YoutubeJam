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
        console.log(`➕ Odaya giriş: ${socket.id} -> ${roomId}`);
        // Yeni gelene mevcut durumu iletmesi için odadakilere sinyal gönderir
        socket.to(roomId).emit('getSyncData', socket.id); 
    });

    socket.on('leaveRoom', (roomId) => {
        socket.leave(roomId);
        console.log(`➖ Odadan çıkış: ${socket.id} -> ${roomId}`);
    });

    socket.on('videoAction', (data) => {
        // Gelen eylemi odadaki diğer herkese yayınla
        socket.to(data.roomId).emit('videoActionFromServer', data);
    });

    socket.on('sendSyncData', (data) => {
        // Senkronizasyon verisini sadece hedef kişiye gönder
        io.to(data.targetId).emit('videoActionFromServer', data.action);
    });
});

server.listen(3000, () => {
    console.log('YoutubeJam Server 3000 portunda hazır!');
});