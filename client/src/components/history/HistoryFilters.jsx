import Datepicker from 'react-tailwindcss-datepicker';

export default function HistoryFilters({ filters, employees, systems, locations, onFilterChange, onClear }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="font-semibold mb-4">סינון</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Date Range Picker */}
        <div>
          <label className="block text-sm font-medium mb-2">טווח תאריכים</label>
          <Datepicker
            value={{
              startDate: filters.startDate,
              endDate: filters.endDate
            }}
            onChange={(newValue) => {
              onFilterChange('start', newValue?.startDate || '');
              onFilterChange('end', newValue?.endDate || '');
            }}
            displayFormat="DD/MM/YYYY"
            i18n="he"
            placeholder="בחר טווח תאריכים"
            showShortcuts={true}
            configs={{
              shortcuts: {
                today: 'היום',
                yesterday: 'אתמול',
                past: (period) => `${period} ימים אחורה`,
                currentMonth: 'החודש',
                pastMonth: 'חודש שעבר'
              }
            }}
          />
        </div>

        {/* Employee Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">עובד</label>
          <select
            value={filters.employeeId}
            onChange={(e) => onFilterChange('employee', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">כל העובדים</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        {/* System Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">מערכת</label>
          <select
            value={filters.systemId}
            onChange={(e) => onFilterChange('system', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">כל המערכות</option>
            {systems.map(sys => (
              <option key={sys.id} value={sys.id}>{sys.name}</option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">מיקום</label>
          <select
            value={filters.locationId}
            onChange={(e) => onFilterChange('location', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">כל המיקומים</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={onClear}
        className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
      >
        נקה סינון
      </button>
    </div>
  );
}
