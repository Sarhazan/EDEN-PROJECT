import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FaCheckCircle, FaClock, FaExclamationTriangle, FaCheckDouble, FaCamera, FaTimes, FaPaperPlane, FaThumbsUp, FaListOl } from 'react-icons/fa';
import { API_URL } from '../config';
const DEFAULT_TASKS_PER_PAGE = 3;

const UI_TEXT = {
  he: {
    loadingTasks: 'טוען משימות...',
    errorTitle: 'שגיאה',
    ackSuccess: 'קבלת המשימות אושרה בהצלחה!',
    ackError: 'שגיאה באישור קבלת המשימות',
    taskUpdateError: 'שגיאה בעדכון המשימה',
    completionSent: 'המשימה נשלחה לאישור המנהל!',
    completionError: 'שגיאה בשליחת המשימה',
    pageTitle: 'משימות לביצוע',
    hello: 'שלום',
    waitingCount: 'יש לך {{count}} משימות ממתינות',
    ackPrompt: 'לחץ על הכפתור כדי לאשר קבלה ולראות את המשימות',
    ackBtn: 'קיבלתי',
    approving: 'מאשר...',
    queueLabel: 'מציג {{visible}} משימות | עוד {{queued}} בתור',
    completedCounter: '{{count}} משימות הושלמו/נשלחו לאישור',
    allDoneTitle: 'כל הכבוד! 🎉',
    allDoneSub: 'סיימת את כל המשימות',
    completeSectionTitle: 'השלמת משימה',
    imagesLabel: 'צלם תמונות (אופציונלי, עד {{max}})',
    addImage: 'הוסף תמונה',
    takeImage: 'צלם תמונה',
    noteLabel: 'הערה (אופציונלי)',
    notePlaceholder: 'הוסף הערה...',
    sendForApproval: 'שלח לאישור',
    sending: 'שולח...',
    cancel: 'ביטול',
    doneAndSend: 'סיימתי - שלח לאישור',
    footer: 'מערכת ניהול תחזוקה - Eden',
    status: { draft: 'חדש', sent: 'נשלח', received: 'התקבל', pending_approval: 'ממתין לאישור', completed: 'הושלם' },
    priority: { urgent: 'דחוף', normal: 'רגיל', optional: 'אופציונלי' }
  },
  en: {
    loadingTasks: 'Loading tasks...',
    errorTitle: 'Error',
    ackSuccess: 'Tasks received successfully!',
    ackError: 'Failed to confirm task receipt',
    taskUpdateError: 'Failed to update task',
    completionSent: 'Task sent to manager for approval!',
    completionError: 'Failed to send task',
    pageTitle: 'Tasks to Perform',
    hello: 'Hello',
    waitingCount: 'You have {{count}} pending tasks',
    ackPrompt: 'Tap the button to acknowledge and view tasks',
    ackBtn: 'Got it',
    approving: 'Confirming...',
    queueLabel: 'Showing {{visible}} tasks | {{queued}} in queue',
    completedCounter: '{{count}} tasks completed/sent for approval',
    allDoneTitle: 'Great job! ≡ƒמי',
    allDoneSub: 'You finished all tasks',
    completeSectionTitle: 'Complete Task',
    imagesLabel: 'Take photos (optional, up to {{max}})',
    addImage: 'Add photo',
    takeImage: 'Take photo',
    noteLabel: 'Note (optional)',
    notePlaceholder: 'Add a note...',
    sendForApproval: 'Send for approval',
    sending: 'Sending...',
    cancel: 'Cancel',
    doneAndSend: 'Done - send for approval',
    footer: 'Eden Maintenance Management',
    status: { draft: 'New', sent: 'Sent', received: 'Received', pending_approval: 'Pending approval', completed: 'Completed' },
    priority: { urgent: 'Urgent', normal: 'Normal', optional: 'Optional' }
  },
  ru: {
    loadingTasks: 'Загрузка задач...',
    errorTitle: 'Ошибка',
    ackSuccess: 'Задачи успешно получены!',
    ackError: 'Ошибка подтверждения получения задач',
    taskUpdateError: 'Ошибка обновления задачи',
    completionSent: 'Задача отправлена менеджеру на проверку!',
    completionError: 'Ошибка отправки задачи',
    pageTitle: 'Задачи для выполнения',
    hello: 'Привет',
    waitingCount: 'У вас {{count}} ожидающих задач',
    ackPrompt: 'Нажмите кнопку для подтверждения получения и просмотра задач',
    ackBtn: 'Принял',
    approving: 'Подтверждение...',
    queueLabel: 'Показано {{visible}} задач | ещё {{queued}} в очереди',
    completedCounter: '{{count}} задач выполнено/отправлено на проверку',
    allDoneTitle: 'Отличная работа! 🎉',
    allDoneSub: 'Вы выполнили все задачи',
    completeSectionTitle: 'Выполнение задачи',
    imagesLabel: 'Сделайте фото (необязательно, до {{max}})',
    addImage: 'Добавить фото',
    takeImage: 'Сделать фото',
    noteLabel: 'Примечание (необязательно)',
    notePlaceholder: 'Добавьте примечание...',
    sendForApproval: 'Отправить на проверку',
    sending: 'Отправка...',
    cancel: 'Отмена',
    doneAndSend: 'Готово — отправить на проверку',
    footer: 'Система управления Eden',
    status: { draft: 'Новая', sent: 'Отправлена', received: 'Получена', pending_approval: 'На проверке', completed: 'Выполнена' },
    priority: { urgent: 'Срочно', normal: 'Обычный', optional: 'Необязательный' }
  },
  ar: {
    loadingTasks: 'جارٍ تحميل المهام...',
    errorTitle: 'خطأ',
    ackSuccess: 'تم استلام المهام بنجاح!',
    ackError: 'فشل تأكيد استلام المهام',
    taskUpdateError: 'فشل تحديث المهمة',
    completionSent: 'تم إرسال المهمة للمدير للموافقة!',
    completionError: 'فشل إرسال المهمة',
    pageTitle: 'مهام للتنفيذ',
    hello: 'مرحباً',
    waitingCount: 'لديك {{count}} مهام معلقة',
    ackPrompt: 'اضغط الزر للتأكيد ومشاهدة المهام',
    ackBtn: 'استلمت',
    approving: 'جارٍ التأكيد...',
    queueLabel: 'عرض {{visible}} مهام | {{queued}} في الانتظار',
    completedCounter: '{{count}} مهام مكتملة/مُرسلة للموافقة',
    allDoneTitle: 'أحسنت! 🎉',
    allDoneSub: 'لقد أنجزت جميع المهام',
    completeSectionTitle: 'إتمام المهمة',
    imagesLabel: 'التقط صوراً (اختياري، حتى {{max}})',
    addImage: 'أضف صورة',
    takeImage: 'التقط صورة',
    noteLabel: 'ملاحظة (اختياري)',
    notePlaceholder: 'أضف ملاحظة...',
    sendForApproval: 'أرسل للموافقة',
    sending: 'جارٍ الإرسال...',
    cancel: 'إلغاء',
    doneAndSend: 'انتهيت — أرسل للموافقة',
    footer: 'نظام إدارة الصيانة Eden',
    status: { draft: 'جديدة', sent: 'مُرسلة', received: 'مُستلمة', pending_approval: 'بانتظار الموافقة', completed: 'مكتملة' },
    priority: { urgent: 'عاجل', normal: 'عادي', optional: 'اختياري' }
  },
  hi: {
    loadingTasks: 'कार्य लोड हो रहे हैं...',
    errorTitle: 'त्रुटि',
    ackSuccess: 'कार्य सफलतापूर्वक प्राप्त हुए!',
    ackError: 'कार्य प्राप्ति की पुष्टि में त्रुटि',
    taskUpdateError: 'कार्य अपडेट में त्रुटि',
    completionSent: 'कार्य प्रबंधक को अनुमोदन के लिए भेजा गया!',
    completionError: 'कार्य भेजने में त्रुटि',
    pageTitle: 'करने के लिए कार्य',
    hello: 'नमस्ते',
    waitingCount: 'आपके पास {{count}} लंबित कार्य हैं',
    ackPrompt: 'कार्य देखने के लिए बटन दबाएं',
    ackBtn: 'मिल गया',
    approving: 'पुष्टि हो रही है...',
    queueLabel: '{{visible}} कार्य दिख रहे हैं | {{queued}} प्रतीक्षा में',
    completedCounter: '{{count}} कार्य पूर्ण/अनुमोदन के लिए भेजे गए',
    allDoneTitle: 'शाबाश! 🎉',
    allDoneSub: 'आपने सभी कार्य पूरे किए',
    completeSectionTitle: 'कार्य पूर्ण करें',
    imagesLabel: 'फ़ोटो लें (वैकल्पिक, अधिकतम {{max}})',
    addImage: 'फ़ोटो जोड़ें',
    takeImage: 'फ़ोटो लें',
    noteLabel: 'नोट (वैकल्पिक)',
    notePlaceholder: 'नोट जोड़ें...',
    sendForApproval: 'अनुमोदन के लिए भेजें',
    sending: 'भेजा जा रहा है...',
    cancel: 'रद्द करें',
    doneAndSend: 'हो गया — अनुमोदन के लिए भेजें',
    footer: 'Eden रखरखाव प्रबंधन',
    status: { draft: 'नया', sent: 'भेजा', received: 'मिला', pending_approval: 'अनुमोदन प्रतीक्षित', completed: 'पूर्ण' },
    priority: { urgent: 'अत्यावश्यक', normal: 'सामान्य', optional: 'वैकल्पिक' }
  }
};
export default function TaskConfirmationPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [acknowledgedAt, setAcknowledgedAt] = useState(null);
  const [updatingTask, setUpdatingTask] = useState(null);
  const [acknowledging, setAcknowledging] = useState(false);

  // Task completion state
  const [completingTaskId, setCompletingTaskId] = useState(null);
  const [completionNote, setCompletionNote] = useState('');
  const [completionImages, setCompletionImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  const fileInputRef = useRef(null);
  const MAX_IMAGES = 5;

  // Pagination state
  const [tasksPerPage, setTasksPerPage] = useState(DEFAULT_TASKS_PER_PAGE);

  const lang = (employee?.language || 'he').toLowerCase();
  const locale = UI_TEXT[lang] || UI_TEXT.en;
  const t = (key, vars = {}) => {
    const value = key.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), locale) || key;
    if (typeof value !== 'string') return value;
    return Object.entries(vars).reduce((out, [k, v]) => out.replaceAll(`{{${k}}}`, String(v)), value);
  };

  useEffect(() => {
    fetchTasks();
    fetchTasksPerPageSetting();
  }, [token]);

  const fetchTasksPerPageSetting = async () => {
    try {
      const response = await axios.get(`${API_URL}/accounts/settings/tasks_per_employee_page`);
      if (response.data.value) {
        setTasksPerPage(parseInt(response.data.value, 10));
      }
    } catch (err) {
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/confirm/${token}`);

      if (response.data.success) {
        setEmployee(response.data.employee);
        setTasks(response.data.tasks);
        setIsAcknowledged(response.data.isAcknowledged);
        setAcknowledgedAt(response.data.acknowledgedAt);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      if (err.response?.status === 404) {
        setError(err.response?.data?.error || 'Token not found');
      } else if (err.response?.status === 410) {
        setError(err.response?.data?.error || 'Token expired');
      } else {
        setError(err.response?.data?.error || 'Failed loading tasks');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      setUpdatingTask(taskId);
      const response = await axios.put(
        `${API_URL}/confirm/${token}/task/${taskId}`,
        { status: newStatus }
      );

      if (response.data.success) {
        // Update local state
        setTasks(tasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        ));
      }
    } catch (err) {
      console.error('Error updating task:', err);
      alert(t('taskUpdateError'));
    } finally {
      setUpdatingTask(null);
    }
  };

  const handleAcknowledge = async () => {
    try {
      setAcknowledging(true);
      const response = await axios.post(`${API_URL}/confirm/${token}/acknowledge`);

      if (response.data.success) {
        setIsAcknowledged(true);
        setAcknowledgedAt(new Date().toISOString());
        // Refresh tasks to get updated statuses
        await fetchTasks();
        alert(t('ackSuccess'));
      }
    } catch (err) {
      console.error('Error acknowledging tasks:', err);
      alert(t('ackError'));
    } finally {
      setAcknowledging(false);
    }
  };

  // Open completion form for a task
  const openCompletionForm = (taskId) => {
    setCompletingTaskId(taskId);
    setCompletionNote('');
    setCompletionImages([]);
    setImagePreviews([]);
  };

  // Close completion form
  const closeCompletionForm = () => {
    setCompletingTaskId(null);
    setCompletionNote('');
    setCompletionImages([]);
    setImagePreviews([]);
  };

  // Handle image selection from camera or gallery
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && completionImages.length < MAX_IMAGES) {
      setCompletionImages(prev => [...prev, file]);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    }
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove selected image by index
  const removeImage = (index) => {
    setCompletionImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Submit task completion with images and note
  const handleSubmitCompletion = async () => {
    if (!completingTaskId) return;

    try {
      setSubmittingCompletion(true);

      const formData = new FormData();
      formData.append('taskId', completingTaskId);

      if (completionNote.trim()) {
        formData.append('note', completionNote.trim());
      }

      // Append all images
      completionImages.forEach((image) => {
        formData.append('images', image);
      });

      const response = await axios.post(
        `${API_URL}/confirm/${token}/complete`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        // Update local task state to pending_approval
        setTasks(tasks.map(task =>
          task.id === completingTaskId
            ? { ...task, status: 'pending_approval', completion_note: completionNote.trim() || null }
            : task
        ));

        closeCompletionForm();
        alert(t('completionSent'));
      }
    } catch (err) {
      console.error('Error completing task:', err);
      alert(t('completionError'));
    } finally {
      setSubmittingCompletion(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'optional':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'urgent':
        return t('priority.urgent');
      case 'normal':
        return t('priority.normal');
      case 'optional':
        return t('priority.optional');
      default:
        return priority;
    }
  };

  const getStatusLabel = (status) => {
    return t(`status.${status}`) || status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending_approval':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loadingTasks')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <FaExclamationTriangle className="text-red-500 text-6xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{t('errorTitle')}</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate visible tasks (only pending ones, up to tasksPerPage)
  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'pending_approval');
  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'pending_approval').length;
  const visibleTasks = pendingTasks.slice(0, tasksPerPage);
  const queuedCount = pendingTasks.length - visibleTasks.length;

  return (
    <div dir={['he','ar'].includes(lang) ? 'rtl' : 'ltr'} className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {t('pageTitle')}
            </h1>
            {employee && (
              <p className="text-xl text-gray-600">
                {t('hello')} {employee.name}
              </p>
            )}
          </div>
        </div>

        {/* "╫º╫ש╫ס╫£╫¬╫ש" Button - Shows at TOP when not acknowledged */}
        {!isAcknowledged && (
          <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
            <div className="text-center mb-6">
              <p className="text-2xl font-bold text-gray-800 mb-2">
                {t('waitingCount', { count: tasks.length })}
              </p>
              <p className="text-gray-600">
                {t('ackPrompt')}
              </p>
            </div>
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-6 rounded-xl flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-2xl shadow-lg active:scale-95"
            >
              <FaThumbsUp className="text-4xl" />
              <span>{acknowledging ? t('approving') : t('ackBtn')}</span>
            </button>
          </div>
        )}

        {/* Tasks List - Only shown AFTER acknowledging */}
        {isAcknowledged && (
          <>
            {/* Queue indicator */}
            {queuedCount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-center gap-3">
                <FaListOl className="text-blue-600 text-xl" />
                <span className="text-blue-800 font-medium">
                  {t('queueLabel', { visible: visibleTasks.length, queued: queuedCount })}
                </span>
              </div>
            )}

            {/* Completed tasks counter */}
            {completedCount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center justify-center gap-2">
                <FaCheckDouble className="text-green-600" />
                <span className="text-green-700 font-medium">
                  {t('completedCounter', { count: completedCount })}
                </span>
              </div>
            )}

            {/* All tasks done - celebration */}
            {pendingTasks.length === 0 && completedCount > 0 && (
              <div className="bg-green-50 border border-green-300 rounded-lg p-8 mb-6 text-center">
                <FaCheckDouble className="text-green-600 text-5xl mx-auto mb-4" />
                <p className="text-green-800 text-2xl font-bold mb-2">
                  {t('allDoneTitle')}
                </p>
                <p className="text-green-700 text-lg">
                  {t('allDoneSub')}
                </p>
              </div>
            )}

            {/* Task cards - ONLY pending tasks, up to tasksPerPage */}
            <div className="space-y-4 mb-6">
              {visibleTasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-lg shadow-md p-6 border-r-4 transition-all ${
                task.priority === 'urgent'
                  ? 'border-red-500'
                  : task.priority === 'normal'
                  ? 'border-blue-500'
                  : 'border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Task Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">
                      {task.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-gray-600 mb-3">
                      {task.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-sm mb-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <FaClock />
                      <span>{task.start_time}</span>
                    </div>
                    {task.system_name && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                        {task.system_name}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded ${getStatusColor(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                  </div>

                  {/* Completion form - shown when completing this task */}
                  {completingTaskId === task.id && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3">{t('completeSectionTitle')}</h4>

                      {/* Camera/Image input */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('imagesLabel', { max: MAX_IMAGES })}
                        </label>

                        {/* Image previews grid */}
                        {imagePreviews.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {imagePreviews.map((preview, index) => (
                              <div key={index} className="relative inline-block">
                                <img
                                  src={preview}
                                  alt={`╫¬╫₧╫ץ╫á╫פ ${index + 1}`}
                                  className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
                                />
                                <button
                                  onClick={() => removeImage(index)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <FaTimes size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Camera button - always visible unless max reached */}
                        {completionImages.length < MAX_IMAGES && (
                          <div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleImageSelect}
                              className="hidden"
                              id={`camera-input-${task.id}`}
                            />
                            <label
                              htmlFor={`camera-input-${task.id}`}
                              className="inline-flex items-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
                            >
                              <FaCamera size={20} />
                              <span>{imagePreviews.length > 0 ? t('addImage') : t('takeImage')}</span>
                            </label>
                            {imagePreviews.length > 0 && (
                              <span className="mr-2 text-sm text-gray-500">
                                ({imagePreviews.length}/{MAX_IMAGES})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Note input */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('noteLabel')}
                        </label>
                        <textarea
                          value={completionNote}
                          onChange={(e) => setCompletionNote(e.target.value)}
                          placeholder={t('notePlaceholder')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          rows={3}
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={handleSubmitCompletion}
                          disabled={submittingCompletion}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <FaPaperPlane />
                          <span>{submittingCompletion ? t('sending') : t('sendForApproval')}</span>
                        </button>
                        <button
                          onClick={closeCompletionForm}
                          disabled={submittingCompletion}
                          className="px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold rounded-lg transition-all disabled:opacity-50"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Complete task button */}
                  {completingTaskId !== task.id && (
                    <button
                      onClick={() => openCompletionForm(task.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <FaCheckCircle />
                      <span>{t('doneAndSend')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>{t('footer')}</p>
        </div>
      </div>
    </div>
  );
}
