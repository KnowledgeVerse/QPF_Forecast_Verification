import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useForecastStore } from '@/hooks/useForecastStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useForecastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: { id: string; message: string; type: 'success' | 'error' | 'info' };
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const borderColor =
    toast.type === 'success'
      ? '#10b981'
      : toast.type === 'error'
      ? '#ef4444'
      : '#3b82f6';

  const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'error' ? AlertCircle : Info;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[280px] max-w-[400px] animate-slideIn"
      style={{
        background: '#111d32',
        borderLeft: `4px solid ${borderColor}`,
      }}
    >
      <Icon size={18} style={{ color: borderColor }} className="flex-shrink-0" />
      <p className="text-sm text-[#e2e8f0] flex-1">{toast.message}</p>
      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-[#1a2d4a] text-[#94a3b8] hover:text-[#e2e8f0] transition-colors flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
