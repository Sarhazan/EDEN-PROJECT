# Eden WhatsApp Gateway 🌿

שרת WhatsApp מקומי למערכת ניהול התחזוקה של Eden.

## התקנה והרצה

### פעם ראשונה:

1. **התקן את החבילות:**
```bash
cd whatsapp-gateway
npm install
```

2. **הרץ את השרת:**
```bash
npm start
```

3. **סרוק QR Code:**
   - QR יופיע בטרמינל
   - פתח WhatsApp בטלפון > תפריט (⋮) > מכשירים מקושרים
   - סרוק את הקוד
   - כשיופיע "✅ WhatsApp client is ready!" - הכל מוכן!

### שימוש יומיומי:

פשוט הרץ:
```bash
cd whatsapp-gateway
npm start
```

השרת יתחבר אוטומטית (לא צריך לסרוק QR שוב).

## הוראות לשרת Render

הוסף את הכתובת הזו כ-environment variable ב-Render:
```
WHATSAPP_GATEWAY_URL=http://192.168.1.35:3003
```

## API Endpoints

- `GET /status` - בדיקת סטטוס
- `GET /qr` - קבלת QR code
- `POST /send` - שליחת הודעה יחידה
  ```json
  {
    "phoneNumber": "0501234567",
    "message": "שלום!"
  }
  ```
- `POST /send-bulk` - שליחת הודעות מרובות
  ```json
  {
    "messages": [
      { "phoneNumber": "0501234567", "message": "הודעה 1" },
      { "phoneNumber": "0507654321", "message": "הודעה 2" }
    ]
  }
  ```
- `POST /disconnect` - ניתוק

## טיפים

- השאר את הטרמינל פתוח בזמן שהשרת רץ
- אם קיבלת disconnect - פשוט הרץ מחדש `npm start`
- הסשן נשמר, אז לא צריך לסרוק QR בכל פעם

## פתרון בעיות

**QR לא מופיע:**
- וודא ש-Chrome מותקן במחשב
- נסה להריץ עם `npm run dev` (פותח Chrome בחלון גלוי)

**"WhatsApp is not ready":**
- חכה כמה שניות אחרי ה-QR
- בדוק שה-QR נסרק בהצלחה בטלפון
