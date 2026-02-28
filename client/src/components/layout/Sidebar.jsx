import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FaHome, FaTasks, FaCog, FaTruck, FaUsers, FaWrench, FaMapMarkerAlt, FaHistory, FaSignOutAlt, FaStar, FaRegStar, FaPlus, FaBuilding, FaEnvelope, FaFileAlt, FaMoneyBillWave } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';

export default function Sidebar({ onAddTask, onAddSystem, onAddSupplier, onAddEmployee, onAddLocation, onAddBuilding, onAddTenant }) {
  const { connectionStatus, logout, tasks } = useApp();
  const location = useLocation();
  const [starFilter, setStarFilter] = useState(false);

  // Get add button config based on current route
  const getAddButtonConfig = () => {
    const path = location.pathname;

    if (path === '/' || path === '/tasks') {
      return { show: true, label: '╫₧╫⌐╫ש╫₧╫פ ╫ק╫ף╫⌐╫פ', onClick: onAddTask };
    }
    if (path === '/systems') {
      return { show: true, label: '╫₧╫ó╫¿╫¢╫¬ ╫ק╫ף╫⌐╫פ', onClick: onAddSystem };
    }
    if (path === '/suppliers') {
      return { show: true, label: '╫í╫ñ╫º ╫ק╫ף╫⌐', onClick: onAddSupplier };
    }
    if (path === '/employees') {
      return { show: true, label: '╫ó╫ץ╫ס╫ף ╫ק╫ף╫⌐', onClick: onAddEmployee };
    }
    if (path === '/locations') {
      return { show: true, label: '╫₧╫ש╫º╫ץ╫¥ ╫ק╫ף╫⌐', onClick: onAddLocation };
    }
    if (path === '/buildings') {
      return { show: true, label: '╫₧╫ס╫á╫פ ╫ק╫ף╫⌐', onClick: onAddBuilding };
    }
    if (path === '/tenants') {
      return { show: true, label: '╫ף╫ש╫ש╫¿ ╫ק╫ף╫⌐', onClick: onAddTenant };
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

  const incomingTasksCount = (tasks || []).filter((task) => task.status === 'sent').length;

  const navItems = [
    { path: '/', icon: FaHome, label: '╫פ╫ש╫ץ╫¥ ╫⌐╫£╫ש' },
    { path: '/tasks', icon: FaTasks, label: '╫₧╫⌐╫ש╫₧╫ץ╫¬' },
    { path: '/history', icon: FaHistory, label: '╫פ╫ש╫í╫ר╫ץ╫¿╫ש╫פ' },
    { path: '/systems', icon: FaCog, label: '╫₧╫ó╫¿╫¢╫ץ╫¬' },
    { path: '/suppliers', icon: FaTruck, label: '╫í╫ñ╫º╫ש╫¥' },
    { path: '/employees', icon: FaUsers, label: '╫ó╫ץ╫ס╫ף╫ש╫¥' },
    { path: '/locations', icon: FaMapMarkerAlt, label: '╫₧╫ש╫º╫ץ╫₧╫ש╫¥' },
    { path: '/buildings', icon: FaBuilding, label: '╫₧╫ס╫á╫ש╫¥' },
    { path: '/tenants', icon: FaUsers, label: '╫ף╫ש╫ש╫¿╫ש╫¥' },
    { path: '/billing', icon: FaMoneyBillWave, label: '╫ע╫ס╫ש╫ש╫פ' },
    { path: '/forms', icon: FaFileAlt, label: '╫ר╫ñ╫í╫ש╫¥' },
    { path: '/settings', icon: FaWrench, label: '╫פ╫ע╫ף╫¿╫ץ╫¬' }
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
      case 'connected': return '╫₧╫ק╫ץ╫ס╫¿';
      case 'disconnected': return '╫₧╫á╫ץ╫¬╫º';
      case 'error': return '╫⌐╫ע╫ש╫נ╫פ';
      default: return '╫£╫נ ╫ש╫ף╫ץ╫ó';
    }
  };

  return (
    <div className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white h-screen fixed right-0 top-0 shadow-xl flex flex-col">
      <div className="p-8 border-b border-gray-700/50">
        <h1 className="text-2xl font-bold font-alef text-white">
          ╫á╫ש╫פ╫ץ╫£ ╫¬╫ק╫צ╫ץ╫º╫פ
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
          title="╫í╫ש╫á╫ץ╫ƒ ╫₧╫⌐╫ש╫₧╫ץ╫¬ ╫₧╫í╫ץ╫₧╫á╫ץ╫¬ ╫ס╫¢╫ץ╫¢╫ס"
        >
          {starFilter ? <FaStar className="text-xl" /> : <FaRegStar className="text-xl" />}
          <span className="text-base font-medium">╫₧╫⌐╫ש╫₧╫ץ╫¬ ╫₧╫í╫ץ╫₧╫á╫ץ╫¬</span>
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
          <div className="text-[11px] text-slate-400 mb-1">╫₧╫¬╫ק╫¥</div>
          <div className="text-sm font-semibold text-white">NXT ╫ס╫¬ ╫ש╫¥</div>

          <div className="text-[11px] text-slate-400 mt-3 mb-1">╫₧╫á╫פ╫£ ╫נ╫ק╫צ╫º╫פ</div>
          <div className="text-sm font-semibold text-white">╫ó╫ף╫ƒ ╫º╫á╫ף╫ש</div>
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
          <span className="text-sm font-medium">╫פ╫¬╫á╫¬╫º</span>
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
