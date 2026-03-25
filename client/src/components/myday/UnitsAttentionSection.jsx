import { useEffect } from 'react';
import { useApp } from '../../context/AppContext';

const STATUS_CONFIG = {
  overdue: { label: 'באיחור', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  needs_inspection: { label: 'צריך בדיקה', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' }
};

export default function UnitsAttentionSection() {
  const { unitsNeedingAttention, fetchUnitsNeedingAttention } = useApp();

  useEffect(() => {
    fetchUnitsNeedingAttention();
  }, []);

  if (!unitsNeedingAttention || unitsNeedingAttention.length === 0) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-orange-600 font-bold text-sm">
          🔧 יחידות לטיפול ({unitsNeedingAttention.length})
        </span>
      </div>
      <div className="space-y-2">
        {unitsNeedingAttention.map(unit => {
          const config = STATUS_CONFIG[unit.status] || STATUS_CONFIG.needs_inspection;
          return (
            <div key={unit.id} className="bg-white rounded-lg shadow-sm px-3 py-2 flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                {config.label}
              </span>
              <div className="flex-1 text-right min-w-0">
                <div className="text-sm font-semibold truncate">{unit.name}</div>
                <div className="text-xs text-gray-500">
                  {unit.system_name && <span>{unit.system_name}</span>}
                  {unit.inspection_date && (
                    <span className="mr-2">
                      · בדיקה: {new Date(unit.inspection_date).toLocaleDateString('he-IL')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
