import { NavLink } from 'react-router-dom';
import { FaHome, FaTasks, FaCog, FaTruck, FaUsers, FaWrench, FaMapMarkerAlt } from 'react-icons/fa';

export default function Sidebar() {
  const navItems = [
    { path: '/', icon: FaHome, label: 'היום שלי' },
    { path: '/tasks', icon: FaTasks, label: 'משימות' },
    { path: '/systems', icon: FaCog, label: 'מערכות' },
    { path: '/suppliers', icon: FaTruck, label: 'ספקים' },
    { path: '/employees', icon: FaUsers, label: 'עובדים' },
    { path: '/locations', icon: FaMapMarkerAlt, label: 'מיקומים' },
    { path: '/settings', icon: FaWrench, label: 'הגדרות' }
  ];

  return (
    <div className="w-64 bg-gray-900 text-white h-screen fixed right-0 top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-8">ניהול תחזוקה</h1>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              <item.icon className="text-xl" />
              <span className="text-base">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
