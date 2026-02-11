import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3002/api';

function parseDateInput(value) {
  if (!value) return '';
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}

function formatDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function toCsv(rows) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export default function HQReportsPage() {
  const now = useMemo(() => new Date(), []);
  const [filters, setFilters] = useState({
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
    buildingId: '',
    managerId: ''
  });
  const [startDateInput, setStartDateInput] = useState(formatDateInput(filters.startDate));
  const [endDateInput, setEndDateInput] = useState(formatDateInput(filters.endDate));

  const [data, setData] = useState({ kpis: {}, manager_table: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.buildingId) params.set('buildingId', filters.buildingId);
      if (filters.managerId) params.set('managerId', filters.managerId);

      const res = await fetch(`${API_URL}/history/hq-summary?${params.toString()}`);
      if (!res.ok) throw new Error('לא ניתן לטעון דוחות');
      const payload = await res.json();
      setData(payload || { kpis: {}, manager_table: [] });
    } catch (e) {
      setError(e.message || 'שגיאה בטעינת דוחות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters.startDate, filters.endDate, filters.buildingId, filters.managerId]);

  const exportCsv = () => {
    const rows = [
      ['Report', 'HQ Performance'],
      ['Date Range', `${startDateInput} - ${endDateInput}`],
      ['Total Active Tasks', data.kpis?.total_active_tasks ?? 0],
      ['Overdue Tasks', data.kpis?.overdue_tasks ?? 0],
      ['On-time %', data.kpis?.on_time_percentage ?? 0],
      ['Avg Work Duration (min)', data.kpis?.avg_work_duration_minutes ?? 0],
      [],
      ['Manager', 'Total Tasks', 'Active', 'Completed', 'Overdue', 'On-time %', 'Avg Duration (min)']
    ];

    (data.manager_table || []).forEach((m) => {
      rows.push([
        m.manager_name || m.employee_name || '-',
        m.total_tasks ?? 0,
        m.active_tasks ?? 0,
        m.completed_tasks ?? 0,
        m.overdue_tasks ?? 0,
        m.on_time_percentage ?? 0,
        m.avg_work_duration_minutes ?? 0
      ]);
    });

    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hq-report-${filters.startDate || 'from'}-${filters.endDate || 'to'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">דוחות HQ</h1>
          <p className="text-gray-600 mt-1">תובנות ביצועים + יצוא CSV</p>
        </div>
        <button
          onClick={exportCsv}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
        >
          ייצוא CSV
        </button>
      </div>

      <section className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm text-gray-700">
          תאריך התחלה
          <input
            type="text"
            placeholder="DD/MM/YYYY"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={startDateInput}
            onChange={(e) => setStartDateInput(e.target.value)}
            onBlur={() => {
              const parsed = parseDateInput(startDateInput);
              if (parsed) setFilters((p) => ({ ...p, startDate: parsed }));
              else setStartDateInput(formatDateInput(filters.startDate));
            }}
          />
        </label>

        <label className="text-sm text-gray-700">
          תאריך סיום
          <input
            type="text"
            placeholder="DD/MM/YYYY"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={endDateInput}
            onChange={(e) => setEndDateInput(e.target.value)}
            onBlur={() => {
              const parsed = parseDateInput(endDateInput);
              if (parsed) setFilters((p) => ({ ...p, endDate: parsed }));
              else setEndDateInput(formatDateInput(filters.endDate));
            }}
          />
        </label>

        <label className="text-sm text-gray-700">
          מזהה מבנה
          <input
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={filters.buildingId}
            onChange={(e) => setFilters((p) => ({ ...p, buildingId: e.target.value }))}
            placeholder="אופציונלי"
          />
        </label>

        <label className="text-sm text-gray-700">
          מזהה מנהל
          <input
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={filters.managerId}
            onChange={(e) => setFilters((p) => ({ ...p, managerId: e.target.value }))}
            placeholder="אופציונלי"
          />
        </label>
      </section>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">{error}</div>}

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4"><div className="text-gray-500 text-sm">סה״כ פעילות</div><div className="text-2xl font-bold">{data.kpis?.total_active_tasks ?? 0}</div></div>
        <div className="bg-white rounded-xl border border-gray-100 p-4"><div className="text-gray-500 text-sm">באיחור</div><div className="text-2xl font-bold text-red-600">{data.kpis?.overdue_tasks ?? 0}</div></div>
        <div className="bg-white rounded-xl border border-gray-100 p-4"><div className="text-gray-500 text-sm">עמידה בזמנים</div><div className="text-2xl font-bold">{Math.round(Number(data.kpis?.on_time_percentage || 0))}%</div></div>
        <div className="bg-white rounded-xl border border-gray-100 p-4"><div className="text-gray-500 text-sm">זמן ביצוע ממוצע</div><div className="text-2xl font-bold">{Math.round(Number(data.kpis?.avg_work_duration_minutes || 0))} דק׳</div></div>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold">דירוג מנהלים</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-right px-4 py-3">מנהל</th>
                <th className="text-right px-4 py-3">סה״כ</th>
                <th className="text-right px-4 py-3">פתוחות</th>
                <th className="text-right px-4 py-3">הושלמו</th>
                <th className="text-right px-4 py-3">באיחור</th>
                <th className="text-right px-4 py-3">עמידה בזמנים</th>
              </tr>
            </thead>
            <tbody>
              {!loading && (data.manager_table || []).length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={6}>אין נתונים</td></tr>
              ) : (
                (data.manager_table || []).map((m, idx) => (
                  <tr key={`${m.employee_id || idx}`} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium">{m.manager_name || m.employee_name || '-'}</td>
                    <td className="px-4 py-3">{m.total_tasks ?? 0}</td>
                    <td className="px-4 py-3">{m.active_tasks ?? 0}</td>
                    <td className="px-4 py-3">{m.completed_tasks ?? 0}</td>
                    <td className="px-4 py-3 text-red-600">{m.overdue_tasks ?? 0}</td>
                    <td className="px-4 py-3">{Math.round(Number(m.on_time_percentage || 0))}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
