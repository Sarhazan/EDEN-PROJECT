/**
 * Reusable spinner component.
 * size: 'sm' (w-4 h-4) | 'md' (w-6 h-6) | 'lg' (w-8 h-8)
 * color: tailwind border color class, default 'border-gray-400'
 */
export default function Spinner({ size = 'md', color = 'border-gray-400', className = '' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return (
    <span
      className={`${sizeClass} border-2 ${color} border-t-transparent rounded-full animate-spin inline-block ${className}`}
      aria-label="טוען..."
    />
  );
}

/** Full-page or section loading placeholder */
export function LoadingSection({ text = 'טוען...', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-10 text-gray-500 ${className}`}>
      <Spinner size="md" color="border-gray-400" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
