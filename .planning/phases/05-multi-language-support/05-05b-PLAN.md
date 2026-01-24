---
phase: 05-multi-language-support
plan: 05b
type: execute
wave: 4
depends_on: [05-05a]
files_modified:
  - client/src/components/TaskCard.jsx
  - client/src/components/HistoryTable.jsx
autonomous: true

must_haves:
  truths:
    - "Manager sees translation indicator showing original language"
    - "Translation indicators visible in both task list and history views"
    - "No indicators shown for Hebrew notes (original_language is NULL or 'he')"
  artifacts:
    - path: "client/src/components/TaskCard.jsx"
      provides: "Display translated note with language indicator"
      contains: "🇬🇧|🇷🇺|🇸🇦|original_language"
    - path: "client/src/components/HistoryTable.jsx"
      provides: "Display translation indicators in history table"
      contains: "original_language"
  key_links:
    - from: "client/src/components/TaskCard.jsx"
      to: "tasks.original_language"
      via: "Display flag emoji based on original_language field"
      pattern: "task\\.original_language"
---

<objective>
Display translation indicators in manager UI for translated employee notes.

Purpose: Show managers which notes were automatically translated from other languages. Clear visual indicators (flag emojis + "מתורגם מ...") help managers understand that they're reading translations, not original Hebrew. This is especially important for context and communication quality.

Output: Manager UI displays translation indicators in task cards and history table. Only shown for notes that were translated (original_language is not NULL or 'he').
</objective>

<execution_context>
@c:\dev\projects\claude projects\eden claude\.claude\get-shit-done\workflows\execute-plan.md
@c:\dev\projects\claude projects\eden claude\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@c:\dev\projects\claude projects\eden claude\.planning\PROJECT.md
@c:\dev\projects\claude projects\eden claude\.planning\ROADMAP.md
@c:\dev\projects\claude projects\eden claude\.planning\STATE.md
@c:\dev\projects\claude projects\eden claude\.planning\phases\05-multi-language-support\05-RESEARCH.md

# Dependencies
@c:\dev\projects\claude projects\eden claude\.planning\phases\05-multi-language-support\05-05a-PLAN.md

# Current implementation
@c:\dev\projects\claude projects\eden claude\client\src\components\TaskCard.jsx
@c:\dev\projects\claude projects\eden claude\client\src\components\HistoryTable.jsx
</context>

<tasks>

<task type="auto">
  <name>Display translation indicators in manager UI</name>
  <files>
    client/src/components/TaskCard.jsx
    client/src/components/HistoryTable.jsx
  </files>
  <action>
Add visual indicators showing when a note has been translated from another language.

**In TaskCard.jsx (main task list):**

Find where completion_note is displayed (likely in task detail view or expanded card), and wrap with translation indicator:

```jsx
{task.completion_note && (
  <div className="mt-2">
    {task.original_language && task.original_language !== 'he' && (
      <div className="mb-1 text-xs text-gray-500 flex items-center gap-1">
        {task.original_language === 'en' && '🇬🇧'}
        {task.original_language === 'ru' && '🇷🇺'}
        {task.original_language === 'ar' && '🇸🇦'}
        <span>
          מתורגם מ{task.original_language === 'en' ? 'אנגלית' : task.original_language === 'ru' ? 'רוסית' : 'ערבית'}
        </span>
      </div>
    )}
    <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
      {task.completion_note}
    </div>
  </div>
)}
```

**In HistoryTable.jsx (history page):**

Add similar translation indicator in the notes column or detail view:

```jsx
{task.completion_note && (
  <div className="text-sm">
    {task.original_language && task.original_language !== 'he' && (
      <span className="text-xs text-gray-500 mr-1">
        {task.original_language === 'en' && '🇬🇧'}
        {task.original_language === 'ru' && '🇷🇺'}
        {task.original_language === 'ar' && '🇸🇦'}
      </span>
    )}
    {task.completion_note}
  </div>
)}
```

**Styling:**
- Flag emoji for visual recognition
- Small gray text "מתורגם מ..." above note
- Original note content in regular styling
- No indicator if original_language is NULL or 'he' (Hebrew notes)

**Alternative if task doesn't expose completion_note in list view:**
Only show in task detail modal/expanded view. Ensure TaskCard receives original_language field from API (should already be included in task object from JOIN queries).
  </action>
  <verify>
Visual verification in manager UI:

1. **Open manager dashboard**
2. **Find task completed by English employee with note**
   - Should see 🇬🇧 flag emoji
   - Should see "מתורגם מאנגלית" above note
   - Note text in Hebrew

3. **Find task completed by Russian employee with note**
   - Should see 🇷🇺 flag emoji
   - Should see "מתורגם מרוסית" above note

4. **Find task completed by Hebrew employee with note**
   - Should NOT see flag emoji or translation indicator
   - Just the note text

5. **Open history page**
   - Filter tasks with notes
   - Verify translation indicators appear consistently
   - Flag emojis render correctly (not as boxes/missing characters)

6. **Responsive check:**
   - View on mobile viewport
   - Indicators should not break layout
   - Flag emojis visible on small screens
  </verify>
  <done>Manager UI displays translation indicators (flag emoji + "מתורגם מ...") for translated notes, no indicator for Hebrew notes, indicators visible in both TaskCard and HistoryTable components.</done>
</task>

</tasks>

<verification>
End-to-end UI verification:

1. **Create test employees:**
   - Hebrew employee (language='he')
   - English employee (language='en')
   - Russian employee (language='ru')

2. **Complete tasks with notes:**
   - Hebrew: "תוקן בהצלחה"
   - English: "Fixed successfully"
   - Russian: "Исправлено успешно"

3. **Manager view verification:**
   - Hebrew note: No indicator, original text
   - English note: 🇬🇧 indicator, Hebrew translation
   - Russian note: 🇷🇺 indicator, Hebrew translation

4. **UI consistency:**
   - Check TaskCard (main dashboard)
   - Check HistoryTable (history page)
   - Both should show same indicators

5. **Visual quality:**
   - Flag emojis render properly
   - Text alignment correct
   - Spacing consistent
   - No layout breaks on mobile

6. **Edge cases:**
   - Note with [שגיאת תרגום] prefix shows error indicator
   - Very long translated notes don't break layout
   - Multiple notes in view don't cause performance issues
</verification>

<success_criteria>
1. TaskCard displays translation indicators above completion_note
2. HistoryTable displays translation indicators in notes column
3. Flag emojis (🇬🇧, 🇷🇺, 🇸🇦) render correctly
4. Hebrew text "מתורגם מ..." appears for translated notes
5. No indicators shown for Hebrew notes (original_language NULL or 'he')
6. Indicators visible in both desktop and mobile views
7. Layout not broken by translation indicators
8. Consistent styling across components
</success_criteria>

<output>
After completion, create `.planning/phases/05-multi-language-support/05-05b-SUMMARY.md`

Document:
- UI indicator implementation (flag emojis, "מתורגם מ..." text)
- Components updated (TaskCard, HistoryTable)
- Styling approach (small gray text, flag emojis)
- Example screenshots or descriptions
- Complete translation feature summary (from 05a + 05b)
- Next steps: Monitor translation usage, consider caching if costs increase
</output>
