const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ODA YAPISI: Sadece kuyruk listesi tutuyoruz.
// Örnek: rooms["oda-1"] = { queue: ["urlA", "urlB"] }
const rooms = {}; 

io.on('connection', (socket) => {
    
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`➕ Giriş: ${socket.id} -> Oda: ${roomId}`);
        
        // Oda yoksa başlat
        if (!rooms[roomId]) {
            rooms[roomId] = { queue: [] };
        }
        
        // Mevcut listeyi gönder
        socket.emit('updateQueue', rooms[roomId].queue);
        socket.to(roomId).emit('requestSync', socket.id); 
    });

    socket.on('leaveRoom', (roomId) => {
        socket.leave(roomId);
    });

    // --- LİSTE VE OYNATMA YÖNETİMİ ---
    socket.on('queueAction', (data) => {
        const { roomId, type, url } = data;

        // Oda güvenliği
        if (!rooms[roomId]) rooms[roomId] = { queue: [] };
        const room = rooms[roomId];

        if (type === 'ADD') {
            // YENİ KURAL: Aynı link listede varsa ekleme!
            if (room.queue.includes(url)) {
                console.log(`⚠️ Çift kayıt engellendi: ${url}`);
                return; // Fonksiyondan çık, işlem yapma
            }
            
            room.queue.push(url);
        } 
        else if (type === 'REMOVE') {
            // İstenen URL'yi listeden sil
            room.queue = room.queue.filter(u => u !== url);
        }
        else if (type === 'NEXT') {
            // LİSTEDEN SİLME MANTIĞI (shift)
            // Mantık: Şu an çalan (listenin başındaki) videoyu listeden at, sonrakini al.
            
            room.queue.shift(); // İlk elemanı sil (Dinlenen gitti)
            
            const nextUrl = room.queue[0]; // Yeni ilk elemanı al
            
            if (nextUrl) {
                io.to(roomId).emit('applyAction', { type: 'URL', newUrl: nextUrl });
            } else {
                console.log("⚠️ Liste boşaldı.");
            }
        }

        // Güncel listeyi herkese duyur
        io.to(roomId).emit('updateQueue', room.queue);
    });

    // --- VİDEO EYLEMLERİ ---
    socket.on('videoAction', (data) => {
        socket.to(data.roomId).emit('applyAction', data);
    });

    socket.on('sendSyncData', (data) => {
        io.to(data.targetId).emit('applyAction', data.action);
    });
});

server.listen(3000, () => {
    console.log('🚀 Jam Server V4.3 (No-Duplicates & Consuming Queue) Yayında!');
});