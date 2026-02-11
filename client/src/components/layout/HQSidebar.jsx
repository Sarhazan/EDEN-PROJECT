import { NavLink } from 'react-router-dom';
import { FaChartLine, FaUsers, FaBullhorn, FaListAlt, FaFileAlt, FaWrench, FaSignOutAlt } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';

export default function HQSidebar() {
  const { logout } = useApp();

  const navItems = [
    { path: '/hq/dashboard', icon: FaChartLine, label: 'דשבורד HQ' },
    { path: '/hq/managers', icon: FaUsers, label: 'מנהלי אזור/מתחמים' },
    { path: '/hq/dispatch', icon: FaBullhorn, label: 'שיגור משימות' },
    { path: '/hq/lists', icon: FaListAlt, label: 'רשימות תפוצה' },
    { path: '/hq/reports', icon: FaFileAlt, label: 'דוחות' },
    { path: '/hq/settings', icon: FaWrench, label: 'הגדרות HQ' }
  ];

  return (
    <div className="w-72 bg-gradient-to-b from-slate-900 to-indigo-950 text-white h-screen fixed right-0 top-0 shadow-xl flex flex-col">
      <div className="p-8 border-b border-slate-700/50">
        <h1 className="text-2xl font-bold">HQ Portal</h1>
        <p className="text-xs text-slate-300 mt-1">ממשק מנהל אזור</p>
      </div>

      <nav className="p-4 space-y-2 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-700/40'
                  : 'text-slate-200 hover:bg-slate-800 hover:translate-x-1'
              }`
            }
          >
            <item.icon className="text-lg" />
            <span className="text-base font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-slate-700/50">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-200 hover:bg-red-600/20 hover:text-red-300 transition-all duration-200"
        >
          <FaSignOutAlt className="text-lg" />
          <span className="text-sm font-medium">התנתק</span>
        </button>
      </div>
    </div>
  );
}
