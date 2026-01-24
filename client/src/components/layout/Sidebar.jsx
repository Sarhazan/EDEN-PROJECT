import { NavLink } from 'react-router-dom';
import { FaHome, FaTasks, FaCog, FaTruck, FaUsers, FaWrench, FaMapMarkerAlt, FaHistory } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';

export default function Sidebar() {
  const { connectionStatus } = useApp();

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
      </nav>

      {/* Connection Status Indicator */}
      <div className="px-4 py-3 border-t border-gray-700/50">
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`}></div>
          <span className="text-gray-300">{getStatusText()}</span>
        </div>
      </div>
    </div>
  );
}
