import { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

export default function Modal({ isOpen, onClose, title, children, noScroll = false }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white w-full h-full max-w-full max-h-full rounded-none shadow-2xl overflow-hidden animate-scale-in flex flex-col md:max-w-3xl md:max-h-[90vh] md:rounded-2xl">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-4 md:px-8 md:py-5 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 font-alef">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-all duration-200"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className={`${noScroll ? 'overflow-hidden p-0' : 'p-4 md:p-8 overflow-y-auto'} flex-1 flex flex-col min-h-0`}>
          {children}
        </div>
      </div>
    </div>
  );
}
