# Phase 2: Enhanced Task Completion - Research

**Researched:** 2026-01-20
**Domain:** File uploads, image handling, real-time completion data
**Confidence:** HIGH

## Summary

Phase 2 adds image upload and text notes to the task completion flow. Workers submit completion data (images + notes) from static HTML confirmation pages hosted on Vercel. The server stores uploaded images in `/uploads` directory and broadcasts completion updates via Socket.IO so managers see changes immediately in the React admin interface.

**Key technical challenge:** Static HTML pages cannot directly access server file system, so file uploads must use standard multipart/form-data POST to Express API endpoints, with multer handling the server-side reception and storage.

**Architectural constraint:** Task confirmation pages are static HTML files deployed to Vercel. They receive task data via URL parameters embedded at generation time, and must send all updates (including file uploads) back to the main Node.js server via API calls. This means workers interact with a static page that communicates with a separate backend API.

**Primary recommendation:** Use multer with DiskStorage for file uploads, generate unique filenames with crypto.randomBytes, store file paths (not blobs) in SQLite, and broadcast completion updates via existing Socket.IO infrastructure from Phase 1.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| multer | 2.0.2 | Multipart form data handling | De facto standard for Express file uploads, already installed in project |
| crypto (Node.js built-in) | N/A | Generate unique filenames | Cryptographically secure random bytes prevent collisions and path traversal attacks |
| better-sqlite3 | 12.6.0 | Store file metadata | Already in use, synchronous API ideal for storing file paths and notes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express.static | Built-in | Serve uploaded images | Already configured for `/uploads` directory in server/index.js |
| Socket.IO | 4.8.2 | Real-time completion updates | Already configured in Phase 1 for broadcasting task changes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| File paths in SQLite | BLOB storage | BLOBs increase database size, paths keep DB compact and allow filesystem-based backups |
| Multer DiskStorage | MemoryStorage | Memory storage doesn't persist files, only useful for immediate streaming to cloud services |
| Crypto random bytes | UUID library | Crypto is built-in and sufficient for 32-byte unique filenames |
| Static file serving | CDN/external storage | External storage adds complexity and cost, not needed for this scale |

**Installation:**
No new packages required - multer 2.0.2 already installed, crypto is Node.js built-in.

## Architecture Patterns

### Recommended Database Schema
```sql
-- Add columns to existing tasks table
ALTER TABLE tasks ADD COLUMN completion_note TEXT;
ALTER TABLE tasks ADD COLUMN completion_images TEXT; -- JSON array of file paths

-- Alternative: Separate attachments table (more flexible for multiple images)
CREATE TABLE task_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT CHECK(file_type IN ('image', 'note')),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

**Recommendation:** Use separate `task_attachments` table. This allows unlimited images per task, easier querying, and cleaner schema evolution. Based on database design pattern from [Microsoft Access Attachments](https://support.microsoft.com/en-us/office/attach-files-and-graphics-to-the-records-in-your-database-d40a09ad-a753-4a14-9161-7f15baad6dbd).

### Pattern 1: Secure File Upload with Multer
**What:** Configure multer with DiskStorage, unique filenames, file type validation, and size limits
**When to use:** Any user file upload in Express applications
**Example:**
```javascript
// Source: https://betterstack.com/community/guides/scaling-nodejs/multer-in-nodejs/
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename with crypto
    const uniqueName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only images
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG allowed.'));
    }
  }
});
```

### Pattern 2: File Upload from Static HTML with FormData
**What:** Use FormData API to send files from vanilla JavaScript to Express endpoint
**When to use:** File uploads from static HTML pages without frameworks
**Example:**
```javascript
// Source: https://muffinman.io/blog/uploading-files-using-fetch-multipart-form-data/
async function uploadImage(taskId, imageFile, note) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('note', note);
  formData.append('taskId', taskId);

  const response = await fetch(`${API_URL}/api/tasks/${taskId}/complete`, {
    method: 'POST',
    body: formData
    // CRITICAL: Do NOT set Content-Type header
    // Browser sets it automatically with boundary
  });

  return response.json();
}
```

**Key detail:** Never manually set `Content-Type: multipart/form-data` when using FormData - the browser must set it with the correct boundary parameter.

### Pattern 3: Mobile Camera Capture
**What:** Use HTML input with accept and capture attributes to launch mobile camera
**When to use:** Direct photo capture on iOS/Android devices
**Example:**
```html
<!-- Source: https://web.dev/media-capturing-images/ -->
<input type="file"
       accept="image/*"
       capture="environment"
       id="cameraInput">
```

**Behavior:**
- **iOS:** Offers choice between camera and photo library
- **Android:** Directly launches rear camera (environment) or front camera (user)
- **Desktop:** Ignores `capture` attribute, shows file picker

### Pattern 4: Real-Time Completion Broadcast
**What:** Emit Socket.IO event when task completion data is updated
**When to use:** Any task state change that managers should see immediately
**Example:**
```javascript
// Source: Phase 1 implementation in server/routes/taskConfirmation.js
// After saving completion data
const updatedTask = db.prepare(`
  SELECT t.*, s.name as system_name, e.name as employee_name
  FROM tasks t
  LEFT JOIN systems s ON t.system_id = s.id
  LEFT JOIN employees e ON t.employee_id = e.id
  WHERE t.id = ?
`).get(taskId);

if (io) {
  io.emit('task:updated', { task: updatedTask });
}
```

### Pattern 5: Image Preview Modal (Lightbox)
**What:** Display uploaded images in expandable modal overlay
**When to use:** Showing task images in admin interface
**Example:**
```javascript
// Source: https://www.w3schools.com/howto/howto_js_lightbox.asp
// Simple vanilla JS lightbox
function openLightbox(imageSrc) {
  const modal = document.createElement('div');
  modal.className = 'lightbox-modal';
  modal.innerHTML = `
    <div class="lightbox-overlay" onclick="this.parentElement.remove()">
      <img src="${imageSrc}" class="lightbox-image">
    </div>
  `;
  document.body.appendChild(modal);
}
```

### Anti-Patterns to Avoid
- **Using original user filenames:** Path traversal vulnerability. Always generate unique names server-side.
- **Storing images as BLOBs in SQLite:** Bloats database. Store file paths instead.
- **Setting Content-Type header with FormData:** Breaks multipart boundary. Let browser set it.
- **No file size limits:** DoS vulnerability. Always set `limits.fileSize` in multer.
- **Accepting all file types:** Security risk. Validate MIME types in `fileFilter`.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multipart form parsing | Custom stream parser | multer 2.0.2 | File uploads have edge cases (chunk boundaries, multiple files, encoding). Multer handles all of them. |
| Unique filename generation | Timestamp-based names | crypto.randomBytes(16) | Timestamps have collisions with concurrent uploads. Crypto is collision-resistant. |
| File type validation | Check extension only | multer fileFilter with MIME check | Extensions can be spoofed. MIME type + magic number validation needed. |
| Image preview modal | Custom overlay | basicLightbox or vanilla pattern | Lightbox patterns handle keyboard nav, touch gestures, escape key. Non-trivial to do right. |
| File path storage | Relative paths | Absolute paths with path.join() | Relative paths break when CWD changes. Always use absolute or normalized paths. |

**Key insight:** File uploads have security implications (path traversal, DoS, malware) that are easy to miss. Using battle-tested libraries like multer prevents entire classes of vulnerabilities.

## Common Pitfalls

### Pitfall 1: User-Controlled Filenames
**What goes wrong:** Using `file.originalname` directly allows path traversal attacks like `../../etc/passwd.jpg`
**Why it happens:** Original filename comes from client and is not sanitized
**How to avoid:** Always generate filenames server-side with `crypto.randomBytes()` or UUIDs
**Warning signs:** Error logs showing files saved in unexpected directories
**Source:** [Weak Multer File Name Manipulation](https://www.nodejs-security.com/learn/secure-file-handling/weak-multer-file-name-manipulation)

### Pitfall 2: Missing Content-Type Boundary
**What goes wrong:** File upload returns 400 "Unexpected field" or multer can't parse the request
**Why it happens:** Manually setting `Content-Type: multipart/form-data` without boundary parameter
**How to avoid:** Never set Content-Type header when using FormData - let browser do it
**Warning signs:** FormData uploads fail but Postman works
**Source:** [Fix FormData multipart fetch](https://thevalleyofcode.com/fix-formdata-multipart-fetch/)

### Pitfall 3: SQLite BLOB Performance
**What goes wrong:** Database grows large, backups fail, queries slow down
**Why it happens:** Storing images as BLOBs instead of file paths
**How to avoid:** Store file paths in TEXT columns, files in `/uploads` directory
**Warning signs:** Database file size growing disproportionately to number of records
**Source:** [SQLite BLOB vs TEXT best practices](https://dev.to/rijultp/text-vs-blob-in-sqlite-best-practices-for-base64-storage-2ef4)

### Pitfall 4: No File Size Limits
**What goes wrong:** Server runs out of disk space or memory from large uploads
**Why it happens:** Not configuring multer `limits.fileSize`
**How to avoid:** Set reasonable size limit (5MB for images) in multer config
**Warning signs:** Server crashes or disk alerts with file uploads active
**Source:** [Multer file upload best practices](https://betterstack.com/community/guides/scaling-nodejs/multer-in-nodejs/)

### Pitfall 5: Mobile Capture Attribute Confusion
**What goes wrong:** Desktop browsers show unexpected behavior, or mobile doesn't launch camera
**Why it happens:** `capture` attribute behavior differs across platforms
**How to avoid:** Use `capture="environment"` for rear camera, test on actual devices
**Warning signs:** iOS shows camera choice, Android directly launches camera (this is expected)
**Source:** [Mobile camera capture attribute](https://funwithforms.com/posts/capture-attribute/)

### Pitfall 6: Real-Time Updates Missing for Completion
**What goes wrong:** Manager doesn't see new images/notes until page refresh
**Why it happens:** Forgot to emit Socket.IO event after saving completion data
**How to avoid:** Always emit `task:updated` after database writes, include full task object
**Warning signs:** WebSocket events working for create/delete but not for completion updates
**Source:** Phase 1 implementation pattern

## Code Examples

Verified patterns from official sources:

### Complete Multer Route Example
```javascript
// Source: https://betterstack.com/community/guides/scaling-nodejs/multer-in-nodejs/
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  }
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images allowed'));
    }
  }
});

// Route: Upload image and note for task completion
router.post('/:token/complete', upload.single('image'), (req, res) => {
  try {
    const { token } = req.params;
    const { taskId, note } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    // Save to database
    db.prepare(`
      INSERT INTO task_attachments (task_id, file_path, file_type)
      VALUES (?, ?, 'image')
    `).run(taskId, imagePath);

    if (note) {
      db.prepare(`
        UPDATE tasks SET completion_note = ? WHERE id = ?
      `).run(note, taskId);
    }

    // Broadcast real-time update
    const updatedTask = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.id = ?
    `).get(taskId);

    if (io) {
      io.emit('task:updated', { task: updatedTask });
    }

    res.json({ success: true, imagePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Static HTML File Upload Form
```html
<!-- Source: https://www.freecodecamp.org/news/upload-files-with-javascript/ -->
<form id="completionForm">
  <label>הוסף תמונה:</label>
  <input type="file"
         accept="image/*"
         capture="environment"
         id="imageInput">

  <label>הערות:</label>
  <textarea id="noteInput" rows="3"></textarea>

  <button type="submit">שלח</button>
</form>

<script>
document.getElementById('completionForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData();
  const imageFile = document.getElementById('imageInput').files[0];
  const note = document.getElementById('noteInput').value;

  if (imageFile) {
    formData.append('image', imageFile);
  }
  formData.append('note', note);
  formData.append('taskId', TASK_ID); // From embedded config

  try {
    const response = await fetch(`${API_URL}/api/confirm/${TOKEN}/complete`, {
      method: 'POST',
      body: formData
      // CRITICAL: Do NOT set Content-Type header
    });

    const result = await response.json();
    if (result.success) {
      alert('המשימה עודכנה בהצלחה!');
    }
  } catch (error) {
    alert('שגיאה בשליחת הנתונים');
  }
});
</script>
```

### React Image Display with Modal
```jsx
// Source: Pattern adapted from https://www.w3schools.com/howto/howto_js_lightbox.asp
function TaskImages({ images }) {
  const [lightboxImage, setLightboxImage] = useState(null);

  return (
    <div className="task-images">
      {images.map((img, idx) => (
        <img
          key={idx}
          src={img.file_path}
          alt="Task completion"
          className="thumbnail"
          onClick={() => setLightboxImage(img.file_path)}
        />
      ))}

      {lightboxImage && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxImage(null)}
        >
          <img src={lightboxImage} className="lightbox-image" />
        </div>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Body-parser for files | multer middleware | 2014 | Body-parser can't handle multipart/form-data. Multer is now standard. |
| Timestamp filenames | Crypto random bytes | 2020+ | Security best practice to prevent collisions and path traversal |
| Extension-only validation | MIME type + magic number | 2023+ | Extension spoofing attacks led to multi-layer validation |
| FormData with manual headers | FormData without headers | 2018+ | Browsers handle multipart boundary automatically |
| BLOB storage in SQLite | File paths in TEXT | Ongoing | Performance and backup considerations favor file system storage |

**Deprecated/outdated:**
- `express-fileupload`: Less maintained than multer, fewer features
- `formidable`: Still works but multer has better Express integration
- Setting `Content-Type` manually with FormData: Breaks in modern browsers

## Open Questions

Things that couldn't be fully resolved:

1. **Multiple image uploads per task**
   - What we know: Multer supports `upload.array('images', 5)` for multiple files
   - What's unclear: UI/UX for adding multiple images from mobile (multiple file inputs vs single input with multiple selection)
   - Recommendation: Start with single image per completion, can extend to multiple in future phase

2. **Image compression before upload**
   - What we know: Libraries like `browser-image-compression` can compress client-side
   - What's unclear: Whether 5MB limit is sufficient or if compression needed for mobile networks
   - Recommendation: Implement basic upload first, add compression if bandwidth becomes issue

3. **Progress indicators for uploads**
   - What we know: Socket.IO can broadcast upload progress, multer supports progress events
   - What's unclear: Whether progress bar needed for typical image sizes (1-3MB)
   - Recommendation: Skip progress bar initially - images upload quickly on modern connections

4. **Image preview before upload**
   - What we know: FileReader API can show preview before submitting
   - What's unclear: Whether preview adds value in simple completion flow
   - Recommendation: Show preview in form after file selection to confirm image before upload

## Sources

### Primary (HIGH confidence)
- [Multer in Node.js - Better Stack](https://betterstack.com/community/guides/scaling-nodejs/multer-in-nodejs/)
- [Express Multer Middleware - Official Docs](https://expressjs.com/en/resources/middleware/multer.html)
- [Using FormData Objects - MDN](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects)
- [Uploading files using fetch and FormData](https://muffinman.io/blog/uploading-files-using-fetch-multipart-form-data/)
- [Capturing images from user - web.dev](https://web.dev/media-capturing-images/)
- [The capture attribute - Fun with Forms](https://funwithforms.com/posts/capture-attribute/)

### Secondary (MEDIUM confidence)
- [Weak Multer File Name Manipulation - Node.js Security](https://www.nodejs-security.com/learn/secure-file-handling/weak-multer-file-name-manipulation)
- [SQLite TEXT vs BLOB for Base64 Storage - DEV](https://dev.to/rijultp/text-vs-blob-in-sqlite-best-practices-for-base64-storage-2ef4)
- [Secure File Upload with Multer - Transloadit](https://transloadit.com/devtips/secure-image-upload-api-with-node-js-express-and-multer/)
- [How to Sanitize Filenames - Medium](https://medium.com/@ferran_verdes/how-to-sanitize-a-filename-7baa8ae0cfa6)
- [Database Attachments Schema - Microsoft](https://support.microsoft.com/en-us/office/attach-files-and-graphics-to-the-records-in-your-database-d40a09ad-a753-4a14-9161-7f15baad6dbd)

### Tertiary (LOW confidence - general guidance)
- [10 Best Lightbox Plugins 2026 - jQuery Script](https://www.jqueryscript.net/blog/best-lightbox-gallery.html)
- [Socket.IO File Upload Progress - FOSSASIA Blog](https://blog.fossasia.org/file-upload-progress-in-a-node-app-using-socket-io/)
- [browser-image-compression - npm](https://www.npmjs.com/package/browser-image-compression)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Multer is de facto standard, already installed in project
- Architecture: HIGH - Patterns verified from official docs and established projects
- Pitfalls: HIGH - Based on real security advisories and common mistakes documented

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (30 days - stable domain with established patterns)
