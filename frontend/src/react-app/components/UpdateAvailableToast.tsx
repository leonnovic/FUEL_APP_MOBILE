import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdateAvailableToast() {
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<ServiceWorkerRegistration>).detail;
      if (detail) setReg(detail);
    };
    window.addEventListener('fuelpro:update-ready', onUpdate);
    return () => window.removeEventListener('fuelpro:update-ready', onUpdate);
  }, []);

  if (!reg || !reg.waiting) return null;

  const apply = () => {
    reg.waiting?.postMessage('SKIP_WAITING');
  };

  return (
    <div
      data-testid="update-toast"
      className="fixed top-4 right-4 z-[60] bg-slate-900/95 backdrop-blur-lg border border-blue-500/30 rounded-xl shadow-2xl p-3 pr-2 flex items-center gap-2.5 max-w-xs"
    >
      <RefreshCw size={16} className="text-blue-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white">New version available</p>
        <p className="text-[10px] text-gray-400">Reload to update.</p>
      </div>
      <button
        onClick={apply}
        data-testid="update-toast-apply"
        className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 rounded-md text-[10px] font-semibold text-white"
      >
        Update
      </button>
      <button
        onClick={() => setReg(null)}
        className="p-1 text-gray-400 hover:text-white"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
