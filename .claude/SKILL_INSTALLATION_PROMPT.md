# 🚀 Skill Installation Prompt - Ready to Copy

**תאריך יצירה:** 2026-01-26
**מטרה:** התקנת skill אוטומטי לניתוח פרויקט והמלצה על כלים

---

## 📋 **הפרומפט - העתק והדבק בטרמינל הפרויקט:**

```
אני רוצה שתכתוב לי skill חדש בשם "gsd-suggest-tools" שירוץ אוטומטית אחרי brainstorm בפרויקט GSD.

המטרה: אחרי שמסיימים brainstorm על פרויקט, הסקיל ינתח את הפרויקט וימליץ על כלים רלוונטיים (Skills, Agents, MCP Servers).

דרישות הסקיל:

1. **ניתוח אוטומטי של הפרויקט:**
   - סרוק package.json → זהה tech stack (React, Vue, Node, Express, וכו')
   - זהה database (SQLite, PostgreSQL, MongoDB, וכו')
   - זהה API routes (REST endpoints, GraphQL)
   - זהה real-time (Socket.IO, WebSocket)
   - זהה external APIs (בדוק .env, import statements)
   - זהה file storage (uploads/, static files)
   - בדוק אם יש tests
   - זהה deployment platform (Vercel, Render, Railway)

2. **לוגיקת המלצות חכמה:**

   MCP Servers:
   - אם יש SQLite → המלץ על SQLite MCP
   - אם יש PostgreSQL → המלץ על PostgreSQL MCP
   - אם יש MongoDB → המלץ על MongoDB MCP
   - אם יש 2+ external APIs → המלץ על Context7 MCP (לדוקומנטציה)
   - אם יש uploads folder → המלץ על Filesystem MCP

   Agents:
   - אם יש API routes או Socket.IO → המלץ על API Testing Agent
   - אם יש database → המלץ על Database Migration Agent
   - אם יש deployment config → המלץ על Deployment Monitor Agent
   - אם יש tests → המלץ על Test Runner Agent

   Skills:
   - אם frontend framework → המלץ על frontend-design skill
   - אם יש GitHub repo → המלץ על github skill

3. **פורמט פלט אינטראקטיבי:**

   הצג:
   ```
   # 🎯 Recommended Tools for [Project Name]

   Based on analysis:
   - Tech Stack: [list]
   - Database: [type]
   - APIs: [count] endpoints
   - External Services: [list]

   ## Essential Tools (must-have):
   ✅ [Tool 1] - [Reason]
   ✅ [Tool 2] - [Reason]

   ## Recommended Tools (highly useful):
   ⚠️ [Tool 3] - [Reason]
   ⚠️ [Tool 4] - [Reason]

   ## Optional Tools (nice-to-have):
   💡 [Tool 5] - [Reason]

   Would you like me to install these tools?
   ```

4. **התקנה אוטומטית:**

   אם המשתמש אומר כן:
   - התקן כל MCP Server עם claude mcp add
   - צור agents files ב-~/.claude/agents/
   - התקן skills עם claude plugin install
   - בדוק verification לכל כלי
   - צור תיעוד ב-.claude/INSTALLED_TOOLS.md

5. **מיקום הסקיל:**
   - צור את הסקיל ב: ~/.claude/skills/gsd-suggest-tools.md
   - הסקיל צריך להיות בפורמט SKILL.md standard
   - הוסף metadata מתאים

6. **טריגר אוטומטי:**
   - הסקיל ירוץ אוטומטית אחרי:
     * /gsd:discuss-phase
     * /gsd:brainstorm
     * /gsd:new-project
   - או ידני עם: /gsd:suggest-tools

7. **דוגמת פלט לפרויקט Eden (לוודא שהבנת):**

   עבור פרויקט עם:
   - React + Node.js + Express + SQLite
   - Socket.IO
   - WhatsApp API, Google Translate API, Google AI API
   - uploads/ folder
   - Deployed on Render

   צריך להמליץ על:
   Essential: SQLite MCP, API Testing Agent, Context7 MCP
   Recommended: Database Migration Agent, Filesystem MCP
   Optional: Deployment Monitor Agent

אנא כתוב את הסקיל המלא עכשיו, התקן אותו, ובדוק שהוא עובד.
```

---

## 📝 **הוראות שימוש:**

### שלב 1: העתק את הפרומפט
```
1. העתק את כל הטקסט שבין ה-``` למעלה
2. פתח conversation חדש בפרויקט שתרצה לבדוק
```

### שלב 2: הדבק ושלח
```
3. הדבק את הפרומפט
4. לחץ Enter
5. Claude יכתוב את הסקיל ויתקין אותו
```

### שלב 3: בדוק שהתקנה עבדה
```
6. בדוק ש-~/.claude/skills/gsd-suggest-tools.md קיים
7. הרץ בדיקה: "run /gsd:suggest-tools on this project"
```

---

## 🎯 **מה יקרה אחרי שתריץ את הפרומפט:**

1. ✅ Claude יכתוב את הסקיל המלא
2. ✅ יתקין אותו ב-~/.claude/skills/
3. ✅ יבדוק שהסקיל syntax תקין
4. ✅ ינסה להריץ אותו על הפרויקט הנוכחי
5. ✅ יראה לך את ההמלצות שהוא מייצר

---

## 💡 **טיפים:**

### אם משהו לא עובד:
```
"the skill didn't install correctly, please try again and verify each step"
```

### אם רוצה לבדוק ידנית:
```
"show me the content of ~/.claude/skills/gsd-suggest-tools.md"
```

### אם רוצה לערוך את הסקיל:
```
"modify the skill to also check for [X]"
```

---

## 🚀 **מוכן לשימוש!**

פשוט תעתיק את הפרומפט ותריץ אותו בפרויקט GSD UI הבא!

---

**Created:** 2026-01-26
**Status:** Ready for use
**Next:** Copy prompt → Paste in new project → Install skill automatically
