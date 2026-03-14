import { useState } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import Modal from '../shared/Modal';
import { BACKEND_URL } from '../../config';
import { LoadingSection } from '../ui/Spinner';

export default function HistoryTable({ tasks, loading }) {
  const [lightboxImage, setLightboxImage] = useState(null);

  const formatTs = (value) => {
    if (!value) return '—';
    try {
      return format(new Date(value), 'dd/MM HH:mm', { locale: he });
    } catch {
      return '—';
    }
  };

  const buildStatusTimeline = (task) => {
    const steps = [
      { key: 'sent', label: 'נשלחה', ts: task.sent_at, done: !!task.sent_at },
      { key: 'received', label: 'התקבלה', ts: task.acknowledged_at, done: !!task.acknowledged_at },
    ];

    const hasApprovalFlow = !!task.approval_requested_at || !!task.approved_at;
    if (hasApprovalFlow) {
      steps.push({
        key: 'approval_requested',
        label: 'נשלחה לאישור',
        ts: task.approval_requested_at,
        done: !!task.approval_requested_at,
      });
      steps.push({
        key: 'approved',
        label: 'אושרה',
        ts: task.approved_at,
        done: !!task.approved_at,
      });
    }

    steps.push({ key: 'completed', label: 'בוצעה', ts: task.completed_at, done: !!task.completed_at });
    return steps.filter((s) => s.done || s.key === 'completed');
  };

  if (loading) {
    return <LoadingSection text="טוען היסטוריה..." />;
  }

  if (tasks.length === 0) {
    return <div className="p-8 text-center text-gray-500">לא נמצאו משימות</div>;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow divide-y">
        {tasks.map((task) => (
          <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{task.title}</h3>
                <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-2">
                  <span>עובד: {task.employee_name || 'לא משוייך'}</span>
                  <span>•</span>
                  <span>מערכת: {task.system_name || 'כללי'}</span>
                  {task.location_name && (
                    <>
                      <span>•</span>
                      <span>מיקום: {task.location_name}</span>
                    </>
                  )}
                </div>
                {task.description && (
                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                )}
                {task.completion_note && (
                  <div className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                    {task.original_language && task.original_language !== 'he' && (
                      <div className="mb-1 text-xs text-gray-500 flex items-center gap-1">
                        {task.original_language === 'en' && '🇬🇧'}
                        {task.original_language === 'ru' && '🇷🇺'}
                        {task.original_language === 'ar' && '🇸🇦'}
                        <span>
                          מתורגם מ{task.original_language === 'en' ? 'אנגלית' : task.original_language === 'ru' ? 'רוסית' : 'ערבית'}
                        </span>
                      </div>
                    )}
                    <p><strong>הערה:</strong> {task.completion_note}</p>
                  </div>
                )}
                {task.attachments && task.attachments.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-500 mb-1">תמונות:</p>
                    <div className="flex gap-2 flex-wrap">
                      {task.attachments.map((attachment) => (
                        <img
                          key={attachment.id}
                          src={`${BACKEND_URL}${attachment.file_path}`}
                          alt="תמונה"
                          className="h-16 w-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setLightboxImage(`${BACKEND_URL}${attachment.file_path}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-left mr-4 min-w-[300px]">
                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-2 space-y-1.5">
                  {buildStatusTimeline(task).map((step) => (
                    <div key={`${task.id}-${step.key}`} className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-4 h-4 rounded border text-[10px] font-bold ${step.done ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-white border-gray-300 text-gray-400'}`}>
                        {step.done ? '✓' : ''}
                      </span>
                      <span className="font-medium">{step.label}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">{formatTs(step.ts)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  בוצע ע״י: <span className="font-medium">{task.employee_name || '—'}</span>
                  {task.manager_name ? <> • אושר ע״י מנהל: <span className="font-medium">{task.manager_name}</span></> : null}
                </div>
                {task.time_delta_minutes !== null && (
                  <span className={`inline-block mt-1 text-sm font-medium ${
                    task.time_delta_minutes > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {task.time_delta_text}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Image Lightbox Modal */}
      <Modal
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        title="תמונה"
      >
        <div className="flex justify-center items-center">
          <img
            src={lightboxImage}
            alt="תמונה מוגדלת"
            className="max-w-full max-h-[80vh] object-contain"
          />
        </div>
      </Modal>
    </>
  );
}
