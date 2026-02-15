---
created: 2026-01-24T16:45
title: Add simple login screen to home page
area: auth
files:
  - client/src/App.jsx
  - client/src/pages/HomePage.jsx
---

## Problem

The system is currently completely open with no authentication. Need to add a simple login screen at the home page to protect access to the maintenance management system.

User provided example login screen design (Darimpo screenshot) showing a clean, modern login interface with Hebrew RTL support.

## Solution

Create a simple login screen with hardcoded credentials:
- Username: eden
- Password: eden100

Requirements:
- Should be displayed on the home page route
- Use creative, modern design (inspired by Darimpo example but unique)
- Must support Hebrew RTL
- Simple client-side validation (can be enhanced later with proper auth)
- After successful login, show the main app interface

Note: This is a basic implementation - proper authentication with sessions/tokens should be planned for future phases (possibly Phase 5+).
