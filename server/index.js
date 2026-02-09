const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const { initializeDatabase, checkAndSeedDatabase } = require('./database/schema');

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

// Auto-seed if database is empty (for Railway/cloud deployments)
checkAndSeedDatabase();

// Initialize data retention (scheduled cleanup)
const { initializeDataRetention } = require('./services/dataRetention');
initializeDataRetention();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current QR code if available (for clients connecting after QR was generated)
  const whatsappService = require('./services/whatsapp');
  if (whatsappService.qrDataUrl && !whatsappService.isReady) {
    socket.emit('whatsapp:qr', { qrDataUrl: whatsappService.qrDataUrl });
    console.log('✓ Sent existing QR to new client');
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize WhatsApp service with Socket.IO
const whatsappService = require('./services/whatsapp');
whatsappService.setIo(io);

// API Routes
const tasksRouter = require('./routes/tasks');
app.use('/api/tasks', tasksRouter);
app.use('/api/systems', require('./routes/systems'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/buildings', require('./routes/buildings'));
app.use('/api/data', require('./routes/data'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
const taskConfirmationRouter = require('./routes/taskConfirmation');
app.use('/api/confirm', taskConfirmationRouter);
const historyRouter = require('./routes/history');
app.use('/api/history', historyRouter);
app.use('/api/accounts', require('./routes/accounts'));

// Set io instance in routes after all routes are loaded
tasksRouter.setIo(io);
taskConfirmationRouter.setIo(io);

// Initialize WhatsApp client (auto-reconnects if session exists)
whatsappService.initialize().catch(err => {
  console.error('WhatsApp initialization error:', err);
});

// Dynamic route for task confirmation pages
// This generates HTML dynamically from the database instead of serving static files
// Required for Railway/cloud deployments where static files don't persist
app.get('/docs/task-:token.html', async (req, res) => {
  try {
    const { token } = req.params;
    const { db } = require('./database/schema');
    const htmlGenerator = require('./services/htmlGenerator');

    // Get confirmation record from database
    const confirmation = db.prepare(`
      SELECT * FROM task_confirmations WHERE token = ?
    `).get(token);

    if (!confirmation) {
      return res.status(404).send('<h1>דף לא נמצא</h1><p>הקישור אינו תקף או שפג תוקפו.</p>');
    }

    // Check if token expired
    const now = new Date();
    const expiresAt = new Date(confirmation.expires_at);
    if (now > expiresAt) {
      return res.status(410).send('<h1>פג תוקף</h1><p>הקישור פג תוקף. אנא בקש קישור חדש מהמנהל.</p>');
    }

    // Parse task IDs and get tasks
    const taskIds = JSON.parse(confirmation.task_ids);
    console.log(`[Dynamic HTML] Token: ${token.substring(0, 8)}...`);
    console.log(`[Dynamic HTML] Looking for task IDs: ${JSON.stringify(taskIds)}`);

    const tasks = db.prepare(`
      SELECT
        t.*,
        s.name as system_name,
        e.name as employee_name,
        e.language as employee_language
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.id IN (${taskIds.map(() => '?').join(',')})
      ORDER BY t.start_time ASC
    `).all(...taskIds);

    console.log(`[Dynamic HTML] Found ${tasks.length} tasks out of ${taskIds.length} requested`);

    // Get employee info
    const employee = db.prepare(`
      SELECT id, name, phone, language FROM employees WHERE id = ?
    `).get(confirmation.employee_id);

    if (!employee) {
      return res.status(404).send('<h1>עובד לא נמצא</h1>');
    }

    // Generate HTML dynamically
    const html = await htmlGenerator.generateTaskHtmlContent({
      token: token,
      employeeName: employee.name,
      tasks: tasks,
      isAcknowledged: confirmation.is_acknowledged === 1,
      acknowledgedAt: confirmation.acknowledged_at,
      language: employee.language || 'he'
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error generating task confirmation page:', error);
    res.status(500).send('<h1>שגיאה</h1><p>אירעה שגיאה בטעינת הדף. אנא נסה שוב.</p>');
  }
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app build directory
  const clientPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientPath));

  // Handle React routing - return index.html for all non-API routes
  // This must come after all API routes
  app.use((req, res, next) => {
    // Only handle GET requests for HTML (not API calls, static assets, etc.)
    // Skip /docs paths as they're handled by the dynamic route above
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/docs')) {
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
  console.log(`Network: http://192.168.1.41:${PORT}`);
  console.log(`WhatsApp: Integrated directly - no separate gateway needed`);
});

// Export io instance for use in routes
module.exports.io = io;

 
