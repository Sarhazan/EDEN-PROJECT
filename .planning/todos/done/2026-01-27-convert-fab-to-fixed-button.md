---
created: 2026-01-27T20:15
title: Convert FAB to fixed button below starred tasks
area: ui
files:
  - client/src/pages/MyDayPage.jsx
  - client/src/components/shared/TaskCard.jsx
---

## Problem

כפתור ה-+ (FAB - Floating Action Button) צף כרגע בפינה הימנית התחתונה של המסך.
המשתמש מעדיף שהכפתור יהיה קבוע במיקום מוגדר - מתחת לרשימת המשימות המסומנות בכוכב,
במקום להיות צף מעל התוכן.

## Solution

1. הסר את positioning: fixed מכפתור ה-FAB
2. מקם את הכפתור כחלק מה-layout הרגיל של הדף
3. שמור על עיצוב הכפתור (גודל, צבע, אייקון)
4. ודא שהכפתור נגיש בכל גדלי מסך
