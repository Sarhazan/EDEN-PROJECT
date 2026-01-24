import { useState } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import Modal from '../shared/Modal';

export default function HistoryTable({ tasks, loading }) {
  const [lightboxImage, setLightboxImage] = useState(null);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">טוען...</div>;
  }

  if (tasks.length === 0) {
    return <div className="p-8 text-center text-gray-500">לא נמצאו משימות</div>;
  }

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
                  <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                    <strong>הערה:</strong> {task.completion_note}
                  </p>
                )}
                {task.attachments && task.attachments.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-500 mb-1">תמונות:</p>
                    <div className="flex gap-2 flex-wrap">
                      {task.attachments.map((attachment) => (
                        <img
                          key={attachment.id}
                          src={`${API_URL}/${attachment.file_path}`}
                          alt="תמונה"
                          className="h-16 w-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setLightboxImage(`${API_URL}/${attachment.file_path}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-left mr-4">
                <p className="text-sm text-gray-600 mb-1">
                  {format(new Date(task.completed_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                </p>
                {task.time_delta_minutes !== null && (
                  <span className={`text-sm font-medium ${
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
