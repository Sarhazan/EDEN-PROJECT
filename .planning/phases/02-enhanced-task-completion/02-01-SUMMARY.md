---
phase: 02-enhanced-task-completion
plan: 01
title: Backend Image Upload & Notes Infrastructure
subsystem: backend-api
type: infrastructure
status: complete
completed: 2026-01-20
duration: 3min 33sec

requires:
  - 01-01-PLAN.md # Socket.IO server infrastructure for real-time broadcasts
  - 01-02-PLAN.md # Client WebSocket connection for receiving updates

provides:
  - task_attachments database table for storing image paths
  - completion_note column in tasks table for worker notes
  - POST /api/confirm/:token/complete endpoint with multer file upload
  - Secure file storage with crypto-based unique filenames
  - Real-time broadcast of task completion with images and notes

affects:
  - 02-02-PLAN.md # Client UI will consume this upload endpoint
  - 02-03-PLAN.md # Manager view will display uploaded images and notes

tech-stack:
  added:
    - multer@2.0.2 # File upload middleware for Express
  patterns:
    - crypto.randomBytes for secure filename generation
    - Separate attachments table for scalability (vs JSON columns)
    - File paths in database, files on filesystem (not BLOBs)
    - MIME type validation in multer fileFilter
    - Token-based task ownership validation

key-files:
  created:
    - server/database/schema.js # Added task_attachments table and completion_note column
    - uploads/ # Directory for uploaded images (served as static files)
  modified:
    - server/routes/taskConfirmation.js # Added complete endpoint with multer
    - server/index.js # Fixed static uploads path to project root

decisions:
  - decision: Use separate task_attachments table instead of JSON column
    rationale: Better scalability for multiple images per task, supports foreign keys, easier querying
    impact: Normalized database design, clean schema

  - decision: Store file paths not BLOBs in database
    rationale: Keep database compact, enable filesystem-based backups, better performance for large files
    impact: Images stored in uploads/ directory, paths stored in task_attachments

  - decision: crypto.randomBytes(16) for filenames instead of original names
    rationale: Prevents path traversal attacks, avoids filename collisions, security best practice
    impact: Files stored with hex names like "a3f4b2c1d5e6f7g8.jpg"

  - decision: 5MB file size limit
    rationale: Balance between image quality and server storage/bandwidth
    impact: Mobile photos from workers typically 1-3MB, 5MB allows high-quality images

  - decision: Single image upload (not array) per completion
    rationale: TC-01 specifies "תמונה" (singular), simpler mobile UX for workers
    impact: Workers upload one photo per task completion, can extend to multiple in future

tags:
  - file-upload
  - multer
  - database-schema
  - security
  - image-storage
---

# Phase 02 Plan 01: Backend Image Upload & Notes Infrastructure Summary

**One-liner:** Secure image upload endpoint with multer, task_attachments table, and real-time broadcast for task completion evidence

## What Was Built

Created backend infrastructure for workers to attach photos and notes when completing tasks:

1. **Database Schema:**
   - Added `task_attachments` table with columns: id, task_id, file_path, file_type, uploaded_at
   - Added `completion_note` TEXT column to tasks table
   - Foreign key cascade delete from tasks to attachments
   - CHECK constraint on file_type ('image' or 'note')

2. **File Upload Endpoint:**
   - POST `/api/confirm/:token/complete` with multer middleware
   - Accepts multipart/form-data with fields: taskId, note, image
   - Validates token existence, expiration, and task ownership
   - Multer configuration: 5MB limit, image MIME types only
   - Secure filename generation with crypto.randomBytes(16)
   - Saves image paths to task_attachments, notes to tasks.completion_note
   - Updates task status to 'completed'
   - Broadcasts task:updated event via Socket.IO for real-time manager updates

3. **Security Validations:**
   - Token validation (404 if not found)
   - Expiration check (410 if expired)
   - Task ownership verification (403 if task doesn't belong to token)
   - MIME type filtering (only image/jpeg, image/png, image/jpg)
   - File size limit (5MB max)
   - Original filenames never used (prevents path traversal)

## Implementation Details

### Database Design Choice

Used separate `task_attachments` table instead of JSON column in tasks table:

**Pros:**
- Supports unlimited images per task (future extensibility)
- Foreign key constraints ensure referential integrity
- Easier to query ("show all images for task X")
- Normalized design follows SQL best practices

**Alternative considered:** JSON column in tasks table
- Simpler initially but harder to query and scale
- No foreign key support
- Violates normalization principles

### Multer Configuration

```javascript
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('רק קבצי JPG ו-PNG מותרים'));
    }
  }
});
```

### Real-Time Integration

Endpoint broadcasts task:updated event after completion, maintaining Phase 1 pattern:

```javascript
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

Manager receives immediate notification when worker completes task with photo/note.

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| 817e78b | feat(02-01): add database schema for task attachments and completion notes | server/database/schema.js |
| ac565e9 | feat(02-01): add file upload endpoint with multer for task completion | server/routes/taskConfirmation.js, server/index.js |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed static uploads path inconsistency**

- **Found during:** Task 2 - implementing file upload endpoint
- **Issue:** server/index.js served uploads from `path.join(__dirname, 'uploads')` but route saved files to `path.join(__dirname, '..', 'uploads')`
- **Impact:** Uploaded images would not be accessible via /uploads URL
- **Fix:** Changed index.js static path to `path.join(__dirname, '..', 'uploads')` to match project root location
- **Files modified:** server/index.js
- **Commit:** ac565e9 (included in main commit)
- **Rationale:** Blocking fix - uploads endpoint wouldn't work without path consistency

## Verification Results

**Database Schema:**
```
✅ task_attachments table exists with correct columns
✅ completion_note column exists in tasks table
✅ Foreign key constraint on task_id
✅ CHECK constraint on file_type
```

**Upload Endpoint:**
```
✅ Multer package installed (2.0.2)
✅ Uploads directory exists at project root
✅ POST /api/confirm/:token/complete route configured
✅ Socket.IO instance injected into route
✅ Server starts without errors
```

**Security:**
```
✅ Token validation present (404 on invalid)
✅ Expiration check present (410 on expired)
✅ Task ownership verification (403 on mismatch)
✅ MIME type filtering (only images)
✅ File size limit (5MB)
✅ Secure filename generation (crypto.randomBytes)
```

## Next Phase Readiness

**Ready for 02-02 (Client Upload UI):**
- ✅ Backend endpoint accepts multipart/form-data
- ✅ Supports optional image and note fields
- ✅ Returns success with imagePath in response
- ✅ Broadcasts real-time update to manager

**Ready for 02-03 (Manager View Images):**
- ✅ Image paths stored in task_attachments table
- ✅ Notes stored in tasks.completion_note column
- ✅ Images served via /uploads static route
- ✅ Can query attachments by task_id

**Outstanding items:**
- None - infrastructure complete for Phase 2 client work

## Performance Notes

**Duration:** 3min 33sec (from plan start to SUMMARY.md creation)

**Efficiency factors:**
- Multer already installed in package.json
- Database schema pattern well-established from Phase 1
- Socket.IO injection pattern reused from 01-02
- No authentication gate (local development, no external services)

## Testing Recommendations

For manual testing of upload endpoint:

1. Generate confirmation token via existing flow (send tasks via WhatsApp)
2. Use curl or Postman to test upload:
   ```bash
   curl -X POST "http://localhost:3002/api/confirm/{token}/complete" \
     -F "taskId=1" \
     -F "note=בדיקת העלאת תמונה" \
     -F "image=@test-image.jpg"
   ```
3. Verify response includes `imagePath: "/uploads/{hex}.jpg"`
4. Check uploads/ directory for file
5. Check database: `SELECT * FROM task_attachments;`
6. Verify Socket.IO broadcast in browser console (if client connected)

**Future integration tests should verify:**
- Invalid token rejection
- Expired token rejection
- Wrong task ID rejection
- Non-image file rejection
- Oversized file rejection
- Multiple images per task (when extended)

---

**Phase 02 Progress:** 2/5 requirements satisfied (TC-01 backend complete)
**Next:** 02-02-PLAN.md - Client Upload UI for workers to submit photos and notes
