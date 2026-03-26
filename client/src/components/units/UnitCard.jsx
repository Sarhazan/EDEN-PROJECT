import { useState } from 'react';
import { FaEdit, FaTrash, FaFile, FaTimes, FaSync } from 'react-icons/fa';
import { BACKEND_URL } from '../../config';

const FREQ_LABEL = { daily:'יומי', weekly:'שבועי', monthly:'חודשי', annual:'שנתי' };

const STATUS_CONFIG = {
  ok: { label: 'תקין', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  needs_inspection: { label: 'צריך בדיקה', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  overdue: { label: 'באיחור', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }
};

export default function UnitCard({ unit, onEdit, onDelete, onDeleteFile }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const statusConfig = STATUS_CONFIG[unit.status] || STATUS_CONFIG.ok;

  const handleDelete = async () => {
    if (!confirm(`האם למחוק את היחידה "${unit.name}"?`)) return;
    setIsDeleting(true);
    try {
      await onDelete(unit.id);
    } catch (error) {
      alert('שגיאה: ' + error.message);
      setIsDeleting(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('האם למחוק קובץ זה?')) return;
    try {
      await onDeleteFile(unit.id, fileId);
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-lg">{unit.name}</h4>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
              {statusConfig.label}
            </span>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(unit)}
            className="text-blue-500 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50"
            title="ערוך"
          >
            <FaEdit size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-600 p-1.5 rounded hover:bg-red-50 disabled:opacity-50"
            title="מחק"
          >
            <FaTrash size={14} />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="text-sm text-gray-600 space-y-1">
        {unit.serial_number && (
          <p className="font-mono text-xs bg-gray-100 inline-block px-2 py-0.5 rounded text-gray-700">
            מ״ס: {unit.serial_number}
          </p>
        )}
        {unit.recurring_enabled ? (
          <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
            <FaSync size={10} />
            <span>בדיקה כל {unit.recurring_interval > 1 ? unit.recurring_interval + ' ' : ''}{FREQ_LABEL[unit.recurring_frequency] || unit.recurring_frequency}</span>
          </div>
        ) : null}
        {unit.inspection_date && (
          <p className="text-gray-500">בדיקה אחרונה: {new Date(unit.inspection_date + 'T00:00:00').toLocaleDateString('he-IL')}</p>
        )}
        {unit.next_inspection_date && unit.recurring_enabled && (
          <p className="font-medium">בדיקה הבאה: {new Date(unit.next_inspection_date + 'T00:00:00').toLocaleDateString('he-IL')}</p>
        )}
        {unit.recurring_enabled && unit.alert_days && (
          <p>התראה: {unit.alert_days} ימים לפני</p>
        )}
        {unit.supplier_name && (
          <p>ספק: {unit.supplier_name}</p>
        )}
        {unit.building_name && (
          <p>מבנה: {unit.building_name}</p>
        )}
        {unit.notes && (
          <p className="text-gray-500 italic">{unit.notes}</p>
        )}
      </div>

      {/* Files */}
      {unit.files && unit.files.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">קבצים:</p>
          <div className="flex flex-wrap gap-2">
            {unit.files.map(file => (
              <div key={file.id} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded px-2 py-1 text-xs">
                <FaFile className="text-gray-400" size={10} />
                <a
                  href={`${BACKEND_URL}${file.file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline max-w-[150px] truncate"
                  title={file.filename}
                >
                  {file.filename}
                </a>
                <button
                  onClick={() => handleDeleteFile(file.id)}
                  className="text-red-400 hover:text-red-600 p-0.5"
                  title="מחק קובץ"
                >
                  <FaTimes size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
