import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FaHome, FaTasks, FaCog, FaTruck, FaUsers, FaWrench, FaMapMarkerAlt, FaHistory, FaSignOutAlt, FaStar, FaRegStar, FaPlus } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';

export default function Sidebar({ onAddTask, onAddSystem, onAddSupplier, onAddEmployee, onAddLocation }) {
  const { connectionStatus, logout } = useApp();
  const location = useLocation();
  const [starFilter, setStarFilter] = useState(false);

  // Get add button config based on current route
  const getAddButtonConfig = () => {
    const path = location.pathname;

    if (path === '/' || path === '/tasks') {
      return { show: true, label: 'משימה חדשה', onClick: onAddTask };
    }
    if (path === '/systems') {
      return { show: true, label: 'מערכת חדשה', onClick: onAddSystem };
    }
    if (path === '/suppliers') {
      return { show: true, label: 'ספק חדש', onClick: onAddSupplier };
    }
    if (path === '/employees') {
      return { show: true, label: 'עובד חדש', onClick: onAddEmployee };
    }
    if (path === '/locations') {
      return { show: true, label: 'מיקום חדש', onClick: onAddLocation };
    }
    return { show: false };
  };

  const addButtonConfig = getAddButtonConfig();

  // Initialize from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('starFilter');
    if (saved !== null) setStarFilter(saved === 'true');
  }, []);

  // Handle star filter toggle
  const handleStarFilterToggle = () => {
    const newValue = !starFilter;
    setStarFilter(newValue);
    localStorage.setItem('starFilter', newValue.toString());
    // Dispatch custom event to notify same-tab components
    window.dispatchEvent(new CustomEvent('starFilterChanged', { detail: { value: newValue } }));
  };

  const navItems = [
    { path: '/', icon: FaHome, label: 'היום שלי' },
    { path: '/tasks', icon: FaTasks, label: 'משימות' },
    { path: '/history', icon: FaHistory, label: 'היסטוריה' },
    { path: '/systems', icon: FaCog, label: 'מערכות' },
    { path: '/suppliers', icon: FaTruck, label: 'ספקים' },
    { path: '/employees', icon: FaUsers, label: 'עובדים' },
    { path: '/locations', icon: FaMapMarkerAlt, label: 'מיקומים' },
    { path: '/settings', icon: FaWrench, label: 'הגדרות' }
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
          title="סינון משימות מסומנות בכוכב"
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

      {/* Connection Status Indicator */}
      <div className="px-4 py-3 border-t border-gray-700/50">
        <div className="flex items-center gap-2 text-sm mb-3">
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
      </div>
    </div>
  );
}
