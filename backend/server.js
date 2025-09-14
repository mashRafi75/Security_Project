require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Initialize Express app
const app = express();
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'https://localhost:3000',
    'http://127.0.0.1:3000',
    'https://127.0.0.1:3000'
  ],
  credentials: true
}));
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
      'https://127.0.0.1:3000'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true
  }
});

// Track active calls
const activeCalls = new Map();

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`⚡: User connected: ${socket.id}`);

  // Join a specific call room
  socket.on('join-call', ({ appointmentId, userId }) => {
    socket.join(appointmentId);
    activeCalls.set(socket.id, { appointmentId, userId });
    console.log(`User ${userId} joined call ${appointmentId}`);
    
    // Notify others in the room
    socket.to(appointmentId).emit('user-connected', { userId });
  });

  // WebRTC Signaling
  socket.on('webrtc-offer', ({ appointmentId, sdp }) => {
    socket.to(appointmentId).emit('webrtc-offer', { sdp });
  });

  socket.on('webrtc-answer', ({ appointmentId, sdp }) => {
    socket.to(appointmentId).emit('webrtc-answer', { sdp });
  });

  socket.on('webrtc-candidate', ({ appointmentId, candidate }) => {
    socket.to(appointmentId).emit('webrtc-candidate', { candidate });
  });

  // Handle call termination
  socket.on('end-call', ({ appointmentId }) => {
    socket.to(appointmentId).emit('call-ended');
    console.log(`Call ${appointmentId} ended by ${socket.id}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const callData = activeCalls.get(socket.id);
    if (callData) {
      const { appointmentId, userId } = callData;
      socket.to(appointmentId).emit('user-disconnected', { userId });
      activeCalls.delete(socket.id);
      console.log(`User ${userId} disconnected from call ${appointmentId}`);
    }
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    activeConnections: io.engine.clientsCount,
    activeCalls: activeCalls.size
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO endpoint: ws://localhost:${PORT}`);
  console.log(`Allowed origins: ${io.engine.opts.cors.origin.join(', ')}`);
});