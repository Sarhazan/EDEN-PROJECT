import { FaBars } from 'react-icons/fa'

export default function HamburgerButton({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg text-gray-900 bg-white shadow-md hover:bg-gray-50 active:scale-95 active:shadow-sm transition-all duration-150 min-h-[44px] min-w-[44px] flex items-center justify-center ${className}`}
      aria-label="פתח תפריט ניווט"
    >
      <FaBars className="text-xl" />
    </button>
  )
}
