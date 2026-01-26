# 🎯 MCP Servers - סיכום התקנה

**תאריך התקנה:** 2026-01-26
**פרויקט:** Eden Maintenance System

---

## ✅ שלושת ה-MCP Servers שהותקנו:

### 1️⃣ **SQLite MCP**
**מטרה:** גישה ישירה למסד הנתונים

- **Package:** `mcp-sqlite`
- **Database:** `maintenance.db`
- **יכולות:**
  - ✅ Query ישיר על tasks, employees, systems
  - ✅ בדיקת schema וטבלאות
  - ✅ ניתוח נתונים מהיר
  - ✅ תכנון migrations

**דוגמה לשימוש:**
```
"תראה לי את כל המשימות שיש להן is_starred = true"
"מה מבנה הטבלה tasks?"
"כמה משימות pending יש במערכת?"
```

**סטטיסטיקות נוכחיות:**
- 27 משימות
- 7 עובדים
- 7 מערכות

---

### 2️⃣ **Context7 MCP**
**מטרה:** דוקומנטציה עדכנית של הספריות

- **Package:** `@upstash/context7-mcp`
- **Mode:** Local (stdio, no API key)
- **יכולות:**
  - ✅ דוקומנטציה רשמית ועדכנית
  - ✅ תמיכה בגרסאות ספציפיות
  - ✅ דוגמאות קוד עובדות

**ספריות רלוונטיות לפרויקט:**
- `whatsapp-web.js` v1.34.4
- `socket.io` v4.8.3
- `express` v5.2.1
- `better-sqlite3` v12.6.0
- `puppeteer-core` v24.36.0

**דוגמה לשימוש:**
```
"איך לטפל ב-QR code timeout ב-whatsapp-web.js? use context7"
"מה ה-API של Socket.IO reconnection? use context7"
"איך עובד LocalAuth? use context7"
```

**⚠️ חשוב:** הוסף **"use context7"** בסוף הבקשה!

---

### 3️⃣ **Filesystem MCP**
**מטרה:** ניהול מתקדם של קבצים

- **Package:** `@modelcontextprotocol/server-filesystem`
- **Allowed Directories:**
  - 📁 Project Root
  - 📁 `uploads/` (2.2MB, 8 תמונות)
  - 📁 `.wwebjs_auth/` (130MB, WhatsApp session)

- **יכולות:**
  - ✅ חיפוש קבצים מתקדם
  - ✅ מטא-דאטה (size, timestamps, permissions)
  - ✅ העתקה/העברה/מחיקה
  - ✅ ניטור storage

**דוגמה לשימוש:**
```
"כמה תמונות יש ב-uploads?"
"האם יש WhatsApp session פעיל?"
"מחק תמונות ישנות יותר מחודש"
"מה הגודל הכולל של .wwebjs_auth?"
```

---

## 🚀 איך להתחיל להשתמש?

### Option 1: הפעלה מחדש של Claude Code
```bash
# סגור את Claude Code ופתח מחדש
# ה-MCP servers ייטענו אוטומטית
```

### Option 2: התחלת סשן חדש
```bash
# פשוט פתח conversation חדש בפרויקט
# ה-MCP servers יהיו זמינים
```

---

## 📊 Comparison Table

| Feature | SQLite | Context7 | Filesystem |
|---------|--------|----------|------------|
| **גישה לDB** | ✅ | ❌ | ❌ |
| **דוקומנטציה** | ❌ | ✅ | ❌ |
| **ניהול קבצים** | ❌ | ❌ | ✅ |
| **Real-time data** | ✅ | ✅ | ✅ |
| **Security** | Read-only DB | Rate limited | Directory restricted |

---

## 🔧 Configuration Location

```
~/.claude.json
→ projects["C:/dev/projects/claude projects/eden claude"]
  → mcpServers
    → sqlite
    → context7
    → filesystem
```

---

## 📚 למידע נוסף

- **SQLite MCP:** ראה `.claude/SQLITE_MCP_USAGE.md` (לא נוצר)
- **Context7 MCP:** ראה `.claude/CONTEXT7_USAGE.md`
- **Filesystem MCP:** ראה `.claude/FILESYSTEM_MCP_USAGE.md`

---

## ✨ סיכום

עכשיו יש לך:
1. 💾 **גישה ישירה למסד הנתונים** - לא צריך לכתוב Node.js code
2. 📚 **דוקומנטציה תמיד עדכנית** - לא יותר הלוצינציות
3. 📁 **ניהול קבצים מתקדם** - WhatsApp session, uploads, backups

**🎉 כל המערכת מוכנה לשימוש בסשן הבא!**

---

**Sources:**
- [SQLite MCP by jparkerweb](https://github.com/jparkerweb/mcp-sqlite)
- [Context7 by Upstash](https://github.com/upstash/context7)
- [Filesystem MCP by Anthropic](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
