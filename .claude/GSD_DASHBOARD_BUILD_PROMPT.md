# 🎯 GSD Dashboard VSCode Extension - Build Prompt

**תאריך יצירה:** 2026-01-26
**מטרה:** בניית VSCode Extension עם Webview להצגת GSD project status

---

## 📋 **הפרומפט - העתק והדבק בטרמינל חדש:**

```
אני רוצה שתבנה לי VSCode Extension בשם "GSD Dashboard" שמציג ויזואלית את הסטטוס של פרויקט GSD.

## מה זה עושה:
Extension שפותח Webview panel עם React app שמציג:
1. **Timeline/Gantt** של כל ה-phases במיילסטון הנוכחי
2. **Debug Tracker** - רשימת באגים פתוחים ופתורים
3. **סטטיסטיקות** - requirements, phases, progress

## מפרט טכני:

### מבנה הפרויקט:
```
gsd-dashboard-vscode/
├── package.json                 # Extension manifest
├── tsconfig.json
├── src/
│   └── extension.ts             # Extension entry point
├── webview/                     # React app (Vite)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── App.css
│       ├── types.ts             # TypeScript types
│       ├── hooks/
│       │   └── useGSDData.ts    # קבלת נתונים מה-extension
│       ├── services/
│       │   └── gsdParser.ts     # פונקציות parsing לקבצי GSD
│       └── components/
│           ├── Header.tsx       # כותרת + סטטיסטיקות
│           ├── TabBar.tsx       # ניווט Timeline/Bugs
│           ├── timeline/
│           │   ├── Timeline.tsx
│           │   ├── PhaseBar.tsx
│           │   └── PlanList.tsx
│           └── debug/
│               ├── DebugTracker.tsx
│               └── BugCard.tsx
└── resources/
    └── icon.png
```

### Extension (TypeScript):

**package.json** צריך לכלול:
- name: "gsd-dashboard"
- displayName: "GSD Dashboard"
- version: "0.1.0"
- engines.vscode: "^1.85.0"
- activationEvents: ["onCommand:gsd.openDashboard"]
- contributes.commands: [{ command: "gsd.openDashboard", title: "GSD: Open Dashboard" }]
- main: "./out/extension.js"
- devDependencies: @types/vscode, typescript, @vscode/vsce

**extension.ts** צריך:
1. לרשום פקודה `gsd.openDashboard`
2. ליצור WebviewPanel
3. לקרוא את כל הקבצים מ-.planning/ directory:
   - PROJECT.md
   - MILESTONES.md
   - .continue-here.md
   - milestones/*.md (רודמאפ)
   - phases/**/*.md (תוכניות)
   - debug/**/*.md (באגים)
4. לשלוח את הנתונים ל-webview דרך postMessage
5. להאזין לבקשות refresh מה-webview

### Webview React App:

**gsdParser.ts** - פונקציות parsing:
```typescript
// פירוק YAML frontmatter
function parseYamlFrontmatter(content: string): { frontmatter: object; body: string }

// קריאת PROJECT.md
function parseProject(content: string): { name: string; description: string; currentMilestone: string }

// קריאת MILESTONES.md
function parseMilestones(content: string): Milestone[]

// קריאת ROADMAP.md
function parseRoadmap(content: string): Phase[]

// קריאת PLAN.md
function parsePlan(content: string): Plan

// קריאת SUMMARY.md
function parseSummary(content: string): Summary

// קריאת VERIFICATION.md
function parseVerification(content: string): Verification

// קריאת debug session
function parseDebugSession(content: string): DebugSession
```

**Types (types.ts):**
```typescript
interface Phase {
  number: string;
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  plans: Plan[];
  requirements: string[];
}

interface Plan {
  number: string;
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  wave: number;
  dependsOn: string[];
  filesModified: string[];
}

interface DebugSession {
  name: string;
  status: 'active' | 'resolved';
  trigger: string;
  hypothesis?: string;
  lastAction?: string;
  created: string;
  updated: string;
}

interface ProjectData {
  name: string;
  milestone: string;
  phases: Phase[];
  debugSessions: DebugSession[];
  stats: {
    requirementsFulfilled: number;
    requirementsTotal: number;
    phasesComplete: number;
    phasesTotal: number;
  };
}
```

### UI Design (Tailwind CSS):

**Header:**
```
┌────────────────────────────────────────────────────────────────┐
│  🎯 [Project Name] - [Milestone]          [X/Y] ✓  [X/Y] ◉  🔄│
└────────────────────────────────────────────────────────────────┘
```

**TabBar:**
```
[ 📊 Timeline ] [ 🐛 Bugs (2) ]
```

**Timeline Tab:**
```
████████████████████████░░░░░░░░  Phase 1: Name              ✓
████████████████░░░░░░░░░░░░░░░░  Phase 2: Name             ●→
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 3: Name              ○

> Click to expand phase and see plans
```

**Bugs Tab:**
```
🔴 Active (2)
├── bug-name-here                Started: 2h ago
│   Hypothesis: "..."
│   Last action: checking logs
│
└── another-bug                  Started: 30m ago
    Hypothesis: "..."

✅ Resolved (12)                 [Show all ▼]
```

### עיצוב:
- Dark theme (מתאים ל-VSCode)
- RTL support (dir="rtl" לעברית)
- צבעים:
  - Completed: green (#22c55e)
  - In Progress: yellow (#eab308)
  - Pending: gray (#6b7280)
  - Active Bug: red (#ef4444)
- Progress bars מונפשים
- Hover effects על phases ו-bugs

### Flow:

1. User: Ctrl+Shift+P → "GSD: Open Dashboard"
2. Extension: קורא .planning/ directory
3. Extension: שולח נתונים ל-webview
4. Webview: מפרסר ומציג Timeline + Bugs
5. User: לוחץ Refresh → Extension קורא מחדש

### Build Process:

1. cd webview && npm run build → יוצר dist/
2. Extension משתמש ב-dist/index.html כ-webview content
3. vsce package → יוצר .vsix file

### Verification:

1. `cd gsd-dashboard-vscode && npm install`
2. `cd webview && npm install && npm run build`
3. `cd .. && npm run compile`
4. פתח ב-VSCode, לחץ F5
5. בחלון החדש: Ctrl+Shift+P → "GSD: Open Dashboard"
6. בדוק:
   - Timeline מציג את כל ה-phases
   - לחיצה על phase מרחיבה את ה-plans
   - טאב Bugs מציג באגים פתוחים
   - כפתור Refresh עובד

### קבצי .planning/ לקרוא (לא לשנות):

מיקום: התיקייה הנוכחית שבה VSCode פתוח

קבצים:
- `.planning/PROJECT.md` - שם פרויקט
- `.planning/MILESTONES.md` - רשימת מיילסטונים
- `.planning/.continue-here.md` - סטטוס נוכחי
- `.planning/milestones/v*.0-ROADMAP.md` - רודמאפ
- `.planning/phases/*/` - תיקיות phases
- `.planning/phases/*/*.md` - קבצי PLAN, SUMMARY, VERIFICATION
- `.planning/debug/*.md` - באגים פעילים
- `.planning/debug/resolved/*.md` - באגים שנפתרו

### פורמט קבצי GSD:

**PLAN.md:**
```yaml
---
phase: 01-stars-system
plan: 01
wave: 1
depends_on: []
files_modified:
  - server/routes/tasks.js
---

<objective>Description</objective>

<tasks>
<task type="auto">
  <name>Task name</name>
  <files>files</files>
  <action>Steps</action>
  <verify>How to test</verify>
  <done>Summary</done>
</task>
</tasks>
```

**Debug Session:**
```yaml
---
status: active
trigger: "bug-description"
created: 2026-01-25T00:00:00Z
updated: 2026-01-25T00:35:00Z
---

## Current Focus
hypothesis: "What we think"
test: "How testing"
next_action: "What to do"
```

אנא בנה את ה-Extension המלא עכשיו, שלב אחרי שלב, ובדוק שהכל עובד.
```

---

## 🔧 **הוראות שימוש:**

1. פתח טרמינל חדש (לא בפרויקט Eden)
2. נווט לתיקייה שבה תרצה ליצור את ה-Extension
3. העתק והדבק את כל הפרומפט למעלה
4. Claude יבנה את ה-Extension שלב אחרי שלב

## ✅ **Verification Checklist:**

- [ ] Extension נטען ב-VSCode
- [ ] פקודה "GSD: Open Dashboard" מופיעה ב-Command Palette
- [ ] Webview נפתח עם UI
- [ ] Timeline מציג phases
- [ ] Debug Tracker מציג באגים
- [ ] Refresh עובד
