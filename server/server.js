const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// SANAL LİSTE (RAM'de tutulur, server kapanınca silinir)
let videoQueue = []; 

io.on('connection', (socket) => {
    
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`➕ Giriş: ${socket.id}`);
        
        // 1. Yeni gelene mevcut listeyi gönder
        socket.emit('updateQueue', videoQueue);
        
        // 2. Senkronizasyon iste
        socket.to(roomId).emit('requestSync', socket.id); 
    });

    socket.on('leaveRoom', (roomId) => {
        socket.leave(roomId);
    });

    // --- LİSTE YÖNETİMİ ---
    socket.on('queueAction', (data) => {
        // data = { type: 'ADD' | 'REMOVE' | 'NEXT', url: '...' }
        
        if (data.type === 'ADD') {
            videoQueue.push(data.url); // Listeye ekle
        } 
        else if (data.type === 'REMOVE') {
            // Belirli bir indexi sil (Gelişmiş özellik, şimdilik basit tutalım)
            videoQueue = videoQueue.filter(url => url !== data.url);
        }
        else if (data.type === 'NEXT') {
            // Listeden ilk videoyu çıkar ve oynat
            const nextUrl = videoQueue.shift(); 
            if (nextUrl) {
                io.to(data.roomId).emit('applyAction', { type: 'URL', newUrl: nextUrl });
            }
        }

        // Her değişiklikte herkese güncel listeyi duyur
        io.to(data.roomId).emit('updateQueue', videoQueue);
    });

    // --- MEVCUT VİDEO EYLEMLERİ ---
    socket.on('videoAction', (data) => {
        socket.to(data.roomId).emit('applyAction', data);
    });

    socket.on('sendSyncData', (data) => {
        io.to(data.targetId).emit('applyAction', data.action);
    });
});

server.listen(3000, () => {
    console.log('🚀 Jam Server V4 (Playlist Özellikli) Yayında!');
});