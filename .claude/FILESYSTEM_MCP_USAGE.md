# Filesystem MCP - מדריך שימוש

## מה זה Filesystem MCP?
Filesystem MCP נותן גישה מתקדמת לפעולות קבצים ותיקיות - כולל חיפוש, העתקה, העברה, ומטא-דאטה.

## תיקיות עם גישה:
✅ **Project Root**: `c:/dev/projects/claude projects/eden claude`
✅ **Uploads**: `c:/dev/projects/claude projects/eden claude/uploads` (2.2MB, 8 קבצי תמונות)
✅ **WhatsApp Auth**: `c:/dev/projects/claude projects/eden claude/.wwebjs_auth` (130MB, session data)

## פעולות זמינות:

### 1. בדיקת קבצים
```
"כמה תמונות יש ב-uploads directory?"
"מה הגודל של WhatsApp session?"
"האם יש session פעיל ב-.wwebjs_auth?"
```

### 2. מטא-דאטה
```
"מתי נוצר הקובץ האחרון ב-uploads?"
"מה התאריך של WhatsApp session-eden-whatsapp?"
"רשימת כל הקבצים שגדולים מ-500KB"
```

### 3. ניהול קבצים
```
"מחק תמונות ישנות מ-uploads (יותר מחודש)"
"העתק את maintenance.db לגיבוי"
"העבר קבצים ישנים לארכיון"
```

### 4. חיפוש מתקדם
```
"חפש קבצי .png ב-uploads שנוצרו השבוע"
"מצא את הקובץ הכי גדול בפרויקט"
"רשימת כל הקבצי .js בתיקיית server"
```

## יתרונות לפרויקט Eden:

### WhatsApp Session Management
✅ בדיקה אם session קיים לפני reconnect
✅ ניטור גודל session (130MB כרגע)
✅ מחיקת sessions ישנים

### Uploads Management
✅ ניקוי תמונות ישנות
✅ בדיקת גודל storage
✅ מציאת duplicates

### Backup & Maintenance
✅ גיבוי של maintenance.db
✅ ארכיון logs ישנים
✅ ניקוי קבצי temp

## אבטחה:
🔒 גישה **רק** לתיקיות שהוגדרו
🔒 לא יכול לגשת לתיקיות אחרות במערכת
🔒 מריץ עם ההרשאות שלך (user permissions)

---
**הותקן:** 2026-01-26
**Package:** @modelcontextprotocol/server-filesystem
**Directories:** 3 (project root, uploads, .wwebjs_auth)
