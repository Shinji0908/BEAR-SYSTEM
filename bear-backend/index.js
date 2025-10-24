const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./utils/helpers');

// Import models for chat functionality
const Message = require('./models/Message');
const Incident = require('./models/Incident');
const User = require('./models/User');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true,
});
app.use('/api/auth', authLimiter);

// Middleware - Secure CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


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
app.use("/api/ml", require("./routes/ml"));
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
        console.log('MongoDB Connected successfully');
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err.message);
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

// Store user-to-socket mapping for filtering self-notifications
const userSocketMap = new Map(); // userId -> socketId
const socketUserMap = new Map(); // socketId -> userId

// Expose io to routes
app.set('io', io);

// Enhanced Socket.IO connection with authentication
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id} (${socket.conn.transport.name})`);

  // Authenticate socket connection
  socket.on('authenticate', ({ token }) => {
    try {
      console.log(`[authenticate] Socket ${socket.id} attempting authentication`);
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.id;
      
      // Store mappings
      userSocketMap.set(userId, socket.id);
      socketUserMap.set(socket.id, userId);
      
      console.log(`[authenticate] User authenticated: ${userId} -> socket ${socket.id}`);
      socket.emit('authenticated', { userId });
    } catch (error) {
      console.log(`[authenticate] Socket authentication failed: ${error.message}`);
      socket.emit('authentication_failed', { message: 'Invalid token' });
    }
  });

  socket.on('joinIncident', ({ incidentId }) => {
    if (!incidentId) return;
    const room = `incident:${incidentId}`;
    socket.join(room);
    console.log(`User joined incident room: ${incidentId}`);
    socket.emit('joinedIncident', { incidentId });
  });

  socket.on('leaveIncident', ({ incidentId }) => {
    if (!incidentId) return;
    const room = `incident:${incidentId}`;
    socket.leave(room);
    console.log(`User left incident room: ${incidentId}`);
  });

  // Chat functionality handlers
  socket.on('joinChat', async ({ incidentId }) => {
    try {
      console.log(`[joinChat] Socket ${socket.id} attempting to join chat for incident ${incidentId}`);
      
      if (!incidentId) {
        console.log(`[joinChat] No incidentId provided`);
        return;
      }
      
      const userId = socketUserMap.get(socket.id);
      if (!userId) {
        console.log(`[joinChat] Authentication required - no userId for socket ${socket.id}`);
        socket.emit('error', { message: 'Authentication required to join chat' });
        return;
      }
      
      console.log(`[joinChat] User ${userId} attempting to join chat for incident ${incidentId}`);

      // Verify user has access to this incident's chat
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

      // Authorization check
      const isReporter = incident.reportedBy.toString() === userId;
      const isResponder = user.role === "Responder" && user.verificationStatus === "Verified";
      const isAdmin = user.role === "Admin";

      if (!isReporter && !isResponder && !isAdmin) {
        socket.emit('error', { message: 'Access denied to this incident chat' });
        return;
      }

      // Join the chat room
      socket.join(`chat:${incidentId}`);
      console.log(`[joinChat] User ${userId} successfully joined chat room: chat:${incidentId}`);
      socket.emit('joinedChat', { incidentId });
    } catch (error) {
      console.error('Error joining chat:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  socket.on('leaveChat', ({ incidentId }) => {
    if (!incidentId) return;
    socket.leave(`chat:${incidentId}`);
    console.log(`User left chat room: ${incidentId}`);
  });

  socket.on('sendMessage', async ({ incidentId, content }) => {
    try {
      console.log(`[sendMessage] Received from socket ${socket.id}:`, { incidentId, content });
      
      const userId = socketUserMap.get(socket.id);
      if (!userId) {
        console.log(`[sendMessage] Authentication failed - no userId for socket ${socket.id}`);
        socket.emit('error', { message: 'Authentication required to send messages' });
        return;
      }
      
      console.log(`[sendMessage] User ${userId} attempting to send message`);

      if (!incidentId || !content || content.trim().length === 0) {
        console.log(`[sendMessage] Validation failed - missing incidentId or content`);
        socket.emit('error', { message: 'Incident ID and message content are required' });
        return;
      }

      // Validate message length
      if (content.length > 1000) {
        socket.emit('error', { message: 'Message too long (max 1000 characters)' });
        return;
      }

      // Verify user has access to this incident's chat
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

      // Authorization check
      const isReporter = incident.reportedBy.toString() === userId;
      const isResponder = user.role === "Responder" && user.verificationStatus === "Verified";
      const isAdmin = user.role === "Admin";

      if (!isReporter && !isResponder && !isAdmin) {
        socket.emit('error', { message: 'Access denied to send messages for this incident' });
        return;
      }

      // Create new message
      const senderName = `${user.firstName} ${user.lastName}`;
      const newMessage = new Message({
        incidentId,
        senderId: userId,
        senderName,
        content: content.trim()
      });

      await newMessage.save();
      console.log(`[sendMessage] Message saved to database:`, { messageId: newMessage._id, incidentId });

      // Format message for broadcasting
      const messageData = {
        messageId: newMessage._id,
        senderId: userId,
        senderName,
        content: newMessage.content,
        timestamp: newMessage.timestamp.getTime() // Convert Date to Unix timestamp (milliseconds)
      };

      // Broadcast message to all users in the chat room
      io.to(`chat:${incidentId}`).emit('receiveMessage', messageData);
      
      console.log(`[sendMessage] Message broadcasted to room chat:${incidentId}`, messageData);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', (reason) => {
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      userSocketMap.delete(userId);
      socketUserMap.delete(socket.id);
      console.log(`User disconnected: ${userId}`);
    }
  });

  // Handle connection errors (minimal logging)
  socket.on('error', (error) => {
    console.error(`Socket error:`, error.message);
  });
});

// Helper function to broadcast to all except sender
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
  
  console.log(`Broadcasted ${event} to ${allSockets.length - 1} clients`);
};

// Expose helper function to routes
app.set('broadcastToOthers', broadcastToOthers);

// Listen on all interfaces (PC + Emulator + LAN)
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
  
  console.log(`Server (HTTP) on http://0.0.0.0:${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://${serverIP}:${PORT}`);
  console.log(`Emulator: http://10.0.2.2:${PORT}`);
});