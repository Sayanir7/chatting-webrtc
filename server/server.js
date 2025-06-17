const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = 3001;

// Room structure
const rooms = {};         // { roomId: [socketId1, socketId2] }
const readyStatus = {};   // { roomId: Set(socketIds) }

io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);
  console.log(rooms);

  // Check if room exists and  is  full
  socket.on('check-room', (roomId) => {
    const clients = rooms[roomId];

    // Case 1: Room doesn't exist or is empty
    if (!clients || clients.length === 0) {
      socket.emit('room-status', { dne: true });
      return;
    }

    const alreadyJoined = clients.includes(socket.id);

    // Case 2: User is not in the room
    if (!alreadyJoined) {
      // If room is full, block them
      if (clients.length >= 2) {
        socket.emit('room-status', { full: true });
        return;
      } else {
        socket.emit('room-status', { joined: false }); // allowed to join
        return;
      }
    }

    // Case 3: User is already in the room — allowed
    socket.emit('room-status', { joinable: true });
  });


  // Join the room
  socket.on('join', (roomId) => {
    if (!rooms[roomId]) rooms[roomId] = [];

    if (rooms[roomId].length >= 2) {
      socket.emit('room-full');
      return;
    }

    rooms[roomId].push(socket.id);
    if (!readyStatus[roomId]) readyStatus[roomId] = new Set();

    socket.join(roomId);
    socket.roomId = roomId;

    console.log(`📥 Socket ${socket.id} joined room ${roomId}`);
    console.log(rooms);

    if (rooms[roomId].length > 1) {
      socket.to(roomId).emit('user-joined');
    }
  });

  // Handle "Start Video" from user
  socket.on('ready', (roomId) => {
    readyStatus[roomId]?.add(socket.id);

    const usersInRoom = rooms[roomId] || [];
    const readyUsers = readyStatus[roomId] || new Set();

    if (usersInRoom.length === 2 && readyUsers.size === 2) {
      const initiator = usersInRoom[0]; // Only the first user will start the call
      io.to(initiator).emit('start-call');
      console.log(`📞 Both ready in room ${roomId}, initiating call from ${initiator}`);
    } else {
      socket.to(roomId).emit('waiting');
    }
  });

  // WebRTC signaling
  socket.on('offer', ({ offer, room }) => {
    socket.to(room).emit('offer', { offer });
  });

  socket.on('answer', ({ answer, room }) => {
    socket.to(room).emit('answer', { answer });
  });

  socket.on('ice-candidate', ({ candidate, room }) => {
    socket.to(room).emit('ice-candidate', { candidate });
  });

  // Optional: Text chat
  socket.on('chat-message', ({ room, message }) => {
    socket.to(room).emit('chat-message', {
      message,
      sender: socket.id,
    });
  });

  //manual disconnect
  socket.on("manual-disconnect", (roomId) => {
    console.log(`🔌 Manual disconnect: ${socket.id} from room ${roomId}`);

    // Remove from rooms
    // rooms[roomId] = (rooms[roomId] || []).filter((id) => id !== socket.id);
    // if (rooms[roomId].length === 0) delete rooms[roomId];

    // Remove from ready status
    if (readyStatus[roomId]) {
      readyStatus[roomId].delete(socket.id);
      // if (readyStatus[roomId].size === 0) delete readyStatus[roomId];
    }

    // Optionally notify others
    socket.to(roomId).emit("user-left", socket.id);
  });


  // Handle disconnect

  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    console.log(`🔴 Socket ${socket.id} disconnected`);

    if (roomId) {
      // Remove from rooms
      rooms[roomId] = (rooms[roomId] || []).filter((id) => id !== socket.id);
      if (rooms[roomId].length === 0) delete rooms[roomId];

      // Remove from ready status
      if (readyStatus[roomId]) {
        readyStatus[roomId].delete(socket.id);
        if (readyStatus[roomId].size === 0) delete readyStatus[roomId];
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
