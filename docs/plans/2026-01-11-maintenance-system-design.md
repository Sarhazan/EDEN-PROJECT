# מערכת ניהול תחזוקת מבנים - מסמך עיצוב
**תאריך:** 11 ינואר 2026
**גרסה:** MVP 1.0

---

## 1. סקירה כללית

מערכת ניהול תחזוקה מקיפה עבור מנהל תחזוקה של מבנים. המערכת מאפשרת ניהול משימות (חד-פעמיות וחוזרות), מערכות, ספקים ועובדים - הכל בעברית עם תמיכה מלאה ב-RTL.

### 1.1 יעדי MVP
- מערכת פשוטה להתקנה והרצה (single-server setup)
- ללא אימות משתמשים (single-user system)
- נתונים מתמשכים (SQLite)
- ממשק עברית מלא עם RTL
- 5 מסכים ראשיים

---

## 2. ארכיטקטורה טכנית

### 2.1 Stack טכנולוגי
- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS + RTL plugin
- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **Icons:** react-icons
- **Date handling:** date-fns

### 2.2 מבנה פרויקט
```
maintenance-system/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # קומפוננטות משותפות
│   │   │   ├── layout/      # Sidebar, Header
│   │   │   ├── shared/      # TaskCard, Modal, Badges
│   │   │   └── forms/       # כל הטפסים
│   │   ├── pages/       # 5 מסכים ראשיים
│   │   ├── context/     # AppContext לניהול state
│   │   ├── hooks/       # Custom hooks
│   │   ├── utils/       # פונקציות עזר
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   └── package.json
├── server/              # Express backend
│   ├── database/
│   │   ├── schema.js        # יצירת טבלאות
│   │   └── seed.js          # נתוני דמה
│   ├── routes/
│   │   ├── tasks.js
│   │   ├── systems.js
│   │   ├── suppliers.js
│   │   ├── employees.js
│   │   └── data.js          # seed & clear
│   └── index.js
├── maintenance.db       # SQLite database
└── package.json
```

### 2.3 תזרים נתונים
1. React שולח בקשות HTTP ל-Express API
2. Express מבצע פעולות CRUD ב-SQLite
3. נתונים חוזרים כ-JSON
4. React Context מעדכן state ו-UI מתרענן

---

## 3. מבנה Database

### 3.1 טבלת tasks
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  system_id INTEGER,
  employee_id INTEGER,
  frequency TEXT CHECK(frequency IN ('one-time', 'daily', 'weekly', 'biweekly', 'monthly', 'semi-annual', 'annual')),
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  priority TEXT CHECK(priority IN ('urgent', 'normal', 'optional')) DEFAULT 'normal',
  status TEXT CHECK(status IN ('draft', 'sent', 'in_progress', 'completed')) DEFAULT 'draft',
  is_recurring BOOLEAN DEFAULT 0,
  parent_task_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE SET NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);
```

### 3.2 טבלת systems
```sql
CREATE TABLE systems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 טבלת suppliers
```sql
CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  payment_frequency TEXT CHECK(payment_frequency IN ('one-time', 'monthly', 'quarterly', 'semi-annual', 'annual')),
  next_payment_date DATE,
  payment_amount DECIMAL(10,2),
  is_paid BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4 טבלת employees
```sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  position TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. API Endpoints

### 4.1 Tasks API (`/api/tasks`)
| Method | Endpoint | תיאור |
|--------|----------|-------|
| GET | `/api/tasks` | כל המשימות |
| GET | `/api/tasks/today` | משימות של היום (לא completed) |
| GET | `/api/tasks/overdue` | משימות חד-פעמיות באיחור |
| GET | `/api/tasks/:id` | משימה ספציפית |
| POST | `/api/tasks` | יצירת משימה חדשה |
| PUT | `/api/tasks/:id` | עדכון משימה |
| PUT | `/api/tasks/:id/status` | שינוי סטטוס + לוגיקת מופע חוזר |
| DELETE | `/api/tasks/:id` | מחיקת משימה |

### 4.2 Systems API (`/api/systems`)
| Method | Endpoint | תיאור |
|--------|----------|-------|
| GET | `/api/systems` | כל המערכות |
| GET | `/api/systems/:id` | מערכת + כל המשימות שלה |
| POST | `/api/systems` | יצירת מערכת |
| PUT | `/api/systems/:id` | עדכון מערכת |
| DELETE | `/api/systems/:id` | מחיקת מערכת |

### 4.3 Suppliers API (`/api/suppliers`)
| Method | Endpoint | תיאור |
|--------|----------|-------|
| GET | `/api/suppliers` | כל הספקים |
| GET | `/api/suppliers/:id` | ספק ספציפי |
| POST | `/api/suppliers` | יצירת ספק |
| PUT | `/api/suppliers/:id` | עדכון ספק |
| PUT | `/api/suppliers/:id/pay` | סימון כ"שולם" + חישוב תאריך הבא |
| DELETE | `/api/suppliers/:id` | מחיקת ספק |

### 4.4 Employees API (`/api/employees`)
| Method | Endpoint | תיאור |
|--------|----------|-------|
| GET | `/api/employees` | כל העובדים |
| GET | `/api/employees/:id` | עובד + מספר משימות פעילות |
| POST | `/api/employees` | יצירת עובד |
| PUT | `/api/employees/:id` | עדכון עובד |
| DELETE | `/api/employees/:id` | מחיקת עובד |

### 4.5 Data Management API (`/api/data`)
| Method | Endpoint | תיאור |
|--------|----------|-------|
| POST | `/api/data/seed` | טען נתוני דמה אקראיים |
| DELETE | `/api/data/clear` | נקה את כל הנתונים |

---

## 5. לוגיקה עסקית

### 5.1 משימות חוזרות
**תהליך:**
1. כאשר משימה עם `is_recurring=true` מסומנת כ-`status='completed'`
2. המערכת יוצרת אוטומטית משימה חדשה עם:
   - כל הפרטים של המשימה המקורית (title, description, etc.)
   - `start_date` מחושב לפי `frequency`:
     - daily: +1 יום
     - weekly: +7 ימים
     - biweekly: +14 ימים
     - monthly: +1 חודש
     - semi-annual: +6 חודשים
     - annual: +1 שנה
   - `status='draft'`
   - `parent_task_id` מצביע על ה-ID של המשימה המקורית

### 5.2 תשלומי ספקים
**תהליך:**
1. לחיצה על "סמן כשולם" לספק
2. אם `payment_frequency='one-time'`:
   - `is_paid=true`
   - `next_payment_date=NULL`
3. אם תדירות חוזרת (monthly, quarterly, etc.):
   - `is_paid=false` (מתאפס)
   - `next_payment_date` מתעדכן לפי התדירות
   - `payment_amount` נשאר זהה

### 5.3 משימות באיחור
**הגדרה:** משימות חד-פעמיות שהתאריך שלהן עבר
**תנאי:** `is_recurring=false AND start_date < today AND status != 'completed'`
**תצוגה:** מופיעות למטה ב"משימות כלליות" עם סימון ויזואלי אדום

### 5.4 זרימת סטטוסים
```
draft → sent → in_progress → completed
  ↑                              ↓
  └──────── (recurring) ─────────┘
```

- **draft:** משימה נוצרה, לא נשלחה
- **sent:** לחיצה על "שלח משימה"
- **in_progress:** עובד התחיל לעבוד
- **completed:** Checkbox מסומן

---

## 6. מסכים ופיצ'רים

### 6.1 מסך "היום שלי" (MyDayPage)

**Header:**
- כותרת: "היום שלי"
- תאריך עברי נוכחי
- כפתור "+ הוסף משימה" (כתום)
- כפתור סינון

**סטטוס בר (4 כרטיסים):**
1. **דחוף** (אדום) - מספר משימות דחופות שלא הושלמו
2. **ממתין** (כתום) - מספר משימות בסטטוס "sent"
3. **הושלם** (ירוק) - מספר + אחוז (X/Y משימות, Z%)
4. **משימות ליומיים** (אפור) - ספירה

**Layout מפוצל:**
- **שמאל (30%):** "משימות כלליות"
  - משימות חד-פעמיות של היום (status != completed)
  - מפריד
  - משימות חד-פעמיות באיחור (start_date < today, status != completed)

- **ימין (70%):** "משימות היום"
  - כל המשימות החוזרות של היום (status != completed)

### 6.2 מסך "כל המשימות" (AllTasksPage)

**2 טאבים:**
1. **כל המערכות:** משימות פעילות (status != completed)
2. **כל הסטטוסים:** היסטוריית משימות (ארכיון)

**פילטרים:**
- חיפוש טקסט חופשי
- סינון לפי מערכת (Dropdown)
- סינון לפי סטטוס (Dropdown)

**תצוגה:** רשימת כרטיסי משימות

### 6.3 מסך "מערכות תחזוקה" (SystemsPage)

**תצוגה:** גריד של כרטיסי מערכות
- שם המערכת
- מספר משימות פעילות (דינמי)
- לחיצה על כרטיס → מעבר ל"כל המשימות" מסונן למערכת זו

**כפתור:** "+ הוסף מערכת"

**מודאל הוסף/ערוך מערכת:**
- שם המערכת (חובה)
- תיאור (אופציונלי)
- איש קשר
- טלפון
- אימייל

### 6.4 מסך "ספקים" (SuppliersPage)

**תצוגה:** גריד של כרטיסי ספקים
- שם הספק
- טלפון
- אימייל
- תאריך תשלום הבא
- סכום לתשלום (₪)
- כפתור "סמן כשולם"

**כפתור:** "+ הוסף ספק"

**מודאל הוסף/ערוך ספק:**
- שם הספק (חובה)
- טלפון
- אימייל
- תדירות תשלום (Dropdown)
- תאריך תשלום הבא (Date picker)
- סכום לתשלום (₪)

### 6.5 מסך "עובדים" (EmployeesPage)

**תצוגה:** גריד של כרטיסי עובדים
- שם העובד
- טלפון
- תפקיד
- מספר משימות פעילות (דינמי)

**כפתור:** "+ הוסף עובד"

**מודאל הוסף/ערוך עובד:**
- שם העובד (חובה)
- טלפון
- תפקיד

### 6.6 מודאל "הוסף/ערוך משימה"

**שדות:**
- כותרת המשימה (טקסט, חובה)
- תיאור (textarea, אופציונלי)
- מערכת (Dropdown)
- עובד אחראי (Dropdown)
- תדירות (Dropdown): חד-פעמי, יומי, שבועי, שבועיים, חודשי, חצי שנתי, שנתי
- תאריך התחלה (Date picker, חובה)
- שעת התחלה (Time picker, חובה)
- עדיפות (Dropdown): דחוף, רגיל, אופציונלי

**כפתורים:**
- "ביטול" (לבן)
- "צור משימה" / "עדכן משימה" (שחור)

---

## 7. קומפוננטות React

### 7.1 Layout Components
- `<App>` - קומפוננטת שורש
- `<Sidebar>` - תפריט ניהול עם 5 קטגוריות
- `<Header>` - כותרת + תאריך + כפתורים
- `<DataControls>` - כפתורי "טען נתוני דמה" ו"נקה נתונים"

### 7.2 Shared Components
- `<TaskCard>` - כרטיס משימה מלא
- `<StatusBadge>` - תג סטטוס צבעוני
- `<PriorityBadge>` - תג עדיפות צבעוני
- `<Modal>` - מודאל גנרי
- `<ConfirmDialog>` - דיאלוג אישור מחיקה
- `<DatePicker>` - בחירת תאריך
- `<TimePicker>` - בחירת שעה
- `<Dropdown>` - רשימה נפתחת

### 7.3 Form Components
- `<TaskForm>` - טופס משימה
- `<SystemForm>` - טופס מערכת
- `<SupplierForm>` - טופס ספק
- `<EmployeeForm>` - טופס עובד

### 7.4 Page Components
- `<MyDayPage>`
- `<AllTasksPage>`
- `<SystemsPage>`
- `<SuppliersPage>`
- `<EmployeesPage>`

---

## 8. ניהול State

### 8.1 Context API
```jsx
<AppContext>
  ├── tasks: []
  ├── systems: []
  ├── suppliers: []
  ├── employees: []
  └── methods: { addTask, updateTask, deleteTask, ... }
```

### 8.2 Custom Hooks
```jsx
useTasks()      // CRUD + getTodayTasks, getOverdueTasks
useSystems()    // CRUD + getSystemTasks
useSuppliers()  // CRUD + markAsPaid
useEmployees()  // CRUD + getEmployeeTaskCount
```

---

## 9. עיצוב UI/UX

### 9.1 צבעים
```js
colors: {
  urgent: '#EF4444',      // אדום
  waiting: '#F59E0B',     // כתום
  completed: '#10B981',   // ירוק
  optional: '#3B82F6',    // כחול
  draft: '#6B7280',       // אפור
  primary: '#F97316'      // כתום ראשי
}
```

### 9.2 Typography
- גופן: `'Heebo', sans-serif`
- כותרות: `text-2xl font-bold`
- טקסט רגיל: `text-base`
- תגיות: `text-sm font-medium`

### 9.3 RTL Configuration
```js
// tailwind.config.js
module.exports = {
  plugins: [require('tailwindcss-rtl')],
  // ...
}

// index.html
<html dir="rtl">
```

### 9.4 כרטיסים
```jsx
className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
```

### 9.5 כפתורים
- **ראשי:** `bg-primary text-white px-4 py-2 rounded-lg`
- **משני:** `bg-white border border-gray-300 px-4 py-2 rounded-lg`
- **מסוכן:** `bg-red-500 text-white px-4 py-2 rounded-lg`

---

## 10. טיפול בשגיאות

### 10.1 Server-side
```js
// Validation
if (!task.title || !task.start_date) {
  return res.status(400).json({ error: 'שדות חובה חסרים' })
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'משהו השתבש' })
})
```

### 10.2 Client-side
```jsx
try {
  const response = await fetch('/api/tasks', {...})
  if (!response.ok) throw new Error('שגיאה')
} catch (error) {
  alert(error.message) // או Toast
}
```

### 10.3 Edge Cases

| מקרה | טיפול |
|------|-------|
| מחיקת מערכת עם משימות | `system_id → NULL`, הצגה: "ללא מערכת" |
| מחיקת עובד עם משימות | `employee_id → NULL`, הצגה: "ללא עובד" |
| ספק תשלום חד-פעמי | לאחר תשלום: `is_paid=true`, `next_payment_date=NULL` |
| טעינת דמה עם נתונים | אזהרה: "זה ימחק נתונים קיימים" |
| ניקוי נתונים | אזהרה כפולה: "פעולה בלתי הפיכה!" |

---

## 11. תהליך פיתוח

### 11.1 התקנה
```bash
# יצירת פרויקט
npm init -y
npm install express cors better-sqlite3 date-fns

# יצירת React app
npm create vite@latest client -- --template react
cd client
npm install
npm install -D tailwindcss postcss autoprefixer tailwindcss-rtl
npm install react-icons date-fns
npx tailwindcss init -p
```

### 11.2 Scripts
```json
{
  "scripts": {
    "dev:server": "nodemon server/index.js",
    "dev:client": "cd client && npm run dev",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "build": "cd client && npm run build",
    "start": "NODE_ENV=production node server/index.js"
  }
}
```

### 11.3 Development Workflow
1. `npm run dev` - פיתוח (server: 3001, client: 5173)
2. `npm run build` - בניית production
3. `npm start` - הרצת production

---

## 12. נתוני דמה

### 12.1 מערכות לדוגמה
- מיזוג אויר
- אינסטלציה
- חשמל
- מעלית

### 12.2 עובדים לדוגמה
- דוד כהן (טכנאי ראשי)
- שרה לוי (עובדת תחזוקה)

### 12.3 ספקים לדוגמה
- אתם לוי בע"מ (משה, תשלום חודשי)
- חברת החשמל (תשלום חודשי)

### 12.4 משימות לדוגמה
- בדיקת מזגנים (חודשי, חוזר)
- תיקון דלת כניסה (חד-פעמי)
- בדיקת פילטרים (שבועי, חוזר)
- החלפת נורות (חד-פעמי, באיחור)

---

## 13. בדיקות לפני השקה

- [ ] כל ה-CRUD פועל על כל הישויות
- [ ] משימות חוזרות נוצרות אוטומטית
- [ ] תשלומי ספקים מתעדכנים נכון
- [ ] RTL עובד בכל המסכים
- [ ] תגיות סטטוס בצבעים נכונים
- [ ] סינונים וחיפושים עובדים
- [ ] כפתורי נתוני דמה וניקוי פועלים
- [ ] נתונים נשמרים אחרי רענון דפדפן
- [ ] אזהרות מחיקה מופיעות
- [ ] סטטיסטיקות מתעדכנות בזמן אמת

---

## 14. תכונות עתידיות (מחוץ ל-MVP)

- אימות משתמשים (multi-user)
- התראות push/email
- גרפים ודוחות
- ייצוא ל-Excel/PDF
- אפליקציית מובייל
- תמיכה בקבצים מצורפים
- יומן אירועים (audit log)
- API לאינטגרציה חיצונית

---

**סוף מסמך עיצוב**
