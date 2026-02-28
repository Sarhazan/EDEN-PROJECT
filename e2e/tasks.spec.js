const { test, expect } = require('@playwright/test');
const { fastLogin } = require('./helpers/auth');

// Unique task title for this test run
const TASK_TITLE = `בדיקה E2E ${Date.now()}`;
const TASK_TITLE_UPDATED = `${TASK_TITLE} — עודכן`;

test.describe('Tasks — CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await fastLogin(page);
  });

  test('new task button opens modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The sidebar shows "משימה חדשה" button when on the root or /tasks
    const addTaskBtn = page.locator('button', { hasText: /משימה חדשה/i });
    await expect(addTaskBtn).toBeVisible({ timeout: 8000 });

    await addTaskBtn.click();

    // The quick task modal should appear with the title input
    const titleInput = page.locator('input[placeholder*="כותרת"]');
    await expect(titleInput).toBeVisible({ timeout: 8000 });
  });

  test('create a one-time task successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open the task creation modal
    const addTaskBtn = page.locator('button', { hasText: /משימה חדשה/i });
    await expect(addTaskBtn).toBeVisible({ timeout: 8000 });
    await addTaskBtn.click();

    // Fill in the task title
    const titleInput = page.locator('input[placeholder*="כותרת"]');
    await expect(titleInput).toBeVisible({ timeout: 8000 });
    await titleInput.fill(TASK_TITLE);

    // Click the save button (שמור)
    const saveBtn = page.locator('button', { hasText: /שמור/i }).last();
    await saveBtn.click();

    // A success toast should appear
    const toast = page.locator('.Toastify__toast--success, [role="alert"]').first();
    await expect(toast).toBeVisible({ timeout: 10000 });
  });

  test('created task appears in task list', async ({ page }) => {
    // First create a task
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const addTaskBtn = page.locator('button', { hasText: /משימה חדשה/i });
    await addTaskBtn.click();

    const titleInput = page.locator('input[placeholder*="כותרת"]');
    await titleInput.fill(TASK_TITLE);

    const saveBtn = page.locator('button', { hasText: /שמור/i }).last();
    await saveBtn.click();

    // Wait for modal to close
    await expect(titleInput).not.toBeVisible({ timeout: 5000 });

    // Navigate to AllTasksPage
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // The created task should appear in the list
    const taskInList = page.locator('.task-title', { hasText: TASK_TITLE }).first();
    await expect(taskInList).toBeVisible({ timeout: 8000 });
  });

  test('edit task title and verify update', async ({ page }) => {
    // First create a task to edit
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const addTaskBtn = page.locator('button', { hasText: /משימה חדשה/i });
    await addTaskBtn.click();

    const titleInput = page.locator('input[placeholder*="כותרת"]');
    await titleInput.fill(TASK_TITLE);

    const saveBtn = page.locator('button', { hasText: /שמור/i }).last();
    await saveBtn.click();
    await expect(titleInput).not.toBeVisible({ timeout: 5000 });

    // Navigate to all tasks
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Find the task card and expand it
    const taskCard = page.locator('.task-title', { hasText: TASK_TITLE }).first();
    await expect(taskCard).toBeVisible({ timeout: 8000 });

    // Click on the task card row to expand it
    await taskCard.click();

    // Wait for edit button (FaEdit - blue pencil icon)
    const editBtn = page.locator('button[title*="עריכה"], button[title*="edit"], button.text-blue-600').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    // The edit modal (TaskForm) should open
    const editTitleInput = page.locator('input[name="title"]').first();
    await expect(editTitleInput).toBeVisible({ timeout: 8000 });

    // Update the title
    await editTitleInput.clear();
    await editTitleInput.fill(TASK_TITLE_UPDATED);

    // Submit the edit form (עדכן משימה)
    const updateBtn = page.locator('button[type="submit"]').last();
    await updateBtn.click();

    // Modal should close
    await expect(editTitleInput).not.toBeVisible({ timeout: 5000 });

    // Verify updated title in task list
    const updatedTask = page.locator('.task-title', { hasText: TASK_TITLE_UPDATED }).first();
    await expect(updatedTask).toBeVisible({ timeout: 8000 });
  });

  test('delete task and verify it disappears', async ({ page }) => {
    // Create a task to delete
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const deleteTaskTitle = `למחיקה ${Date.now()}`;

    const addTaskBtn = page.locator('button', { hasText: /משימה חדשה/i });
    await addTaskBtn.click();

    const titleInput = page.locator('input[placeholder*="כותרת"]');
    await titleInput.fill(deleteTaskTitle);

    const saveBtn = page.locator('button', { hasText: /שמור/i }).last();
    await saveBtn.click();
    await expect(titleInput).not.toBeVisible({ timeout: 5000 });

    // Navigate to all tasks
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Find the task
    const taskTitle = page.locator('.task-title', { hasText: deleteTaskTitle }).first();
    await expect(taskTitle).toBeVisible({ timeout: 8000 });

    // Expand the card
    await taskTitle.click();

    // Wait for delete button (FaTrash - red icon)
    const deleteBtn = page.locator('button.text-rose-600, button[title*="מחק"]').first();
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });

    // Handle the browser confirm dialog
    page.once('dialog', (dialog) => dialog.accept());
    await deleteBtn.click();

    // Task should disappear from the list
    await expect(taskTitle).not.toBeVisible({ timeout: 8000 });
  });
});
