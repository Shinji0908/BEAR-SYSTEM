const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - Headers:`, req.headers);
  next();
});

// ✅ Health check endpoints (MUST be before MongoDB connection for Railway)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Test endpoint for Railway debugging
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'BEAR System Backend is running',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

// Routes
app.use('/api/incidents', require('./routes/incidents'));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/users", require("./routes/users"));
app.use("/api/verification", require("./routes/verification"));
app.use("/api/dashboard", require("./routes/dashboard"));

// MongoDB connect
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/bear-system';
console.log('🔍 Connecting to MongoDB:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs

mongoose.connect(mongoUri)
    .then(() => {
        console.log('✅ MongoDB Connected successfully');
        console.log('📊 Database:', mongoose.connection.db.databaseName);
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.log('⚠️  Server will continue without database connection');
        console.log('💡 Make sure MongoDB is running and check your MONGO_URI');
    });

const PORT = process.env.PORT || 5000;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ✅ Store user-to-socket mapping for filtering self-notifications
const userSocketMap = new Map(); // userId -> socketId
const socketUserMap = new Map(); // socketId -> userId

// Expose io to routes
app.set('io', io);

// ✅ Enhanced Socket.IO connection with authentication
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // ✅ Authenticate socket connection
  socket.on('authenticate', ({ token }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.id;
      
      // Store mappings
      userSocketMap.set(userId, socket.id);
      socketUserMap.set(socket.id, userId);
      
      console.log(`✅ Socket ${socket.id} authenticated for user ${userId}`);
      socket.emit('authenticated', { userId });
    } catch (error) {
      console.log(`❌ Socket authentication failed: ${error.message}`);
      socket.emit('authentication_failed', { message: 'Invalid token' });
    }
  });

  socket.on('joinIncident', ({ incidentId }) => {
    if (!incidentId) return;
    const room = `incident:${incidentId}`;
    socket.join(room);
    console.log(`👥 ${socket.id} joined ${room}`);
    socket.emit('joinedIncident', { incidentId });
  });

  socket.on('leaveIncident', ({ incidentId }) => {
    if (!incidentId) return;
    const room = `incident:${incidentId}`;
    socket.leave(room);
    console.log(`👋 ${socket.id} left ${room}`);
  });

  socket.on('disconnect', (reason) => {
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      userSocketMap.delete(userId);
      socketUserMap.delete(socket.id);
      console.log(`🔌 User ${userId} disconnected: ${socket.id} (${reason})`);
    } else {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    }
  });
});

// ✅ Helper function to broadcast to all except sender
const broadcastToOthers = async (io, senderUserId, event, data) => {
  const senderSocketId = userSocketMap.get(senderUserId);
  
  // Get all connected sockets
  const allSockets = await io.fetchSockets();
  
  // Broadcast to all except sender
  allSockets.forEach(socket => {
    if (socket.id !== senderSocketId) {
      socket.emit(event, data);
    }
  });
  
  console.log(`📢 Broadcasted ${event} to ${allSockets.length - 1} clients (excluding sender ${senderUserId})`);
};

// Expose helper function to routes
app.set('broadcastToOthers', broadcastToOthers);

// ✅ Listen on all interfaces (PC + Emulator + LAN)
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server (HTTP) on http://0.0.0.0:${PORT}`);
  console.log(`📌 Local: http://localhost:${PORT}`);
  console.log(`📱 Emulator: http://10.0.2.2:${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
});