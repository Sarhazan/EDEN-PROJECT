import { useEffect, useMemo, useState } from 'react';
import { FaChartLine, FaCheckCircle, FaClock, FaExclamationTriangle, FaUsers } from 'react-icons/fa';
import { useApp } from '../context/AppContext';

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3002/api';

function formatDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatDateDisplay(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('he-IL');
}

function formatPercent(value) {
  const safe = Number(value || 0);
  return `${Math.round(safe)}%`;
}

function KPI({ title, value, subtitle, icon: Icon, colorClass = 'text-indigo-600' }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center ${colorClass}`}>
          <Icon className="text-lg" />
        </div>
      </div>
    </div>
  );
}

export default function HQDashboardPage() {
  const { buildings, employees } = useApp();

  const now = useMemo(() => new Date(), []);
  const [filters, setFilters] = useState({
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
    buildingId: '',
    managerId: ''
  });

  const [dashboardData, setDashboardData] = useState({
    kpis: {
      totalTasks: 0,
      completedTasks: 0,
      lateTasks: 0,
      onTimeRate: 0,
      activeManagers: 0
    },
    managers: [],
    drilldown: []
  });
  const [selectedManagerId, setSelectedManagerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const managerOptions = useMemo(() => {
    const fromApi = dashboardData.managers
      .filter((manager) => manager?.managerId)
      .map((manager) => ({ id: manager.managerId, name: manager.managerName }));

    if (fromApi.length > 0) {
      return fromApi;
    }

    return (employees || []).map((employee) => ({ id: employee.id, name: employee.name }));
  }, [dashboardData.managers, employees]);

  useEffect(() => {
    const controller = new AbortController();

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();
        if (filters.startDate) params.set('startDate', filters.startDate);
        if (filters.endDate) params.set('endDate', filters.endDate);
        if (filters.buildingId) params.set('buildingId', filters.buildingId);
        if (filters.managerId) params.set('managerId', filters.managerId);

        const response = await fetch(`${API_URL}/history/hq-dashboard?${params.toString()}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('לא ניתן לטעון את נתוני דשבורד HQ');
        }

        const payload = await response.json();

        const normalizedManagers = Array.isArray(payload.managers)
          ? payload.managers.map((item) => ({
              managerId: item.managerId ?? item.employee_id ?? item.employeeId ?? item.id,
              managerName: item.managerName ?? item.employee_name ?? item.employeeName ?? item.name ?? 'ללא שם',
              buildingName: item.buildingName ?? item.building_name ?? item.building ?? '-',
              totalTasks: Number(item.totalTasks ?? item.total_tasks ?? 0),
              completedTasks: Number(item.completedTasks ?? item.completed_tasks ?? 0),
              lateTasks: Number(item.lateTasks ?? item.late_tasks ?? 0),
              onTimeRate: Number(item.onTimeRate ?? item.on_time_rate ?? item.on_time_percentage ?? 0)
            }))
          : [];

        const managerIdForDrilldown = filters.managerId;
        let drilldown = [];
        if (Array.isArray(payload.drilldown)) {
          drilldown = payload.drilldown;
        } else if (payload.drilldownByManager && managerIdForDrilldown) {
          drilldown = payload.drilldownByManager[managerIdForDrilldown] || [];
        }

        const nextData = {
          kpis: {
            totalTasks: Number(payload.kpis?.totalTasks ?? payload.kpis?.total_tasks ?? 0),
            completedTasks: Number(payload.kpis?.completedTasks ?? payload.kpis?.completed_tasks ?? 0),
            lateTasks: Number(payload.kpis?.lateTasks ?? payload.kpis?.late_tasks ?? 0),
            onTimeRate: Number(payload.kpis?.onTimeRate ?? payload.kpis?.on_time_rate ?? payload.kpis?.on_time_percentage ?? 0),
            activeManagers: Number(payload.kpis?.activeManagers ?? payload.kpis?.active_managers ?? normalizedManagers.length)
          },
          managers: normalizedManagers,
          drilldown: Array.isArray(drilldown) ? drilldown : []
        };

        setDashboardData(nextData);

        if (filters.managerId) {
          setSelectedManagerId(Number(filters.managerId));
        } else if (!selectedManagerId && normalizedManagers.length > 0) {
          setSelectedManagerId(normalizedManagers[0].managerId);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'שגיאה בטעינת דשבורד HQ');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();

    return () => controller.abort();
  }, [filters.startDate, filters.endDate, filters.buildingId, filters.managerId]);

  const selectedManager = dashboardData.managers.find((manager) => Number(manager.managerId) === Number(selectedManagerId));

  const effectiveDrilldown = useMemo(() => {
    if (filters.managerId && Number(filters.managerId) !== Number(selectedManagerId)) {
      return dashboardData.drilldown;
    }

    if (dashboardData.drilldown.length > 0) {
      return dashboardData.drilldown;
    }

    return [];
  }, [dashboardData.drilldown, filters.managerId, selectedManagerId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">דשבורד HQ</h1>
          <p className="text-gray-600 mt-1">מעקב ביצועי מנהלים לפי טווח זמן ומבנים</p>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-lg font-semibold mb-4">פילטרים</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-sm text-gray-700">
            תאריך התחלה
            <input
              type="date"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              value={formatDateInput(filters.startDate)}
              onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </label>

          <label className="text-sm text-gray-700">
            תאריך סיום
            <input
              type="date"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              value={formatDateInput(filters.endDate)}
              onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </label>

          <label className="text-sm text-gray-700">
            מבנה
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              value={filters.buildingId}
              onChange={(e) => setFilters((prev) => ({ ...prev, buildingId: e.target.value }))}
            >
              <option value="">כל המבנים</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>{building.name}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-700">
            מנהל
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              value={filters.managerId}
              onChange={(e) => {
                const nextManager = e.target.value;
                setFilters((prev) => ({ ...prev, managerId: nextManager }));
                setSelectedManagerId(nextManager ? Number(nextManager) : null);
              }}
            >
              <option value="">כל המנהלים</option>
              {managerOptions.map((manager) => (
                <option key={manager.id} value={manager.id}>{manager.name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <KPI title="סה״כ משימות" value={dashboardData.kpis.totalTasks} icon={FaChartLine} />
        <KPI title="משימות שהושלמו" value={dashboardData.kpis.completedTasks} icon={FaCheckCircle} colorClass="text-emerald-600" />
        <KPI title="משימות באיחור" value={dashboardData.kpis.lateTasks} icon={FaExclamationTriangle} colorClass="text-red-600" />
        <KPI title="אחוז עמידה בזמנים" value={formatPercent(dashboardData.kpis.onTimeRate)} icon={FaClock} colorClass="text-amber-600" />
        <KPI title="מנהלים פעילים" value={dashboardData.kpis.activeManagers} icon={FaUsers} colorClass="text-blue-600" />
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold">ביצועי מנהלים</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-right px-4 py-3 font-semibold">מנהל</th>
                <th className="text-right px-4 py-3 font-semibold">מבנה</th>
                <th className="text-right px-4 py-3 font-semibold">סה״כ</th>
                <th className="text-right px-4 py-3 font-semibold">הושלמו</th>
                <th className="text-right px-4 py-3 font-semibold">באיחור</th>
                <th className="text-right px-4 py-3 font-semibold">עמידה בזמנים</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.managers.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">אין נתונים לתצוגה בטווח שנבחר</td>
                </tr>
              ) : (
                dashboardData.managers.map((manager) => {
                  const isSelected = Number(manager.managerId) === Number(selectedManagerId);

                  return (
                    <tr
                      key={`${manager.managerId}-${manager.buildingName}`}
                      className={`border-t border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                      onClick={() => {
                        setSelectedManagerId(manager.managerId);
                        setFilters((prev) => ({ ...prev, managerId: String(manager.managerId) }));
                      }}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{manager.managerName}</td>
                      <td className="px-4 py-3 text-gray-700">{manager.buildingName}</td>
                      <td className="px-4 py-3">{manager.totalTasks}</td>
                      <td className="px-4 py-3 text-emerald-700">{manager.completedTasks}</td>
                      <td className="px-4 py-3 text-red-600">{manager.lateTasks}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700 font-semibold">
                          {formatPercent(manager.onTimeRate)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold">דריל-דאון מנהל</h2>
          <span className="text-sm text-gray-500">
            {selectedManager ? `מציג עבור: ${selectedManager.managerName}` : 'בחר מנהל מהטבלה'}
          </span>
        </div>

        {loading ? (
          <div className="text-gray-500 py-6">טוען נתונים...</div>
        ) : effectiveDrilldown.length === 0 ? (
          <div className="text-gray-500 py-6">אין פירוט למשימות עבור המנהל הנבחר</div>
        ) : (
          <ul className="space-y-2">
            {effectiveDrilldown.map((item, index) => (
              <li key={`${item.taskId ?? item.id ?? index}`} className="border border-gray-100 rounded-lg p-3 bg-gray-50/60">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{item.title ?? item.taskTitle ?? 'משימה ללא כותרת'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.systemName ?? item.system_name ?? 'ללא מערכת'} • {item.locationName ?? item.location_name ?? 'ללא מיקום'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-600 text-left">
                    <div>סטטוס: {item.status === 'completed' ? 'הושלם' : (item.status || '-')}</div>
                    <div>סיום: {formatDateDisplay(item.completedAt ?? item.completed_at)}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
