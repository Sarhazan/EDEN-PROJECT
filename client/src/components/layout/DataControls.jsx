import { useApp } from '../../context/AppContext';

export default function DataControls() {
  const { seedData, clearData } = useApp();

  const handleSeed = async () => {
    if (confirm('פעולה זו תמחק את כל הנתונים הקיימים ותטען נתוני דמה. להמשיך?')) {
      try {
        await seedData();
        alert('נתוני דמה נטענו בהצלחה!');
      } catch (error) {
        alert('שגיאה: ' + error.message);
      }
    }
  };

  const handleClear = async () => {
    if (confirm('אזהרה! פעולה זו תמחק את כל הנתונים ולא ניתן לשחזר. האם אתה בטוח?')) {
      if (confirm('האם אתה בטוח לחלוטין? כל הנתונים יימחקו לצמיתות!')) {
        try {
          await clearData();
          alert('כל הנתונים נמחקו בהצלחה');
        } catch (error) {
          alert('שגיאה: ' + error.message);
        }
      }
    }
  };

  return (
    <div className="fixed top-4 left-4 flex gap-2 z-50">
      <button
        onClick={handleSeed}
        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm shadow-lg transition-colors"
      >
        טען נתוני דמה
      </button>
      <button
        onClick={handleClear}
        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm shadow-lg transition-colors"
      >
        נקה נתונים
      </button>
    </div>
  );
}
