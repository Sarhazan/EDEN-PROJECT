export default function HistoryStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="font-semibold mb-4">סטטיסטיקות</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-gray-600 text-sm mb-1">סך הכל הושלמו</p>
          <p className="text-3xl font-bold text-primary">{stats.total_completed}</p>
        </div>

        <div className="text-center">
          <p className="text-gray-600 text-sm mb-1">באיחור</p>
          <p className="text-3xl font-bold text-red-600">{stats.total_late}</p>
        </div>

        <div className="text-center">
          <p className="text-gray-600 text-sm mb-1">אחוז הצלחה</p>
          <p className="text-3xl font-bold text-green-600">
            {stats.on_time_percentage}%
          </p>
        </div>
      </div>
    </div>
  );
}
