import { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../forms/datepicker-custom.css';

export default function HistoryFilters({ filters, employees, systems, locations, onFilterChange, onClear }) {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [tempFilters, setTempFilters] = useState({
    employeeId: '',
    systemId: '',
    locationId: ''
  });

  const formatDateToISO = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleApplyFilters = () => {
    // Apply all filters at once when "הצג" is clicked
    if (startDate) {
      onFilterChange('start', formatDateToISO(startDate));
    } else {
      onFilterChange('start', '');
    }

    if (endDate) {
      onFilterChange('end', formatDateToISO(endDate));
    } else {
      onFilterChange('end', '');
    }

    if (tempFilters.employeeId) {
      onFilterChange('employee', tempFilters.employeeId);
    } else {
      onFilterChange('employee', '');
    }

    if (tempFilters.systemId) {
      onFilterChange('system', tempFilters.systemId);
    } else {
      onFilterChange('system', '');
    }

    if (tempFilters.locationId) {
      onFilterChange('location', tempFilters.locationId);
    } else {
      onFilterChange('location', '');
    }
  };

  const handleClearAll = () => {
    setStartDate(null);
    setEndDate(null);
    setTempFilters({
      employeeId: '',
      systemId: '',
      locationId: ''
    });
    onClear();
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="font-semibold mb-4">סינון</h2>

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
