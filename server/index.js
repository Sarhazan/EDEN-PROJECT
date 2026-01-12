const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database/schema');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database
initializeDatabase();

// API Routes
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/systems', require('./routes/systems'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/data', require('./routes/data'));
app.use('/api/whatsapp', require('./routes/whatsapp'));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
