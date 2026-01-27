import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useSwipeable } from 'react-swipeable'
import { FaTimes, FaSync } from 'react-icons/fa'
import { useVersionCheck } from '../../hooks/useVersionCheck'

export default function MobileDrawer({ isOpen, onClose, navItems }) {
  const { updateAvailable, doUpdate } = useVersionCheck();

  // Configure swipe gesture - swipe right-to-left closes in RTL
  const swipeHandlers = useSwipeable({
    onSwipedRight: onClose,
    trackMouse: false,
    preventScrollOnSwipe: true
  })

  // iOS Safari scroll lock - critical for preventing background scroll
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY

      // Lock body scroll with position fixed
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'

      // Cleanup: restore scroll position
      return () => {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        {...swipeHandlers}
        className={`fixed top-0 right-0 h-full w-72 bg-gradient-to-b from-gray-900 to-gray-800 shadow-xl z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="תפריט ניווט ראשי"
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-700/50 flex items-center justify-between">
          <h1 className="text-2xl font-bold font-alef text-white">
            ניהול תחזוקה
          </h1>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-all duration-150"
            aria-label="סגור תפריט"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl min-h-[44px] transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 active:scale-95'
                }`
              }
            >
              <item.icon className="text-xl" />
              <span className="text-base font-medium">{item.label}</span>
            </NavLink>
          ))}

          {/* Update Available Button */}
          {updateAvailable && (
            <button
              onClick={doUpdate}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl min-h-[44px] bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg animate-pulse mt-4"
            >
              <FaSync className="text-lg" />
              <span>עדכון זמין - לחץ לעדכון</span>
            </button>
          )}

          {/* Environment Indicator */}
          <div className="mt-4 text-center">
            <span className={`text-xs px-2 py-1 rounded ${
              import.meta.env.VITE_ENV === 'test'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
            }`}>
              {import.meta.env.VITE_ENV === 'test' ? 'EDEN DEV' : 'PRODUCTION'}
            </span>
          </div>
        </nav>
      </div>
    </>
  )
}
