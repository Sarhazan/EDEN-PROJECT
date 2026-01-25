# Feature Landscape: Eden v2.0 UX Enhancements

**Domain:** Task management system with WhatsApp integration
**Researched:** 2026-01-25
**Focus:** Loading states, mobile navigation, starred items, resizable layouts

## Executive Summary

Eden v2.0 targets four critical UX dimensions: connection state visibility, mobile usability, important task highlighting, and layout personalization. This research maps modern expectations for each feature category against Eden's Hebrew-first, WhatsApp-integrated architecture.

**Key insight:** Users expect immediate visual feedback (within 100ms), mobile-first gesture controls, persistent favorites across sessions, and layout customization that persists. Eden's real-time WebSocket architecture and existing mobile-optimized interactive pages provide strong foundation for these enhancements.

## Table Stakes

Features users expect. Missing = product feels incomplete or broken.

### 1. Connection Loading States

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Immediate visual feedback (<100ms) | Users perceive delays >100ms as system failure | Low | Must show SOMETHING within first frame |
| Progress indicator during connection (0-30s) | WhatsApp QR generation takes 30s; users need reassurance system is working | Medium | Indeterminate spinner + text label in Hebrew |
| Status update after QR scan (15-30s) | Post-scan wait is confusing without feedback | Low | "ממתין לחיבור..." message |
| Connection success confirmation | Users need explicit "you're connected" signal | Low | Green checkmark + "מחובר לWhatsApp" |
| Error state with retry action | Network failures happen; users need recovery path | Medium | Red error + "נסה שוב" button |
| Skeleton screen for dashboard data (3+ sec load) | Empty dashboard feels broken during initial load | Medium | Show task card outlines before data loads |
| WhatsApp vs WebSocket status distinction | Two different connections; users confused which is broken | Medium | Separate indicators in sidebar |

**Timing guidelines from research:**
- 0-1s: No indicator needed (feels instant)
- 1-3s: Simple spinner or pulse animation
- 3-10s: Progress bar or skeleton screen
- 10+ sec: Percentage indicator with time estimate

**Critical:** Research shows users wait 2x longer (22.6s vs 9s) when progress indicators are present. For WhatsApp's 30-45s connection flow, this is essential.

### 2. Mobile Task Management Interface

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Hamburger menu with drawer navigation | Bottom 45% of screen is "thumb zone" - hamburger is mobile standard | Low | Replace desktop sidebar with drawer |
| Touch-friendly tap targets (44x44px minimum) | iOS/Android accessibility guidelines require 44px minimum | Low | Audit all buttons and interactive elements |
| Single-column card layout on mobile | Horizontal scrolling is mobile anti-pattern | Low | Stack task cards vertically <768px |
| Swipe-to-reveal actions (optional delete/complete) | Expected in mobile task apps; 40% faster completion | Medium | NOT primary completion method (visible buttons remain) |
| Bottom sheet for task details | Keeps context visible; standard for mobile task apps | Medium | Alternative to full-page navigation |
| Sticky header on scroll | Users need navigation access while scrolling tasks | Low | Position: sticky on mobile header |
| Pull-to-refresh gesture | Mobile users expect this for data refresh | Low | Overscroll behavior triggers refresh |

**Mobile navigation research shows:** Bottom tab bars deliver 40% faster task completion vs hamburger menus, BUT Eden's Hebrew manager UI works best with drawer pattern due to dense information architecture.

**Critical gestures to support:**
- Swipe Right: Drawer open (RTL adjusted for Hebrew)
- Swipe Down: Pull to refresh
- Long Press: Context menu (optional - don't replace visible buttons)

### 3. Starred/Favorited Items

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Visual toggle (star icon) for marking important | Universal pattern across all task management apps | Low | Filled star = starred, outline = not starred |
| Immediate toggle feedback (optimistic update) | Perceived performance critical for engagement | Low | Update UI immediately, sync to server async |
| Persistent across sessions | Users expect favorites to survive logout/reload | Low | Store in database, not just client state |
| Filter to show only starred items | Main purpose of starring is focusing on important tasks | Low | "רק משימות מסומנות" toggle filter |
| Starred state persists after task completion | Stars mark importance, not just current status | Low | Keep star even when task moves to history |
| Clear visual distinction in list view | Users need to scan quickly for starred items | Low | Yellow star icon visible in task card |
| Count of starred items | Users want to know how many important tasks exist | Low | Badge or counter in filter UI |

**Storage pattern:** Database column `is_starred` (boolean, default false) with index for fast filtering. Client-side optimistic update with server reconciliation.

**Anti-pattern to avoid:** Don't use starring as a status field - it's orthogonal to pending/completed states.

### 4. Resizable Split-Pane Layout

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Visual drag handle between panes | Users need clear affordance for resize capability | Low | Vertical bar with :: or ⋮⋮ icon |
| Mouse cursor change on hover (col-resize) | Standard desktop UX pattern for resizable areas | Low | CSS cursor: col-resize on divider |
| Minimum pane width constraints (200-300px) | Prevent collapse into unusable narrow columns | Low | Enforce min-width during drag |
| Persist size across sessions | Users customize once, expect it to stick | Low | localStorage with pane width % or px |
| Smooth resize without content reflow jank | Poor resize performance feels broken | Medium | CSS performance: transform over width |
| Double-click divider to reset to defaults | Power user feature for quick reset | Low | 50/50 split on double-click |
| Keyboard-accessible resize (optional) | Accessibility requirement for ARIA compliance | Medium | Not MVP - can defer |

**Research insights:**
- Default resize weight 0.5 splits space evenly
- Use percentage-based sizing (50%/50%) for responsive behavior
- `continuousLayout: true` causes performance issues - update on drag end only
- Mobile: Skip resizable panes entirely (stack vertically instead)

**Eden-specific:** Two panes needed: recurring tasks vs one-time tasks. Default 60/40 split (recurring larger).

## Differentiators

Features that set Eden apart. Not expected, but highly valued.

### Real-Time Connection Status Choreography

**What:** Staged loading states that explain exactly what's happening during WhatsApp connection flow.

**Why valuable:** WhatsApp connection is Eden's unique integration - most task apps don't have this complexity. Making it transparent builds trust.

**Implementation:**
```
Stage 1: "מאתחל חיבור WhatsApp..." (0-3s)
Stage 2: "יוצר QR code..." (3-30s) - spinner
Stage 3: "סרוק את הQR למחשב או לנייד" (show QR)
Stage 4: "ממתין לאישור..." (post-scan, 15-30s)
Stage 5: "מחובר!" (success state)
```

**Complexity:** Medium - requires mapping WhatsApp client events to UI states

**Competitive advantage:** Competitors have simpler auth flows. Eden's multi-stage connection becomes a feature, not a bug.

### RTL-Optimized Mobile Gestures

**What:** Swipe gestures that respect Hebrew right-to-left directionality.

**Why valuable:** Most gesture libraries assume LTR. Eden serves Hebrew-speaking managers - swipe left/right need to feel natural for RTL users.

**Implementation:**
- Swipe right = open drawer (standard), but drawer slides from RIGHT (RTL)
- Swipe left = close drawer or back action
- Visual animations respect text direction

**Complexity:** Low - CSS transforms and conditional gesture directions

**Competitive advantage:** Hebrew-specific apps are rare; proper RTL UX is major differentiator.

### Starred + Late + System Multi-Filter

**What:** Combine star filter with existing late/on-time filters and system filters for power queries like "show starred late A/C tasks"

**Why valuable:** Managers juggle priorities across multiple dimensions. Single-axis filtering is limiting.

**Implementation:**
- Star toggle + timing status dropdown + system dropdown
- AND filter logic (must match all selected)
- Show active filter count: "3 סינונים פעילים"

**Complexity:** Low - filter logic already exists for history page

**Competitive advantage:** Most task apps have simple filtering. Eden's domain (building maintenance) needs multi-dimensional priority management.

### Persistent Layout Profiles

**What:** Save multiple resize layouts as profiles: "Morning view" (60/40), "Evening review" (40/60), "Mobile full-width"

**Why valuable:** Manager workflows vary by time of day. Quick layout switching beats manual resize.

**Implementation:**
- Dropdown: "פרופילי תצוגה" with 3 presets + custom
- Save button to persist current layout as custom
- Store in localStorage: `{ layouts: { morning: "60/40", evening: "40/60", custom: "55/45" } }`

**Complexity:** Medium - requires UI for profile management

**Competitive advantage:** Task apps offer resize OR saved views, rarely both. Eden's recurring/one-time split benefits from this.

### Micro-Animations for Connection State Transitions

**What:** Smooth animations between loading stages that communicate progress direction.

**Why valuable:** Research shows users tolerate longer waits with engaging animations. WhatsApp's 45s total connection time needs this.

**Implementation:**
- Spinner rotates (continuous) during indefinite waits
- Pulse animation on QR code display
- Slide-up success message with checkmark animation
- Color transitions: gray (loading) → yellow (waiting) → green (connected)

**Complexity:** Low - CSS animations with state classes

**Competitive advantage:** Makes Eden's complex connection flow feel polished vs. janky.

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

### Non-Blocking Loading Screens

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full-page modal during WhatsApp connection | Traps users in wait state; can't review tasks or settings while connecting | Use sidebar status indicator that doesn't block main UI |
| Auto-refresh countdown without user control | Forces navigation away from current task; disruptive | Manual refresh button or pull-to-refresh gesture |
| Progress bars with fake/inaccurate percentages | WhatsApp connection time is unpredictable; fake bar damages trust | Use indeterminate spinner, not fake 0-100% progress |

**Research warning:** Users perceive inaccurate progress bars as dishonest. WhatsApp's variable connection time (15-45s) makes accurate progress impossible - don't fake it.

### Gesture-Only Actions

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Swipe as ONLY way to complete/delete tasks | Not all users discover gestures; accessibility failure | Swipes are optional shortcuts - visible buttons are primary |
| Hidden navigation (no hamburger icon, gesture-only) | Violates "never use gestures as only method" principle from research | Always show visible affordance (hamburger icon) |
| Multi-finger gestures (pinch, rotate) for core actions | Excludes one-handed mobile use; not accessible | Reserve for optional zoom/pan features |

**Research insight:** "Never use gestures as the only method - always provide visible affordance." Eden's worker-facing interactive pages serve diverse users - assume low tech literacy.

### Persistent/Sticky Toasts

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Toast notifications that don't auto-dismiss | Toast pattern is temporary by definition; persistent = banner | Use banner for persistent states (WhatsApp disconnected), toast for events (task completed) |
| Timed toasts for critical errors | Users with disabilities need more time to read; accessibility violation | Error states stay until user dismisses or takes action |
| Multiple simultaneous toasts | Creates visual clutter; users miss messages | Queue toasts or replace with latest (max 1 visible) |

**Research warning:** "Don't use notifications that dismiss on a timer for critical or emergency messages."

### Desktop-Focused Resize Controls

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Resizable panes on mobile (<768px) | Touch resize is fiddly; mobile users expect fixed layouts | Hide resize handle on mobile; stack panes vertically |
| Pixel-precise resize without snapping | Users waste time fine-tuning; frustrating UX | Snap to common ratios: 33/66, 50/50, 66/33 |
| Complex keyboard resize shortcuts | Eden users are managers, not power users | Mouse/touch only; keyboard access is nice-to-have, not core |

**Eden-specific:** Manager UI is desktop-primary. Don't over-invest in mobile resize - simple stack is better.

### Star Overloading

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Stars as priority levels (1-5 stars) | Adds cognitive load; users struggle with priority scales | Binary star (yes/no); use separate priority field if needed |
| Auto-starring based on rules | Removes user control; "smart" features often wrong | Manual starring only; keep it simple |
| Starring workers or systems (not just tasks) | Feature creep; stars lose meaning when applied everywhere | Stars only for tasks in "Today" view |

**Research pattern:** "Choosing to favorite content is an on/off choice" - keep it binary and explicit.

### Offline-First for Eden

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Offline task creation/editing | Eden's value is real-time visibility; offline mode breaks this | Require online connection; show clear "offline" state |
| Complex conflict resolution (CRDT, operational transform) | Manager and workers rarely edit same task; over-engineering | Last-write-wins with server timestamp; accept rare conflicts |
| Service Worker caching of task data | Task data changes frequently; stale cache confuses users | Cache static assets only (CSS, JS); fetch task data fresh |

**Eden-specific:** Real-time updates are core value prop. Offline support undermines this - better to show "reconnecting..." than stale data.

## Feature Dependencies

```
Connection Loading States (foundation)
  ↓
  ├─→ WhatsApp Status Indicator (depends on connection states)
  └─→ Auto-reconnect (depends on status indicator)

Mobile Navigation (foundation)
  ↓
  ├─→ Hamburger Menu (must exist before any mobile work)
  ├─→ Bottom Sheet (optional enhancement to mobile nav)
  └─→ Swipe Gestures (builds on mobile nav patterns)

Starred Items (independent)
  └─→ Multi-Filter (stars + timing + system - builds on basic star filter)

Resizable Layout (independent)
  └─→ Layout Profiles (enhancement to basic resize)
```

**Critical path for v2.0:**
1. Connection loading states FIRST (highest user pain point)
2. Mobile hamburger menu SECOND (enables mobile testing)
3. Starred items THIRD (independent, high value)
4. Resizable layout FOURTH (nice-to-have, lower priority)

## MVP Recommendation

For v2.0 MVP, prioritize:

### Must Have (Table Stakes)

1. **Connection loading states**
   - Stage 1-5 labels in Hebrew
   - Indeterminate spinner during waits
   - Success/error states
   - Separate WhatsApp/WebSocket indicators

2. **Mobile hamburger navigation**
   - Drawer with RTL slide direction
   - Touch-friendly 44px targets
   - Single-column task cards <768px
   - Sticky header

3. **Basic starred items**
   - Star toggle on task cards
   - Persistent storage in database
   - Filter to show starred only
   - Visual distinction in list

4. **Simple resize columns**
   - Drag handle with cursor change
   - Min-width constraints (250px)
   - localStorage persistence
   - Desktop only (hide on mobile)

### Defer to Post-MVP

- **Bottom sheets:** Mobile modal pattern - nice but not essential (use full-page navigation)
- **Swipe gestures:** Optional shortcut - visible buttons are sufficient
- **Multi-filter:** Star + timing + system combo - can add incrementally
- **Layout profiles:** Power user feature - basic resize sufficient for v2.0
- **Skeleton screens:** Polish feature - simple spinner is acceptable
- **Pull-to-refresh:** Expected but not critical (manual refresh button works)
- **Micro-animations:** Polish - static state changes acceptable

## Mobile-Specific Patterns

### Responsive Breakpoints

```css
/* Mobile first */
< 768px: Single column, hamburger nav, stacked panes
768-1024px: Tablet - consider 2-column grid, drawer nav
> 1024px: Desktop - sidebar nav, resizable panes
```

### Touch Targets (iOS/Android guidelines)

- **Minimum:** 44x44px (accessibility requirement)
- **Comfortable:** 48x48px (Material Design recommendation)
- **Eden standard:** 48x48px for all interactive elements

### Gesture Dictionary for Eden

| Gesture | Action | RTL Behavior |
|---------|--------|--------------|
| Swipe Right | Open drawer | Drawer slides from RIGHT in Hebrew |
| Swipe Left | Close drawer / Back | Mirror of swipe right |
| Swipe Down | Pull to refresh | Direction-independent |
| Long Press | Context menu (optional) | Not implemented in v2.0 |
| Tap | Primary action | Standard |

## RTL Considerations

Eden serves Hebrew-speaking managers - all mobile patterns must respect RTL.

### What Changes in RTL

- **Hamburger position:** Top-RIGHT corner (not top-left)
- **Drawer slide direction:** FROM right (not left)
- **Swipe directions:** Mirror (swipe right opens drawer)
- **Icon placement:** Chevrons, arrows point LEFT for forward
- **Timeline direction:** Right to left (if showing task progression)

### What DOESN'T Change

- **Numbers:** Always LTR (phone numbers, dates)
- **Progress bars:** Fill left-to-right (universal)
- **Media controls:** Play/pause icons not mirrored
- **Zoom gestures:** Pinch works same direction

### Implementation

```css
/* RTL drawer */
[dir="rtl"] .drawer {
  right: 0;  /* not left: 0 */
  transform: translateX(100%);  /* hide offscreen to right */
}

[dir="rtl"] .drawer.open {
  transform: translateX(0);
}
```

## Performance Budgets

Based on research timing guidelines:

| Interaction | Target | Maximum | Strategy |
|-------------|--------|---------|----------|
| Initial visual feedback | 100ms | 200ms | Optimistic UI updates |
| Star toggle response | 50ms | 100ms | Immediate UI change, async server sync |
| Drawer open animation | 200ms | 300ms | CSS transform (GPU-accelerated) |
| Pane resize drag | 16ms/frame | 33ms/frame | Use transform, not width changes |
| Task filter update | 100ms | 300ms | Debounce filter input, virtual scrolling for >100 tasks |
| Connection state change | Immediate | 50ms | WebSocket event → state update → render |

**Critical:** Research shows progress indicators make users wait 2x longer. Use this for WhatsApp's 30-45s connection.

## Accessibility Checklist

### WCAG 2.1 AA Requirements

- [ ] Minimum 44x44px touch targets (Level AAA, but industry standard)
- [ ] Keyboard navigation for resize (can defer to post-v2.0)
- [ ] ARIA labels for connection status ("טוען...", "מחובר", "מנותק")
- [ ] Color + icon for states (don't rely on color alone)
- [ ] Error messages don't auto-dismiss (users need time to read)
- [ ] Focus visible on drawer menu items
- [ ] Screen reader announces star toggle ("משימה מסומנת", "סימון הוסר")

### Hebrew-Specific Accessibility

- [ ] Screen reader support for RTL text direction
- [ ] Emoji flag icons have text alternatives (🇮🇱 = "עברית")
- [ ] Numeric dates in Hebrew calendar format option (נדחה ל-v3.0)

## Testing Scenarios

### Connection Loading States

1. **Happy path:** WhatsApp connects in 30s → show stages 1-5 → success
2. **Slow connection:** Takes 60s → indicator still spinning → eventually succeeds
3. **Network failure:** Connection fails → show error → retry button works
4. **Disconnect during use:** WhatsApp drops → show reconnecting → auto-reconnects
5. **WebSocket vs WhatsApp:** WebSocket drops but WhatsApp stays → separate indicators

### Mobile Navigation

1. **Hamburger opens/closes:** Tap icon → drawer slides from right (RTL)
2. **Touch targets:** All buttons 48x48px → comfortable thumb tapping
3. **Orientation change:** Rotate device → layout reflows correctly
4. **Swipe gestures:** (if implemented) Swipe right → drawer opens
5. **Sticky header:** Scroll tasks → header stays visible

### Starred Items

1. **Star toggle:** Click star → fills immediately → persists after refresh
2. **Filter:** Enable star filter → only starred tasks show
3. **Completed starred task:** Complete task → star remains → task leaves "Today" view but stays starred in history
4. **Multiple stars:** Star 5 tasks → count shows "5 משימות מסומנות"
5. **Offline toggle:** (no offline, skip this) Star while online → syncs to server

### Resizable Layout

1. **Drag resize:** Drag divider → both panes resize smoothly
2. **Min-width:** Drag to collapse → stops at 250px minimum
3. **Persist layout:** Resize → refresh page → layout remembered
4. **Double-click reset:** Double-click divider → returns to 50/50
5. **Mobile hide:** View on mobile → no resize handle, panes stacked

## Sources

### Loading States & Progress Indicators
- [Best Practices For Animated Progress Indicators — Smashing Magazine](https://www.smashingmagazine.com/2016/12/best-practices-for-animated-progress-indicators/)
- [Progress Indicators Make a Slow System Less Insufferable - NN/G](https://www.nngroup.com/articles/progress-indicators/)
- [UX Design Patterns for Loading - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-loading-feedback)
- [Skeleton Screens 101 - NN/G](https://www.nngroup.com/articles/skeleton-screens/)
- [Skeleton loading screen design — LogRocket](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/)

### Mobile Task Management & Navigation
- [Mobile Navigation Design: 6 Patterns That Work in 2026](https://phone-simulator.com/blog/mobile-navigation-patterns-in-2026)
- [7 Mobile UX/UI Design Patterns Dominating 2026](https://www.sanjaydey.com/mobile-ux-ui-design-patterns-2026-data-backed/)
- [Mobile Navigation UX Best Practices (2026)](https://www.designstudiouiux.com/blog/mobile-navigation-ux/)
- [Bottom Sheets: Definition and UX Guidelines - NN/G](https://www.nngroup.com/articles/bottom-sheet/)
- [Bottom Sheet UI Design: Best practices — Mobbin](https://mobbin.com/glossary/bottom-sheet)

### Gestures & Touch Interactions
- [Gestures - Patterns - Material Design](https://m1.material.io/patterns/gestures.html)
- [Designing swipe-to-delete and swipe-to-reveal - LogRocket](https://blog.logrocket.com/ux-design/accessible-swipe-contextual-action-triggers/)
- [The Impact of Gestures on Mobile UX | Codebridge](https://www.codebridge.tech/articles/the-impact-of-gestures-on-mobile-user-experience)

### Starred/Favorites Patterns
- [Favorites design pattern - UI Patterns](https://ui-patterns.com/patterns/favorites)
- [Hearts Don't Lie: The Importance of 'Favouriting' in E-Commerce](https://medium.com/the-ux-chap/hearts-dont-lie-the-importance-of-favouriting-in-e-commerce-82d14d1c196f)
- [Like, Follow, Subscribe, Favorite - How-to | Medium](https://medium.com/appunite-edu-collection/like-follow-subscribe-favorite-how-to-f921ab952882)
- [UI for Favorites | Mobiscroll Blog](https://blog.mobiscroll.com/ui-for-favorites/)

### Resizable Split-Pane Layouts
- [Creating Resizable Split Panes from Scratch](https://blog.openreplay.com/resizable-split-panes-from-scratch/)
- [How to Use Split Panes - Java Tutorials](https://docs.oracle.com/javase/tutorial/uiswing/components/splitpane.html)
- [Divide and Conquer: Mastering Layouts with React Split Pane](https://reactlibs.dev/articles/split-panes-made-easy-with-react-split-pane/)

### RTL Design Patterns
- [Designing for the Right-to-Left (RTL) World | Medium](https://medium.com/@ananyaad1707/designing-for-the-right-to-left-rtl-world-f755e0bd90ed)
- [Right-To-Left Development In Mobile Design — Smashing Magazine](https://www.smashingmagazine.com/2017/11/right-to-left-mobile-design/)
- [Mobile app design for right-to-left languages | UX Collective](https://uxdesign.cc/mobile-app-design-for-right-to-left-languages-57c63f136749)
- [Fundamentals of Right to Left UI Design | Medium](https://medium.com/blackboard-design/fundamentals-of-right-to-left-ui-design-for-middle-eastern-languages-afa7663f66ed)

### Toast Notifications & Real-Time Updates
- [Toast Messages vs. Snackbars, Banners, and Push Notifications | Courier](https://www.courier.com/blog/what-is-a-toast-message)
- [What is a toast notification? Best practices for UX - LogRocket](https://blog.logrocket.com/ux-design/toast-notifications/)
- [Toast UI Design: Best practices — Mobbin](https://mobbin.com/glossary/toast)
- [Top 9 React notification libraries in 2026 | Knock](https://knock.app/blog/the-top-notification-libraries-for-react)

### Offline-First & Sync Patterns
- [Offline-first frontend apps in 2025: IndexedDB and SQLite - LogRocket](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [A Design Guide for Building Offline First Apps](https://hasura.io/blog/design-guide-to-offline-first-apps)
- [Building an offline realtime sync engine · GitHub](https://gist.github.com/pesterhazy/3e039677f2e314cb77ffe3497ebca07b)

### Undo/Redo Patterns
- [Rewriting History: Adding Undo/Redo to Complex Web Apps - Contentsquare](https://engineering.contentsquare.com/2023/history-undo-redo/)
- [You Don't Know Undo/Redo - DEV Community](https://dev.to/isaachagoel/you-dont-know-undoredo-4hol)
- [Undo, Redo, and the Command Pattern | esveo](https://www.esveo.com/en/blog/undo-redo-and-the-command-pattern/)

---

**Research confidence:** HIGH for table stakes patterns (widely documented), MEDIUM for differentiators (Eden-specific applications), HIGH for anti-features (well-established mistakes)

**Last updated:** 2026-01-25
