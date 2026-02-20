const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    // server.js içindeki joinRoom bloğunu şu şekilde güncelle
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`➕ Odaya giriş: ${socket.id} -> ${roomId}`);
        
        // Odadaki diğer kişileri bul
        const clients = io.sockets.adapter.rooms.get(roomId);
        
        // Eğer odada benden başka biri varsa (yani ilk giren ben değilsem)
        if (clients && clients.size > 1) {
            // Odadaki ilk kullanıcıyı (lideri) bul ve sadece ondan veri iste
            const [firstClient] = clients; 
            io.to(firstClient).emit('getSyncData', socket.id); 
            console.log(`🔍 ${socket.id} için ${firstClient} kullanıcısından veri isteniyor...`);
        }
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