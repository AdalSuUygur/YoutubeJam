const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// DEĞİŞİKLİK: Global dizi yerine, Oda ID'lerine göre ayrılmış nesne
// Örnek Yapı: { "oda-1": ["urlA", "urlB"], "oda-2": ["urlC"] }
const roomQueues = {}; 

io.on('connection', (socket) => {
    
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`➕ Giriş: ${socket.id} -> Oda: ${roomId}`);
        
        // Eğer bu oda için henüz liste yoksa oluştur
        if (!roomQueues[roomId]) {
            roomQueues[roomId] = [];
        }
        
        // Sadece odaya ait olan listeyi gönder
        socket.emit('updateQueue', roomQueues[roomId]);
        
        socket.to(roomId).emit('requestSync', socket.id); 
    });

    socket.on('leaveRoom', (roomId) => {
        socket.leave(roomId);
        // Not: Bellek yönetimi için oda boşaldığında 'delete roomQueues[roomId]' eklenebilir.
        // Şimdilik karmaşıklığı artırmamak için eklemiyorum.
    });

    // --- LİSTE YÖNETİMİ ---
    socket.on('queueAction', (data) => {
        // data = { type, url, roomId }
        const { roomId, type, url } = data;

        // Güvenlik: Oda dizisi var mı kontrol et
        if (!roomQueues[roomId]) roomQueues[roomId] = [];

        if (type === 'ADD') {
            roomQueues[roomId].push(url);
        } 
        else if (type === 'REMOVE') {
            roomQueues[roomId] = roomQueues[roomId].filter(u => u !== url);
        }
        else if (type === 'NEXT') {
            // Sadece o odanın listesinden çek
            const nextUrl = roomQueues[roomId].shift(); 
            if (nextUrl) {
                io.to(roomId).emit('applyAction', { type: 'URL', newUrl: nextUrl });
            }
        }

        // Güncellemeyi SADECE o odaya duyur
        io.to(roomId).emit('updateQueue', roomQueues[roomId]);
    });

    // --- VİDEO EYLEMLERİ ---
    socket.on('videoAction', (data) => {
        // Zaten roomId ile filtreleniyordu, burası doğruydu.
        socket.to(data.roomId).emit('applyAction', data);
    });

    socket.on('sendSyncData', (data) => {
        io.to(data.targetId).emit('applyAction', data.action);
    });
});

server.listen(3000, () => {
    console.log('🚀 Jam Server V4.1 (Room-Based Playlist) Yayında!');
});