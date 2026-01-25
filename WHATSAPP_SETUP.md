# הוראות הגדרת WhatsApp 🌿

## סקירה כללית

מערכת WhatsApp עובדת בשני חלקים:
1. **השרת הראשי** (Render) - מריץ את האפליקציה הווב
2. **WhatsApp Gateway** (המחשב שלך) - מטפל בשליחת הודעות WhatsApp

## התקנה - פעם אחת בלבד

### 1. התקן את ה-Gateway על המחשב

פתח טרמינל (CMD או PowerShell) והרץ:

```bash
cd "c:\dev\projects\claude projects\eden claude\whatsapp-gateway"
npm install
```

### 2. הפעל את ה-Gateway

```bash
npm start
```

אתה תראה:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌿 Eden WhatsApp Gateway
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Server running on port 3003
📡 Local: http://localhost:3003
🌐 Network: http://192.168.1.35:3003
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Initializing WhatsApp client...

📱 QR CODE RECEIVED - Scan with your phone:

█▀▀▀▀▀█ ▀▀▄ █▄ ▀ █▀▀▀▀▀█
█ ███ █ ...
```

### 3. סרוק את ה-QR

1. פתח WhatsApp בטלפון שלך
2. לחץ על תפריט (⋮) → **מכשירים מקושרים**
3. לחץ על **קשר מכשיר**
4. סרוק את ה-QR שמופיע בטרמינל

תראה:
```
✅ WhatsApp authenticated successfully
✅ WhatsApp client is ready!
```

**זהו! השרת מוכן.**

### 4. הגדר את Render (פעם אחת)

1. היכנס ל-[Render Dashboard](https://dashboard.render.com/)
2. בחר בשרת **eden-project**
3. לחץ על **Environment**
4. לחץ על **Add Environment Variable**
5. הוסף:
   - **Key:** `WHATSAPP_GATEWAY_URL`
   - **Value:** `http://192.168.1.35:3003`
6. לחץ **Save Changes**
7. Render יעשה redeploy אוטומטי

## שימוש יומיומי

כל פעם שאתה רוצה לשלוח הודעות WhatsApp:

1. **הפעל את ה-Gateway** (אם הוא לא רץ):
   ```bash
   cd "c:\dev\projects\claude projects\eden claude\whatsapp-gateway"
   npm start
   ```

2. **השתמש באפליקציה** כרגיל מכל דפדפן:
   - לך ל-https://eden-project.onrender.com
   - צור משימות
   - לחץ "שלח WhatsApp"
   - ההודעות נשלחות אוטומטית! ✅

## טיפים

💡 **השאר את הטרמינל פתוח** כל עוד אתה משתמש ב-WhatsApp

💡 **הסשן נשמר** - לא צריך לסרוק QR בכל פעם (רק בפעם הראשונה)

💡 **המחשב חייב להיות דלוק** כדי לשלוח הודעות

💡 **אפשר לסגור Chrome** - ה-WhatsApp רץ ברקע

## פתרון בעיות

### "שרת WhatsApp המקומי אינו זמין"

הפתרון:
```bash
cd "c:\dev\projects\claude projects\eden claude\whatsapp-gateway"
npm start
```

### QR נעלם לפני שהספקתי לסרוק

הפתרון:
1. סגור את הטרמינל (Ctrl+C)
2. הרץ שוב `npm start`
3. QR חדש יופיע

### "WhatsApp is not ready"

חכה כמה שניות אחרי שסרקת את ה-QR.
אם עדיין לא עובד - הרץ מחדש:
```bash
# סגור (Ctrl+C) ואז:
npm start
```

### WhatsApp התנתק

זה קורה לפעמים. פשוט הרץ מחדש:
```bash
npm start
```

לא צריך לסרוק QR שוב (אלא אם תמחק את התיקייה `.wwebjs_auth`).

## שאלות נפוצות

**ש: האם צריך להשאיר את ה-Gateway רץ כל הזמן?**
ת: רק כשאתה צריך לשלוח הודעות. אפשר לכבות ולהדליק לפי הצורך.

**ש: מה קורה אם המחשב נכבה?**
ת: כלום. פשוט תפעיל את ה-Gateway מחדש כשהמחשב דלוק.

**ש: האם זה בטוח?**
ת: כן! זה בדיוק מה שעושה WhatsApp Web הרגיל, רק אוטומטי.

**ש: כמה עולה?**
ת: 0 ₪ - הכל חינמי!

## קבצים חשובים

- **whatsapp-gateway/** - השרת המקומי
- **whatsapp-gateway/.wwebjs_auth/** - הסשן השמור (אל תמחק!)
- **WHATSAPP_SETUP.md** - הקובץ הזה

---

נתקלת בבעיה? שלח הודעה לתמיכה עם צילום מסך של הטרמינל.
