import { useState, useRef, useEffect, useCallback } from 'react';

const TIME_OPTIONS = Array.from({ length: 24 * 4 }).map((_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

/**
 * Custom time picker that always opens downward and scrolls to the selected value.
 * Replaces native <select> for time fields.
 */
export default function TimePicker({ value, onChange, className = '', disabled = false, placeholder = '--:--' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const selectedRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Scroll to selected item when opening
  useEffect(() => {
    if (open && selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({ block: 'center' });
    }
  }, [open]);

  const handleSelect = useCallback((time) => {
    onChange(time);
    setOpen(false);
  }, [onChange]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right bg-white flex items-center justify-between gap-2 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || placeholder}</span>
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown — always below, fixed max-height with scroll */}
      {open && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto"
          dir="ltr"
        >
          {TIME_OPTIONS.map(time => (
            <div
              key={time}
              ref={time === value ? selectedRef : null}
              onClick={() => handleSelect(time)}
              className={`px-4 py-2 text-sm cursor-pointer text-center transition-colors
                ${time === value
                  ? 'bg-gray-900 text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              {time}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
