const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { db } = require('../database/schema');
const { getCurrentTimestampIsrael } = require('../utils/dateUtils');
const translation = require('../services/translation');

// Store io instance reference
let io;

// Function to set io instance (called from index.js after initialization)
function setIo(ioInstance) {
  io = ioInstance;
  console.log('Socket.IO instance set in taskConfirmation route');
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Convert HEIC/HEIF images to JPEG for browser compatibility
 * @param {string} filePath - Path to the uploaded file
 * @returns {Promise<string>} - Path to the converted file (or original if no conversion needed)
 */
async function convertToJpegIfNeeded(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const heicExtensions = ['.heic', '.heif'];

  if (!heicExtensions.includes(ext)) {
    return filePath; // No conversion needed
  }

  console.log(`Converting HEIC/HEIF image to JPEG: ${filePath}`);

  // Generate new filename with .jpg extension
  const newFilePath = filePath.replace(/\.(heic|heif)$/i, '.jpg');

  try {
    await sharp(filePath)
      .jpeg({ quality: 90 })
      .toFile(newFilePath);

    // Delete original HEIC file
    fs.unlinkSync(filePath);

    console.log(`Successfully converted to: ${newFilePath}`);
    return newFilePath;
  } catch (error) {
    console.error('Error converting HEIC to JPEG:', error);
    // Return original file if conversion fails
    return filePath;
  }
}

// Configure multer with secure filename generation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with crypto (RESEARCH.md Pattern 1)
    const uniqueName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for camera photos
  fileFilter: (req, file, cb) => {
    // Allow common image types including mobile camera formats
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/gif',
      'image/webp',
      'image/heic',    // iPhone camera format
      'image/heif'     // iPhone camera format
    ];
    // Also check by extension for cases where mimetype is wrong
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      console.error(`File rejected: mimetype=${file.mimetype}, ext=${ext}, original=${file.originalname}`);
      cb(new Error('רק קבצי תמונה מותרים (JPG, PNG, GIF, WebP, HEIC)'));
    }
  }
});

// Generate a unique token for employee task confirmation
router.post('/generate', async (req, res) => {
  try {
    const { employeeId, taskIds } = req.body;

    if (!employeeId || !taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'חסרים פרטים: מזהה עובד ורשימת משימות' });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Store token in database
    const stmt = db.prepare(`
      INSERT INTO task_confirmations (token, employee_id, task_ids, expires_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(token, employeeId, JSON.stringify(taskIds), expiresAt.toISOString());

    res.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Error generating confirmation token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tasks for a confirmation token
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Get confirmation record
    const confirmation = db.prepare(`
      SELECT * FROM task_confirmations WHERE token = ?
    `).get(token);

    if (!confirmation) {
      return res.status(404).json({ error: 'קוד אימות לא נמצא' });
    }

    // Check if token expired
    const now = new Date();
    const expiresAt = new Date(confirmation.expires_at);
    if (now > expiresAt) {
      return res.status(410).json({ error: 'קוד האימות פג תוקף' });
    }

    // Parse task IDs
    const taskIds = JSON.parse(confirmation.task_ids);

    // Get tasks with related data
    const tasks = db.prepare(`
      SELECT
        t.*,
        s.name as system_name,
        e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.id IN (${taskIds.map(() => '?').join(',')})
      ORDER BY t.start_time ASC
    `).all(...taskIds);

    // Get employee info
    const employee = db.prepare(`
      SELECT id, name, phone, language FROM employees WHERE id = ?
    `).get(confirmation.employee_id);

    // Translate task content for non-Hebrew employees (same behavior as WhatsApp message language)
    let localizedTasks = tasks;
    const employeeLanguage = employee?.language || 'he';

    if (employeeLanguage !== 'he') {
      localizedTasks = await Promise.all(tasks.map(async (task) => {
        try {
          const titleResult = await translation.translateFromHebrew(task.title || '', employeeLanguage);
          const descriptionResult = task.description
            ? await translation.translateFromHebrew(task.description, employeeLanguage)
            : null;
          const systemResult = task.system_name
            ? await translation.translateFromHebrew(task.system_name, employeeLanguage)
            : null;

          return {
            ...task,
            title: titleResult.translation,
            description: descriptionResult ? descriptionResult.translation : task.description,
            system_name: systemResult ? systemResult.translation : task.system_name
          };
        } catch (err) {
          console.warn(`Task translation failed for task ${task.id}, returning original text:`, err.message);
          return task;
        }
      }));
    }

    res.json({
      success: true,
      employee,
      tasks: localizedTasks,
      isAcknowledged: confirmation.is_acknowledged === 1,
      acknowledgedAt: confirmation.acknowledged_at
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete task with images and note
router.post('/:token/complete', upload.array('images', 5), async (req, res) => {
  try {
    const { token } = req.params;
    const { taskId, note } = req.body;

    // Validate token
    const confirmation = db.prepare(`
      SELECT * FROM task_confirmations WHERE token = ?
    `).get(token);

    if (!confirmation) {
      return res.status(404).json({ error: 'קישור לא תקין' });
    }

    // Check if token expired
    const now = new Date();
    const expiresAt = new Date(confirmation.expires_at);
    if (now > expiresAt) {
      return res.status(410).json({ error: 'קוד האימות פג תוקף' });
    }

    // Check if this task belongs to this token
    const taskIds = JSON.parse(confirmation.task_ids);
    if (!taskIds.includes(parseInt(taskId))) {
      return res.status(403).json({ error: 'משימה לא שייכת לקישור זה' });
    }

    // Save images if uploaded
    const savedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Convert HEIC/HEIF to JPEG for browser compatibility
        const originalPath = file.path;
        const convertedPath = await convertToJpegIfNeeded(originalPath);
        const finalFilename = path.basename(convertedPath);
        const imagePath = `/uploads/${finalFilename}`;

        db.prepare(`
          INSERT INTO task_attachments (task_id, file_path, file_type)
          VALUES (?, ?, 'image')
        `).run(taskId, imagePath);

        savedImages.push(imagePath);
      }
    }

    // Save note if provided, translate to Hebrew if needed
    if (note && note.trim()) {
      // Get employee language to determine if translation needed
      const task = db.prepare('SELECT employee_id FROM tasks WHERE id = ?').get(taskId);
      const employee = db.prepare('SELECT language FROM employees WHERE id = ?').get(task.employee_id);
      const employeeLanguage = employee?.language || 'he';

      let translatedNote = note.trim();
      let originalLanguage = null;
      let translationProvider = null;

      if (employeeLanguage !== 'he') {
        // Employee's language is not Hebrew, translate note
        console.log(`Translating note from ${employeeLanguage} to Hebrew...`);
        const result = await translation.translateToHebrew(note.trim(), employeeLanguage);
        translatedNote = result.translation;
        translationProvider = result.provider;
        originalLanguage = employeeLanguage;

        console.log(`Translation completed: ${translationProvider} (${employeeLanguage}→he)`);
      }

      // Save translated note, original language, and translation provider
      db.prepare(`
        UPDATE tasks SET completion_note = ?, original_language = ?, translation_provider = ? WHERE id = ?
      `).run(translatedNote, originalLanguage, translationProvider, taskId);

      console.log(`Note saved (language: ${originalLanguage || 'he'}, provider: ${translationProvider || 'none'})`);
    }

    // Capture completion timestamp
    const completedAt = getCurrentTimestampIsrael();

    // Update task status to pending_approval (waiting for manager approval)
    db.prepare(`
      UPDATE tasks SET status = 'pending_approval', completed_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(completedAt, taskId);

    // Fetch updated task with JOINs for real-time broadcast
    const updatedTask = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.id = ?
    `).get(taskId);

    // Broadcast real-time update (Phase 1 pattern)
    if (io) {
      io.emit('task:updated', { task: updatedTask });
    }

    res.json({
      success: true,
      message: 'המשימה עודכנה בהצלחה',
      imagePaths: savedImages
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'שגיאה בשמירת הנתונים' });
  }
});

// Update a single task status
router.put('/:token/task/:taskId', (req, res) => {
  try {
    const { token, taskId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['draft', 'sent', 'received', 'pending_approval', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'סטטוס לא חוקי' });
    }

    // Verify token exists and not expired
    const confirmation = db.prepare(`
      SELECT * FROM task_confirmations WHERE token = ?
    `).get(token);

    if (!confirmation) {
      return res.status(404).json({ error: 'קוד אימות לא נמצא' });
    }

    const now = new Date();
    const expiresAt = new Date(confirmation.expires_at);
    if (now > expiresAt) {
      return res.status(410).json({ error: 'קוד האימות פג תוקף' });
    }

    // Verify task belongs to this confirmation
    const taskIds = JSON.parse(confirmation.task_ids);
    if (!taskIds.includes(parseInt(taskId))) {
      return res.status(403).json({ error: 'משימה זו לא שייכת לקוד האימות' });
    }

    // Update task status
    const stmt = db.prepare(`
      UPDATE tasks
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(status, taskId);

    // Get updated task with related data for broadcasting
    const updatedTask = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.id = ?
    `).get(taskId);

    // Broadcast task update event
    if (io && updatedTask) {
      io.emit('task:updated', { task: updatedTask });
    }

    res.json({
      success: true,
      message: 'סטטוס המשימה עודכן בהצלחה'
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Acknowledge receipt of all tasks
router.post('/:token/acknowledge', (req, res) => {
  try {
    const { token } = req.params;

    // Verify token exists and not expired
    const confirmation = db.prepare(`
      SELECT * FROM task_confirmations WHERE token = ?
    `).get(token);

    if (!confirmation) {
      return res.status(404).json({ error: 'קוד אימות לא נמצא' });
    }

    const now = new Date();
    const expiresAt = new Date(confirmation.expires_at);
    if (now > expiresAt) {
      return res.status(410).json({ error: 'קוד האימות פג תוקף' });
    }

    if (confirmation.is_acknowledged === 1) {
      return res.json({
        success: true,
        message: 'המשימות כבר אושרו קודם לכן',
        acknowledgedAt: confirmation.acknowledged_at
      });
    }

    // Mark as acknowledged
    const timestamp = getCurrentTimestampIsrael();
    const stmt = db.prepare(`
      UPDATE task_confirmations
      SET is_acknowledged = 1, acknowledged_at = ?
      WHERE token = ?
    `);

    stmt.run(timestamp, token);

    // Update all tasks to 'received' status
    const taskIds = JSON.parse(confirmation.task_ids);
    const updateStmt = db.prepare(`
      UPDATE tasks
      SET status = 'received', acknowledged_at = ?, updated_at = ?
      WHERE id = ?
    `);

    taskIds.forEach(taskId => {
      updateStmt.run(timestamp, timestamp, taskId);
    });

    // Broadcast task update events for all acknowledged tasks
    if (io) {
      console.log('📡 Broadcasting task updates for acknowledged tasks...');
      const updatedTasks = db.prepare(`
        SELECT t.*, s.name as system_name, e.name as employee_name
        FROM tasks t
        LEFT JOIN systems s ON t.system_id = s.id
        LEFT JOIN employees e ON t.employee_id = e.id
        WHERE t.id IN (${taskIds.map(() => '?').join(',')})
      `).all(...taskIds);

      console.log(`   Found ${updatedTasks.length} tasks to broadcast`);
      updatedTasks.forEach(task => {
        console.log(`   📤 Broadcasting task ${task.id} with status: ${task.status}`);
        io.emit('task:updated', { task });
      });
      console.log('   ✅ All broadcasts sent');
    } else {
      console.log('⚠️ WARNING: io is undefined, cannot broadcast task updates');
    }

    res.json({
      success: true,
      message: 'קבלת המשימות אושרה בהצלחה'
    });
  } catch (error) {
    console.error('Error acknowledging tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.setIo = setIo;
