const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Object to store the last URL change time for rooms
const roomUrlCooldowns = {};

io.on('connection', (socket) => {
    
    // 1. Join Room Process
   socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        socket.roomId = roomId; // Store room ID to know which room to leave on disconnect
        console.log(`[JamRoom] ➕ User joined: ${socket.id} -> ${roomId}`);
        
        const clients = io.sockets.adapter.rooms.get(roomId);
        
        // Notify everyone in the room about the updated user count
        if (clients) {
            io.to(roomId).emit('userCountUpdate', clients.size);
        }

        if (clients && clients.size > 1) {
            const [firstClient] = clients; 
            io.to(firstClient).emit('getSyncData', socket.id); 
            console.log(`[JamRoom] 🔍 Requesting data from ${firstClient} for ${socket.id}...`);
        }
    });

    socket.on('disconnect', () => {
        if (socket.roomId) {
            const room = io.sockets.adapter.rooms.get(socket.roomId);
            const count = room ? room.size : 0;
            io.to(socket.roomId).emit('userCountUpdate', count); // Notify remaining users about the new count
        }
    });

    // 2. Video Actions (with 5-second cooldown logic)
    socket.on('videoAction', (data) => {
        if (data.type === 'URL_CHANGE') {
            const now = Date.now();
            const lastChange = roomUrlCooldowns[data.roomId] || 0;
            
            if (now - lastChange < 5000) {
                console.log(`[JamRoom] ⏳ URL change rejected for room ${data.roomId} (Cooldown).`);
                return; 
            }
            roomUrlCooldowns[data.roomId] = now;
        }

        // Broadcast the command to everyone else in the room
        socket.to(data.roomId).emit('videoActionFromServer', data);
    });

    // 3. Leave Room
    socket.on('leaveRoom', (roomId) => {
        socket.leave(roomId);
        console.log(`[JamRoom] ➖ User left: ${socket.id} -> ${roomId}`);
    });

    // 4. Send Sync Data to Late Joiners
    socket.on('sendSyncData', (data) => {
        io.to(data.targetId).emit('videoActionFromServer', data.action);
    });
});

server.listen(3000, () => {
    console.log('[JamRoom] Server is running on port 3000!');
});