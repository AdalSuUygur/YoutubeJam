const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
// Odaların son URL değişim zamanlarını tutacağımız obje

const roomUrlCooldowns = {};

io.on('connection', (socket) => {
    
    // 1. Odaya Katılma İşlemi 
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`➕ Odaya giriş: ${socket.id} -> ${roomId}`);
        
        const clients = io.sockets.adapter.rooms.get(roomId);
        if (clients && clients.size > 1) {
            const [firstClient] = clients; 
            io.to(firstClient).emit('getSyncData', socket.id); 
            console.log(`🔍 ${socket.id} için ${firstClient} kullanıcısından veri isteniyor...`);
        }
    });

    // 2. Video Eylemleri (5 Saniyelik Kilit Mantığı ile)
    socket.on('videoAction', (data) => {
        if (data.type === 'URL_CHANGE') {
            const now = Date.now();
            const lastChange = roomUrlCooldowns[data.roomId] || 0;
            
            if (now - lastChange < 5000) {
                console.log(`⏳ ${data.roomId} odası için gelen URL değişimi reddedildi (Cooldown).`);
                return; 
            }
            roomUrlCooldowns[data.roomId] = now;
        }

        // Komutu odadaki diğer herkese yayınla
        socket.to(data.roomId).emit('videoActionFromServer', data);
    });

    // 3. Odadan Çıkış
    socket.on('leaveRoom', (roomId) => {
        socket.leave(roomId);
        console.log(`➖ Odadan çıkış: ${socket.id} -> ${roomId}`);
    });

    // 4. Sonradan Girenlere Senkronizasyon Verisi Gönderme
    socket.on('sendSyncData', (data) => {
        io.to(data.targetId).emit('videoActionFromServer', data.action);
    });
});
server.listen(3000, () => {
    console.log('YoutubeJam Server 3000 portunda hazır!');
});