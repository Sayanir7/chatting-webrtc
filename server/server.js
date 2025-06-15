const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  socket.on('join', (roomId) => {
  const room = io.sockets.adapter.rooms.get(roomId);
  const numClients = room ? room.size : 0;

  if (numClients >= 2) {
    socket.emit('room-full');
    return;
  }

  socket.join(roomId);
  console.log(`Socket ${socket.id} joined room ${roomId}`);

  if (numClients === 1) {
    // second user just joined
    socket.to(roomId).emit('user-joined', socket.id); // emits to first peer
  }
});


  socket.on('offer', ({ offer, room }) => {
    socket.to(room).emit('offer', offer);
  });

  socket.on('answer', ({ answer, room }) => {
    socket.to(room).emit('answer', answer);
  });
  socket.on('ice-candidate', ({ candidate, room }) => {
    socket.to(room).emit('ice-candidate', { candidate });
  });


  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

server.listen(3001, () => {
  console.log('🚀 Signaling server running on http://localhost:3001');
});
