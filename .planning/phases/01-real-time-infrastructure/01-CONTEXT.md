# Phase 1: Real-Time Infrastructure - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

הקמת תשתית WebSocket שמאפשרת למנהל לראות עדכונים בזמן אמת. כשעובד מסיים משימה, מעלה תמונה, או מוסיף הערה בדף האינטראקטיבי, המנהל רואה את השינוי מיד בממשק הניהול שלו בלי לרענן את הדף.

התשתית הזאת היא הבסיס לכל העדכונים בזמן אמת בפאזות הבאות.

</domain>

<decisions>
## Implementation Decisions

### התנהגות בדף העובד

- העובד לא צריך לדעת על WebSocket - זה עובד שקוף מאחורי הקלעים
- כשעובד מסמן משימה כהושלמה, הפעולה צריכה להיות חלקה וטבעית (פידבק ויזואלי לפי החלטת Claude)
- אם שליחת סימון הושלם נכשלת (אין אינטרנט), המערכת מנסה שוב אוטומטית מספר פעמים
- אם כל הניסיונות נכשלו, העובד רואה הודעת שגיאה ברורה

### Claude's Discretion

- האם הדף של העובד מתחבר ל-WebSocket (אם צריך לעדכונים עתידיים) או רק שולח HTTP רגיל
- איזה פידבק ויזואלי לתת לעובד כשהוא מסמן משימה (טיק, הודעה קצרה, אנימציה)
- כמה ניסיונות חוזרים לבצע ובאיזה פרק זמן
- איך לטפל בחיבור WebSocket של המנהל (התחברות אוטומטית, ניתוקים, reconnect)
- איפה להציג סטטוס חיבור למנהל (אם בכלל)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

הדף של העובד כבר קיים כ-HTML סטטי שמתארח ב-Vercel. החיבור WebSocket צריך להשתלב עם הארכיטקטורה הקיימת.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-real-time-infrastructure*
*Context gathered: 2026-01-19*
