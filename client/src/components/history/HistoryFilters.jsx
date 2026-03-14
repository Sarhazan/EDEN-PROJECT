import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../forms/datepicker-custom.css';

function parseDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function HistoryFilters({ filters, employees, systems, locations, onFilterChange, onApplyFilters, onClear }) {
  const [startDate, setStartDate] = useState(() => parseDate(filters.startDate));
  const [endDate, setEndDate] = useState(() => parseDate(filters.endDate));
  const [tempSearch, setTempSearch] = useState(filters.search || '');
  const [tempFilters, setTempFilters] = useState({
    employeeId: filters.employeeId || '',
    systemId: filters.systemId || '',
    locationId: filters.locationId || '',
  });

  // Sync local state when filters prop changes (e.g. after clearFilters)
  useEffect(() => {
    setStartDate(parseDate(filters.startDate));
    setEndDate(parseDate(filters.endDate));
    setTempSearch(filters.search || '');
    setTempFilters({
      employeeId: filters.employeeId || '',
      systemId: filters.systemId || '',
      locationId: filters.locationId || '',
    });
  }, [filters.startDate, filters.endDate, filters.search, filters.employeeId, filters.systemId, filters.locationId]);

  const formatDateToISO = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleApplyFilters = () => {
    onApplyFilters({
      start: startDate ? formatDateToISO(startDate) : '',
      end: endDate ? formatDateToISO(endDate) : '',
      employee: tempFilters.employeeId || '',
      system: tempFilters.systemId || '',
      location: tempFilters.locationId || '',
      search: tempSearch.trim(),
    });
  };

  // Apply search on Enter key
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleApplyFilters();
  };

  const handleClearAll = () => {
    onClear(); // resets to today in the hook; useEffect will sync local state
  };

  const hasDateRange = !!(startDate || endDate);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="font-semibold mb-4">סינון</h2>

      {/* שדה חיפוש חופשי */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          חיפוש משימה
          {!hasDateRange && (
            <span className="text-xs text-gray-400 mr-2">(מחפש בכל ההיסטוריה)</span>
          )}
        </label>
        <input
          type="text"
          value={tempSearch}
          onChange={(e) => setTempSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="חיפוש לפי שם משימה..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* שורה ראשונה: תאריכים וכפתורים */}
      <div className="flex flex-wrap gap-3 items-end mb-4">
        {/* Start Date */}
        <div className="w-[200px]">
          <label className="block text-sm font-medium mb-2">מתאריך</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            dateFormat="dd/MM/yyyy"
            placeholderText="בחר תאריך התחלה"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            maxDate={endDate || new Date()}
          />
        </div>

        {/* End Date */}
        <div className="w-[200px]">
          <label className="block text-sm font-medium mb-2">עד תאריך</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            dateFormat="dd/MM/yyyy"
            placeholderText="בחר תאריך סיום"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            minDate={startDate}
            maxDate={new Date()}
          />
        </div>

        {/* Buttons */}
        <button
          onClick={handleApplyFilters}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium whitespace-nowrap"
        >
          הצג
        </button>
        <button
          onClick={handleClearAll}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline whitespace-nowrap"
        >
          נקה הכל
        </button>
      </div>

      {/* שורה שנייה: פילטרים */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Employee Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">עובד</label>
          <select
            value={tempFilters.employeeId}
            onChange={(e) => setTempFilters(prev => ({ ...prev, employeeId: e.target.value }))}
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
            value={tempFilters.systemId}
            onChange={(e) => setTempFilters(prev => ({ ...prev, systemId: e.target.value }))}
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
            value={tempFilters.locationId}
            onChange={(e) => setTempFilters(prev => ({ ...prev, locationId: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">כל המיקומים</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
