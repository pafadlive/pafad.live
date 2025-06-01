const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

let waitingUser = null;

io.on('connection', socket => {
  console.log('A user connected:', socket.id);

  if (waitingUser) {
    const room = socket.id + '#' + waitingUser.id;
    socket.join(room);
    waitingUser.join(room);

    socket.partner = waitingUser.id;
    waitingUser.partner = socket.id;

    socket.emit('offer', waitingUser.offer);
    waitingUser = null;
  } else {
    waitingUser = socket;
    socket.on('offer', offer => {
      socket.offer = offer;
    });
  }

  socket.on('answer', answer => {
    if (socket.partner) {
      io.to(socket.partner).emit('answer', answer);
    }
  });

  socket.on('ice-candidate', candidate => {
    if (socket.partner) {
      io.to(socket.partner).emit('ice-candidate', candidate);
    }
  });

  socket.on('next', () => {
    socket.disconnect();
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }
    if (socket.partner) {
      io.to(socket.partner).emit('disconnect');
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
