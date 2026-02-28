import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FaHome, FaTasks, FaCog, FaTruck, FaUsers, FaWrench, FaMapMarkerAlt, FaHistory, FaSignOutAlt, FaStar, FaRegStar, FaPlus, FaBuilding, FaEnvelope, FaFileAlt, FaMoneyBillWave } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';

export default function Sidebar({ onAddTask, onAddSystem, onAddSupplier, onAddEmployee, onAddLocation, onAddBuilding, onAddTenant }) {
  const { connectionStatus, logout, tasks } = useApp();
  const location = useLocation();
  const [starFilter, setStarFilter] = useState(false);

  const getAddButtonConfig = () => {
    const path = location.pathname;
    if (path === '/' || path === '/tasks') return { show: true, label: 'צור משימה חדשה', onClick: onAddTask };
    if (path === '/systems') return { show: true, label: 'הוסף מערכת חדשה', onClick: onAddSystem };
    if (path === '/suppliers') return { show: true, label: 'הוסף ספק', onClick: onAddSupplier };
    if (path === '/employees') return { show: true, label: 'עובד חדש', onClick: onAddEmployee };
    if (path === '/locations') return { show: true, label: 'הוסף מיקום', onClick: onAddLocation };
    if (path === '/buildings') return { show: true, label: 'הוסף מבנה', onClick: onAddBuilding };
    if (path === '/tenants') return { show: true, label: 'הוסף דייר', onClick: onAddTenant };
    return { show: false };
  };

  const addButtonConfig = getAddButtonConfig();

  useEffect(() => {
    const saved = localStorage.getItem('starFilter');
    if (saved !== null) setStarFilter(saved === 'true');
  }, []);

  const handleStarFilterToggle = () => {
    const newValue = !starFilter;
    setStarFilter(newValue);
    localStorage.setItem('starFilter', newValue.toString());
    window.dispatchEvent(new CustomEvent('starFilterChanged', { detail: { value: newValue } }));
  };

  const incomingTasksCount = (tasks || []).filter((task) => task.status === 'sent').length;

  const navItems = [
    { path: '/', icon: FaHome, label: 'היום שלי' },
    { path: '/tasks', icon: FaTasks, label: 'משימות' },
    { path: '/history', icon: FaHistory, label: 'היסטוריה' },
    { path: '/systems', icon: FaCog, label: 'מערכות' },
    { path: '/suppliers', icon: FaTruck, label: 'ספקים' },
    { path: '/employees', icon: FaUsers, label: 'עובדים' },
    { path: '/locations', icon: FaMapMarkerAlt, label: 'מיקומים' },
    { path: '/buildings', icon: FaBuilding, label: 'מבנים' },
    { path: '/tenants', icon: FaUsers, label: 'דיירים' },
    { path: '/billing', icon: FaMoneyBillWave, label: 'גביה' },
    { path: '/forms', icon: FaFileAlt, label: 'טפסים' },
    { path: '/settings', icon: FaWrench, label: 'הגדרות' },
  ];

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      case 'error': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'מחובר';
      case 'disconnected': return 'מנותק';
      case 'error': return 'שגיאה';
      default: return 'לא ידוע';
    }
  };

  return (
    <div className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white h-screen fixed right-0 top-0 shadow-xl flex flex-col">
      <div className="p-8 border-b border-gray-700/50">
        <h1 className="text-2xl font-bold font-alef text-white">
          ניהול תחזוקה
        </h1>
      </div>

      <nav className="p-4 space-y-2 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/50'
                  : 'text-gray-300 hover:bg-gray-800 hover:translate-x-1'
              }`
            }
          >
            <item.icon className="text-xl" />
            <span className="text-base font-medium">{item.label}</span>

            {item.path === '/tasks' && incomingTasksCount > 0 && (
              <span className="mr-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                <FaEnvelope className="text-[10px]" />
                {incomingTasksCount}
              </span>
            )}
          </NavLink>
        ))}

        {/* Star Filter Button */}
        <button
          onClick={handleStarFilterToggle}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
            starFilter
              ? 'bg-indigo-100 text-yellow-500 hover:bg-indigo-50'
              : 'text-gray-400 hover:bg-indigo-50'
          }`}
          title="הצג/הסתר משימות מסומנות בלבד"
        >
          {starFilter ? <FaStar className="text-xl" /> : <FaRegStar className="text-xl" />}
          <span className="text-base font-medium">משימות מסומנות</span>
        </button>

        {/* Dynamic Add Button */}
        {addButtonConfig.show && (
          <button
            onClick={addButtonConfig.onClick}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 bg-primary text-white hover:bg-indigo-700 mt-2"
          >
            <FaPlus className="text-xl" />
            <span className="text-base font-medium">{addButtonConfig.label}</span>
          </button>
        )}
      </nav>

      {/* Site Info + Connection */}
      <div className="px-4 py-3 border-t border-gray-700/50 space-y-3">
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
          <div className="text-[11px] text-slate-400 mb-1">כתובת</div>
          <div className="text-sm font-semibold text-white">NXT בע"מ</div>

          <div className="text-[11px] text-slate-400 mt-3 mb-1">מנהל אתר</div>
          <div className="text-sm font-semibold text-white">סהר חזן</div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`}></div>
          <span className="text-gray-300">{getStatusText()}</span>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-all duration-200"
        >
          <FaSignOutAlt className="text-lg" />
          <span className="text-sm font-medium">התנתק</span>
        </button>

        {/* Environment Indicator */}
        <div className="text-center">
          <span className={`text-xs px-2 py-1 rounded ${
            import.meta.env.VITE_ENV === 'test'
              ? 'bg-yellow-500/20 text-yellow-400'
              : import.meta.env.VITE_ENV === 'local'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-green-500/20 text-green-400'
          }`}>
            {import.meta.env.VITE_ENV === 'test' ? 'EDEN DEV' : import.meta.env.VITE_ENV === 'local' ? 'LOCAL DEV' : 'PRODUCTION'}
          </span>
        </div>
      </div>
    </div>
  );
}
