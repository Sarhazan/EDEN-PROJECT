import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './datepicker-custom.css';

export default function DateChip({ selectedDate, onChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const chipRef = useRef(null);
  const pickerRef = useRef(null);

  // Format date label
  const formatDateChip = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) return 'היום';
    if (compareDate.getTime() === tomorrow.getTime()) return 'מחר';

    // Format as dd/MM
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        chipRef.current &&
        !chipRef.current.contains(event.target)
      ) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  useEffect(() => {
    if (!showPicker || !chipRef.current) return;

    const updatePosition = () => {
      const rect = chipRef.current.getBoundingClientRect();
      setPickerPosition({
        top: rect.bottom + 6,
        left: rect.left
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showPicker]);

  const handleDateChange = (date) => {
    onChange(date);
    setShowPicker(false);
  };

  return (
    <div className="relative">
      <button
        ref={chipRef}
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:bg-indigo-100 transition-colors"
      >
        {formatDateChip(selectedDate)}
      </button>

      {showPicker && createPortal(
        <div
          ref={pickerRef}
          className="fixed z-[10000]"
          dir="rtl"
          style={{ top: `${pickerPosition.top}px`, left: `${pickerPosition.left}px` }}
        >
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            inline
            minDate={new Date()}
            calendarClassName="shadow-lg border border-gray-200 rounded-lg"
          />
        </div>,
        document.body
      )}
    </div>
  );
}
