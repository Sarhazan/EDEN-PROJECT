import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FaCheckCircle, FaClock, FaExclamationTriangle, FaCheckDouble, FaCamera, FaTimes, FaPaperPlane } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

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
  const [completionImage, setCompletionImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTasks();
  }, [token]);

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
        setError('קוד אימות לא נמצא');
      } else if (err.response?.status === 410) {
        setError('קוד האימות פג תוקף');
      } else {
        setError(err.response?.data?.error || 'שגיאה בטעינת המשימות');
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
      alert(err.response?.data?.error || 'שגיאה בעדכון המשימה');
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
        alert('קבלת המשימות אושרה בהצלחה!');
      }
    } catch (err) {
      console.error('Error acknowledging tasks:', err);
      alert(err.response?.data?.error || 'שגיאה באישור קבלת המשימות');
    } finally {
      setAcknowledging(false);
    }
  };

  // Open completion form for a task
  const openCompletionForm = (taskId) => {
    setCompletingTaskId(taskId);
    setCompletionNote('');
    setCompletionImage(null);
    setImagePreview(null);
  };

  // Close completion form
  const closeCompletionForm = () => {
    setCompletingTaskId(null);
    setCompletionNote('');
    setCompletionImage(null);
    setImagePreview(null);
  };

  // Handle image selection from camera or gallery
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCompletionImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setCompletionImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit task completion with image and note
  const handleSubmitCompletion = async () => {
    if (!completingTaskId) return;

    try {
      setSubmittingCompletion(true);

      const formData = new FormData();
      formData.append('taskId', completingTaskId);

      if (completionNote.trim()) {
        formData.append('note', completionNote.trim());
      }

      if (completionImage) {
        formData.append('image', completionImage);
      }

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
        alert('המשימה נשלחה לאישור המנהל!');
      }
    } catch (err) {
      console.error('Error completing task:', err);
      alert(err.response?.data?.error || 'שגיאה בשליחת המשימה');
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
        return 'דחוף';
      case 'normal':
        return 'רגיל';
      case 'optional':
        return 'אופציונלי';
      default:
        return priority;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft':
        return 'חדש';
      case 'sent':
        return 'נשלח';
      case 'received':
        return 'התקבל';
      case 'in_progress':
        return 'בביצוע';
      case 'pending_approval':
        return 'ממתין לאישור';
      case 'completed':
        return 'הושלם';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending_approval':
        return 'bg-orange-100 text-orange-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">טוען משימות...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <FaExclamationTriangle className="text-red-500 text-6xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">שגיאה</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              משימות לביצוע
            </h1>
            {employee && (
              <p className="text-xl text-gray-600">
                שלום {employee.name}
              </p>
            )}
            {isAcknowledged && (
              <div className="mt-4 bg-green-100 border border-green-300 rounded-lg p-3 flex items-center justify-center gap-2">
                <FaCheckDouble className="text-green-600" />
                <span className="text-green-800 font-medium">
                  קבלת המשימות אושרה ב-{new Date(acknowledgedAt).toLocaleString('he-IL')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4 mb-6">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-lg shadow-md p-6 border-r-4 transition-all ${
                task.status === 'completed' || task.status === 'pending_approval'
                  ? 'border-green-500 opacity-75'
                  : task.priority === 'urgent'
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
                    <h3 className={`text-lg font-bold ${task.status === 'completed' || task.status === 'pending_approval' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {task.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  </div>

                  {task.description && (
                    <p className={`text-gray-600 mb-3 ${task.status === 'completed' || task.status === 'pending_approval' ? 'line-through' : ''}`}>
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
                      <h4 className="font-semibold text-gray-800 mb-3">השלמת משימה</h4>

                      {/* Camera/Image input */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          צלם תמונה (אופציונלי)
                        </label>

                        {imagePreview ? (
                          <div className="relative inline-block">
                            <img
                              src={imagePreview}
                              alt="תצוגה מקדימה"
                              className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                            />
                            <button
                              onClick={removeImage}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <FaTimes size={12} />
                            </button>
                          </div>
                        ) : (
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
                              <span>צלם תמונה</span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Note input */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          הערה (אופציונלי)
                        </label>
                        <textarea
                          value={completionNote}
                          onChange={(e) => setCompletionNote(e.target.value)}
                          placeholder="הוסף הערה..."
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
                          <span>{submittingCompletion ? 'שולח...' : 'שלח לאישור'}</span>
                        </button>
                        <button
                          onClick={closeCompletionForm}
                          disabled={submittingCompletion}
                          className="px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold rounded-lg transition-all disabled:opacity-50"
                        >
                          ביטול
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Complete task button - shown for tasks that can be completed */}
                  {task.status !== 'completed' && task.status !== 'pending_approval' && completingTaskId !== task.id && (
                    <button
                      onClick={() => openCompletionForm(task.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                      <FaCheckCircle />
                      <span>סיימתי - שלח לאישור</span>
                    </button>
                  )}

                  {/* Status indicator for pending approval */}
                  {task.status === 'pending_approval' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                      <span className="text-orange-700 font-medium">
                        ממתין לאישור המנהל
                      </span>
                    </div>
                  )}

                  {/* Status indicator for completed */}
                  {task.status === 'completed' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <span className="text-green-700 font-medium">
                        המשימה הושלמה ואושרה
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Acknowledge Button */}
        {!isAcknowledged && (
          <div className="bg-white rounded-lg shadow-xl p-6">
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
            >
              <FaCheckCircle className="text-2xl" />
              <span>{acknowledging ? 'מאשר...' : 'אישור קבלת כל המשימות'}</span>
            </button>
            <p className="text-center text-gray-600 mt-3 text-sm">
              לחיצה על כפתור זה תאשר שקיבלת את כל המשימות ותעדכן את המנהל
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>מערכת ניהול תחזוקה - Eden</p>
        </div>
      </div>
    </div>
  );
}
