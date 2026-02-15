---
created: 2026-01-25T19:45
title: Improve mobile responsive layout
area: ui
files:
  - src/components/*
  - public/css/*
---

## Problem

המערכת אינה מותאמת היטב לתצוגת סמארטפון. כפי שנראה בצילום המסך המצורף, יש בעיות ברספונסיביות:
- התפריט הצדדי תופס חלק גדול מהמסך במובייל
- תוכן הדף לא מותאם לרוחב מסך קטן
- אלמנטים חופפים או נחתכים
- חוויית משתמש לא אופטימלית במכשירים ניידים

הבעיה משפיעה על שימושיות המערכת עבור עובדים בשטח שמשתמשים בסמארטפונים.

## Solution

TBD - נדרש ניתוח של:
1. ה-CSS הקיים ו-media queries
2. מבנה התפריט הצדדי (sidebar) - אולי drawer/hamburger menu במובייל
3. רספונסיביות של קומפוננטות (משימות, טפסים, כפתורים)
4. בדיקה בגדלי מסך שונים (iPhone, Android)

אפשרויות:
- Mobile-first CSS redesign
- Bootstrap/Tailwind responsive utilities
- Separate mobile navigation component
