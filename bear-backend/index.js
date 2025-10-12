const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Import models for chat functionality
const Message = require('./models/Message');
const Incident = require('./models/Incident');
const User = require('./models/User');

const app = express();

// Middleware - Enhanced CORS for mobile device access
app.use(cors({
  origin: "*", // Allow all origins for mobile device testing
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware to log requests (simplified for production)
app.use((req, res, next) => {
  if (req.url !== '/' && !req.url.includes('static')) {
    console.log(`📥 ${req.method} ${req.url}`);
  }
  next();
});

// Basic route handler
app.get('/', (req, res) => {
  res.json({ message: 'BEAR System Backend is running', status: 'OK' });
});

// Routes
app.use('/api/incidents', require('./routes/incidents'));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/users", require("./routes/users"));
app.use("/api/verification", require("./routes/verification"));
app.use("/api/dashboard", require("./routes/dashboard"));

// MongoDB connect
// Environment-based configuration for different laptops/deployments
const NODE_ENV = process.env.NODE_ENV || 'development';
let MONGODB_IP;

switch (NODE_ENV) {
  case 'production':
    MONGODB_IP = process.env.MONGODB_IP || '192.168.1.15'; // Production MongoDB IP
    break;
  case 'development':
    MONGODB_IP = process.env.MONGODB_IP || '192.168.1.15'; // Current laptop IP
    break;
  default:
    MONGODB_IP = process.env.MONGODB_IP || '192.168.1.15'; // Default IP
}

const mongoUri = process.env.MONGO_URI || `mongodb://${MONGODB_IP}:27017/bear-system`;

mongoose.connect(mongoUri)
    .then(() => {
        console.log('✅ MongoDB Connected successfully');
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
    });

const PORT = process.env.PORT || 5000;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  },
  allowEIO3: true, // Allow Engine.IO v3 clients
  transports: ['websocket', 'polling'], // Allow both WebSocket and polling
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6, // 1MB
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 1024,
    concurrencyLimit: 10,
    memLevel: 7
  }
});

// ✅ Store user-to-socket mapping for filtering self-notifications
const userSocketMap = new Map(); // userId -> socketId
const socketUserMap = new Map(); // socketId -> userId

// Expose io to routes
app.set('io', io);

// ✅ Enhanced Socket.IO connection with authentication
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id} (${socket.conn.transport.name})`);

  // ✅ Authenticate socket connection
  socket.on('authenticate', ({ token }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.id;
      
      // Store mappings
      userSocketMap.set(userId, socket.id);
      socketUserMap.set(socket.id, userId);
      
      console.log(`✅ User authenticated: ${userId}`);
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
    console.log(`👥 User joined incident room: ${incidentId}`);
    socket.emit('joinedIncident', { incidentId });
  });

  socket.on('leaveIncident', ({ incidentId }) => {
    if (!incidentId) return;
    const room = `incident:${incidentId}`;
    socket.leave(room);
    console.log(`👋 User left incident room: ${incidentId}`);
  });

  // ✅ Chat functionality handlers
  socket.on('joinChat', async ({ incidentId }) => {
    try {
      if (!incidentId) return;
      
      const userId = socketUserMap.get(socket.id);
      if (!userId) {
        socket.emit('error', { message: 'Authentication required to join chat' });
        return;
      }

      // ✅ Verify user has access to this incident's chat
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        socket.emit('error', { message: 'Incident not found' });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      // ✅ Authorization check
      const isReporter = incident.reportedBy.toString() === userId;
      const isResponder = user.role === "Responder" && user.verificationStatus === "Verified";
      const isAdmin = user.role === "Admin";

      if (!isReporter && !isResponder && !isAdmin) {
        socket.emit('error', { message: 'Access denied to this incident chat' });
        return;
      }

      // ✅ Join the chat room
      socket.join(`chat:${incidentId}`);
      console.log(`💬 User joined chat room: ${incidentId}`);
      socket.emit('joinedChat', { incidentId });
    } catch (error) {
      console.error('❌ Error joining chat:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  socket.on('leaveChat', ({ incidentId }) => {
    if (!incidentId) return;
    socket.leave(`chat:${incidentId}`);
    console.log(`👋 User left chat room: ${incidentId}`);
  });

  socket.on('sendMessage', async ({ incidentId, content }) => {
    try {
      const userId = socketUserMap.get(socket.id);
      if (!userId) {
        socket.emit('error', { message: 'Authentication required to send messages' });
        return;
      }

      if (!incidentId || !content || content.trim().length === 0) {
        socket.emit('error', { message: 'Incident ID and message content are required' });
        return;
      }

      // ✅ Validate message length
      if (content.length > 1000) {
        socket.emit('error', { message: 'Message too long (max 1000 characters)' });
        return;
      }

      // ✅ Verify user has access to this incident's chat
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        socket.emit('error', { message: 'Incident not found' });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      // ✅ Authorization check
      const isReporter = incident.reportedBy.toString() === userId;
      const isResponder = user.role === "Responder" && user.verificationStatus === "Verified";
      const isAdmin = user.role === "Admin";

      if (!isReporter && !isResponder && !isAdmin) {
        socket.emit('error', { message: 'Access denied to send messages for this incident' });
        return;
      }

      // ✅ Create new message
      const senderName = `${user.firstName} ${user.lastName}`;
      const newMessage = new Message({
        incidentId,
        senderId: userId,
        senderName,
        content: content.trim()
      });

      await newMessage.save();

      // ✅ Format message for broadcasting
      const messageData = {
        messageId: newMessage._id,
        senderId: userId,
        senderName,
        content: newMessage.content,
        timestamp: newMessage.timestamp
      };

      // ✅ Broadcast message to all users in the chat room
      io.to(`chat:${incidentId}`).emit('receiveMessage', messageData);
      
      console.log(`💬 Message sent in chat: ${incidentId}`);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', (reason) => {
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      userSocketMap.delete(userId);
      socketUserMap.delete(socket.id);
      console.log(`🔌 User disconnected: ${userId}`);
    }
  });

  // Handle connection errors (minimal logging)
  socket.on('error', (error) => {
    console.error(`❌ Socket error:`, error.message);
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
  
  console.log(`📢 Broadcasted ${event} to ${allSockets.length - 1} clients`);
};

// Expose helper function to routes
app.set('broadcastToOthers', broadcastToOthers);

// ✅ Listen on all interfaces (PC + Emulator + LAN)
server.listen(PORT, "0.0.0.0", () => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let serverIP = 'localhost';
  
  // Find the first non-internal IPv4 address
  for (const interfaceName in networkInterfaces) {
    const addresses = networkInterfaces[interfaceName];
    for (const address of addresses) {
      if (address.family === 'IPv4' && !address.internal) {
        serverIP = address.address;
        break;
      }
    }
    if (serverIP !== 'localhost') break;
  }
  
  console.log(`🚀 Server (HTTP) on http://0.0.0.0:${PORT}`);
  console.log(`📌 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://${serverIP}:${PORT}`);
  console.log(`📱 Emulator: http://10.0.2.2:${PORT}`);
});