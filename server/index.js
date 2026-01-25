const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const { initializeDatabase } = require('./database/schema');

// Load environment variables from .env file if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const app = express();
const PORT = process.env.PORT || 3002;

// Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/docs', express.static(path.join(__dirname, '..', 'docs')));

// Initialize database
initializeDatabase();

// Initialize data retention (scheduled cleanup)
const { initializeDataRetention } = require('./services/dataRetention');
initializeDataRetention();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Don't initialize WhatsApp automatically - it will be initialized when user clicks "connect" in the UI

// API Routes
const tasksRouter = require('./routes/tasks');
app.use('/api/tasks', tasksRouter);
app.use('/api/systems', require('./routes/systems'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/data', require('./routes/data'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
const taskConfirmationRouter = require('./routes/taskConfirmation');
app.use('/api/confirm', taskConfirmationRouter);
const historyRouter = require('./routes/history');
app.use('/api/history', historyRouter);

// Set io instance in routes after all routes are loaded
tasksRouter.setIo(io);
taskConfirmationRouter.setIo(io);

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app build directory
  const clientPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientPath));

  // Handle React routing - return index.html for all non-API routes
  // This must come after all API routes
  app.use((req, res, next) => {
    // Only handle GET requests for HTML (not API calls, static assets, etc.)
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(clientPath, 'index.html'));
    } else {
      next();
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'משהו השתבש',
    message: err.message
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://192.168.1.35:${PORT}`);
  console.log(`WhatsApp: Ready with LocalAuth (session persistent)`);
});

// Export io instance for use in routes
module.exports.io = io;

 
