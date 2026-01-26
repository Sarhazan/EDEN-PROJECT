---
status: verifying
trigger: "Investigate issue: whatsapp-messages-not-sending"
created: 2026-01-26T00:00:00Z
updated: 2026-01-26T00:20:00Z
---

## Current Focus

hypothesis: CONFIRMED ROOT CAUSE - The bulk send updates task statuses AFTER the send-bulk API call succeeds, but the backend bulk send endpoint (/whatsapp/send-bulk) sends messages via WhatsApp AND THEN updates task status in the database with sent_at timestamp. However, the frontend ALSO tries to update all task statuses to 'sent' after the bulk send. This creates a situation where the frontend is updating tasks that were already updated by the backend, potentially causing race conditions or overwriting the sent_at timestamp.
test: Check backend send-bulk route to see if it updates task statuses and sent_at
expecting: Will find that backend already handles status updates, making frontend updates redundant or conflicting
next_action: Review server/routes/whatsapp.js send-bulk endpoint

## Symptoms

expected: When creating a task and clicking "שלח הודעה", the message should be sent via WhatsApp and show "נשלח בהצלחה" with a checkmark
actual: Tasks show "ללא WhatsApp" status (gray text) and messages are not sent. The "שלח הודעה" button appears but clicking it doesn't send messages.
errors: No visible error messages in the UI. Screenshot shows 3 tasks all with "ללא WhatsApp" status.
reproduction:
1. WhatsApp is connected successfully (just verified QR scan works)
2. Navigate to main tasks page (localhost:5174)
3. Look at tasks - they all show "ללא WhatsApp" instead of sent status
4. Click "שלח הודعה" button - messages don't send

started: Issue discovered after WhatsApp integration was completed and verified working. WhatsApp connection itself works (QR scan successful), but message sending does not work.

## Eliminated

## Evidence

- timestamp: 2026-01-26T00:05:00Z
  checked: server/routes/whatsapp.js
  found: Two endpoints exist - POST /whatsapp/send for single messages and POST /whatsapp/send-bulk for bulk sending. Both check WhatsApp isReady status and call whatsappService.sendMessage()
  implication: Backend endpoints are properly set up for message sending

- timestamp: 2026-01-26T00:06:00Z
  checked: server/services/whatsapp.js
  found: WhatsAppService has sendMessage() method that formats phone numbers and sends via client.sendMessage(). Service tracks isReady state.
  implication: Core WhatsApp sending logic exists and is functional

- timestamp: 2026-01-26T00:07:00Z
  checked: client/src/pages/AllTasksPage.jsx
  found: AllTasksPage renders TaskCard components. No "ללא WhatsApp" text found. Uses standard TaskCard component.
  implication: The "ללא WhatsApp" text is NOT coming from AllTasksPage

- timestamp: 2026-01-26T00:08:00Z
  checked: client/src/components/shared/TaskCard.jsx
  found: TaskCard has handleSendTask() function that calls POST /whatsapp/send endpoint. Shows "נשלח" status with checkmark when task.sent_at exists and status is 'sent' or 'received'. No "ללא WhatsApp" text found in this component.
  implication: TaskCard can send messages and displays sent status correctly. The "ללא WhatsApp" must be coming from a different page/component

- timestamp: 2026-01-26T00:09:00Z
  checked: server/database/schema.js
  found: Tasks table has sent_at and acknowledged_at timestamp columns. Status field can be 'draft', 'sent', 'received', 'in_progress', 'pending_approval', 'completed'
  implication: Database schema supports WhatsApp message tracking via sent_at field

- timestamp: 2026-01-26T00:10:00Z
  checked: client/src/pages/MyDayPage.jsx lines 101-188 (handleSendAllTasks)
  found: |
    - Function filters tasks to send (status === 'draft', has employee_id, time hasn't passed)
    - Builds tasksByEmployee object and calls POST /whatsapp/send-bulk endpoint
    - Lines 177-180: AFTER successful send, loops through taskIds and calls updateTaskStatus(taskId, 'sent') for each task
    - This should mark all tasks as sent
  implication: The bulk send DOES attempt to update task statuses after sending. If tasks still show as draft, either the bulk send is failing or the status update is failing

- timestamp: 2026-01-26T00:11:00Z
  checked: client/src/components/shared/TaskCard.jsx lines 90-126 (handleSendTask)
  found: |
    - Single task send function
    - Calls POST /whatsapp/send endpoint
    - Line 118: After successful send, calls updateTaskStatus(task.id, 'sent')
    - This marks individual tasks as sent
  implication: Individual task sending also updates status. Both bulk and single send should work.

- timestamp: 2026-01-26T00:12:00Z
  checked: client/src/components/shared/TaskCard.jsx lines 221-248 (WhatsApp status display)
  found: |
    - Lines 221-248: Shows "נשלח" (sent) checkmark when task.sent_at exists AND (task.status === 'sent' OR task.status === 'received')
    - Lines 260-269: Shows send button when task.status === 'draft' AND task.employee_id exists AND task is in future
    - Lines 297-300: Shows status badge (including "חדש" for draft) when status is NOT 'sent' or 'received'
  implication: User is likely seeing "חדש" (draft) status badge, not literal "ללא WhatsApp" text. Tasks are remaining in draft status instead of being marked as sent.

## Resolution

root_cause: Port mismatch between frontend and backend. The server runs on port 3002 (server/index.js line 22), and AppContext.jsx correctly uses 'http://localhost:3002/api'. However, multiple other frontend files have hardcoded API_URL fallbacks to 'http://localhost:3001', including:
- client/src/pages/MyDayPage.jsx (line 13) - Used for bulk send
- client/src/components/shared/TaskCard.jsx (line 7) - Used for individual task sending
- client/src/pages/SettingsPage.jsx (line 6) - Used for WhatsApp connection

When users try to send WhatsApp messages via MyDayPage (bulk send) or TaskCard (individual send), the API calls go to localhost:3001 where no server is running, causing network errors. The requests fail, tasks remain in draft status, and no messages are sent. The Settings page appears to work because it's checking status via a different mechanism or the error is handled differently.

fix: Update all frontend files to use the correct port (3002) in their API_URL fallback:
1. client/src/pages/MyDayPage.jsx line 13: Change from 'http://localhost:3001' to 'http://localhost:3002/api'
2. client/src/components/shared/TaskCard.jsx line 7: Change from 'http://localhost:3001' to 'http://localhost:3002/api'
3. client/src/pages/SettingsPage.jsx line 6: Change from 'http://localhost:3001' to 'http://localhost:3002/api'
4. client/src/pages/HistoryPage.jsx line 7: Change from 'http://localhost:3001' to 'http://localhost:3002/api'
5. client/src/pages/LocationsPage.jsx line 7: Change from 'http://localhost:3001' to 'http://localhost:3002/api'
6. client/src/pages/TaskConfirmationPage.jsx line 6: Change from 'http://localhost:3001' to 'http://localhost:3002/api'
7. client/src/components/history/HistoryTable.jsx line 17: Change from 'http://localhost:3001' to 'http://localhost:3002/api'
8. client/src/components/forms/LocationForm.jsx line 6: Change from 'http://localhost:3001' to 'http://localhost:3002/api'

verification: |
  Applied fixes to 8 frontend files to correct port mismatch from 3001 to 3002/api.

  To verify the fix works:
  1. Restart the Vite dev server to pick up the changes (if using hot reload, it should update automatically)
  2. Navigate to My Day page (http://localhost:5174)
  3. Ensure WhatsApp is connected (check Settings page if needed)
  4. Find a draft task with an assigned employee
  5. Click "שלח כל המשימות" button (bulk send)
  6. Expected: Success message appears, tasks update to "sent" status with green checkmark
  7. Test individual task send by clicking the paper plane icon on a draft task
  8. Expected: Task sends and shows "נשלח" status with timestamp

  The fix corrects the API endpoint URLs so frontend requests now reach the actual server on port 3002.

files_changed:
  - c:/dev/projects/claude projects/eden claude/client/src/pages/MyDayPage.jsx
  - c:/dev/projects/claude projects/eden claude/client/src/components/shared/TaskCard.jsx
  - c:/dev/projects/claude projects/eden claude/client/src/pages/SettingsPage.jsx
  - c:/dev/projects/claude projects/eden claude/client/src/pages/HistoryPage.jsx
  - c:/dev/projects/claude projects/eden claude/client/src/pages/LocationsPage.jsx
  - c:/dev/projects/claude projects/eden claude/client/src/pages/TaskConfirmationPage.jsx
  - c:/dev/projects/claude projects/eden claude/client/src/components/history/HistoryTable.jsx
  - c:/dev/projects/claude projects/eden claude/client/src/components/forms/LocationForm.jsx
