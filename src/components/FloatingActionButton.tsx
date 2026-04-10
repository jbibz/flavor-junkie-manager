import { useState, useEffect } from 'react';
import { Plus, X, Package, ShoppingCart, DollarSign } from 'lucide-react';

interface FloatingActionButtonProps {
  onMakeBatch: () => void;
  onAddComponents: () => void;
  onAddSale: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function FloatingActionButton({
  onMakeBatch,
  onAddComponents,
  onAddSale,
  mobileOpen = false,
  onMobileClose,
}: FloatingActionButtonProps) {
  const [desktopOpen, setDesktopOpen] = useState(false);

  const isOpen = mobileOpen || desktopOpen;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  function handleAction(action: () => void) {
    if ('vibrate' in navigator) navigator.vibrate(10);
    action();
    setDesktopOpen(false);
    onMobileClose?.();
  }

  function handleClose() {
    setDesktopOpen(false);
    onMobileClose?.();
  }

  const actions = [
    {
      label: 'Make Batch',
      description: 'Record a new production batch',
      icon: Package,
      onClick: () => handleAction(onMakeBatch),
      tileColor: 'bg-green-50 active:bg-green-100',
      textColor: 'text-green-800',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Add Components',
      description: 'Log a component purchase',
      icon: ShoppingCart,
      onClick: () => handleAction(onAddComponents),
      tileColor: 'bg-blue-50 active:bg-blue-100',
      textColor: 'text-blue-800',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Add Sale',
      description: 'Record a new sales event',
      icon: DollarSign,
      onClick: () => handleAction(onAddSale),
      tileColor: 'bg-orange-50 active:bg-orange-100',
      textColor: 'text-orange-800',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={handleClose}
        />
      )}

      {mobileOpen && (
        <div
          className="md:hidden fixed bottom-0 inset-x-0 z-50 animate-slide-up"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden max-h-[82dvh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3" />
            <div className="px-5 pt-4 pb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">
                Quick Actions
              </h3>
              <div className="flex flex-col gap-3">
                {actions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={action.onClick}
                    className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl ${action.tileColor} transition-transform duration-100 active:scale-[0.98]`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${action.iconBg} flex-shrink-0`}>
                      <action.icon className={`w-6 h-6 ${action.iconColor}`} strokeWidth={2} />
                    </div>
                    <div className="text-left">
                      <div className={`font-semibold text-[15px] leading-snug ${action.textColor}`}>
                        {action.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{action.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="hidden md:block fixed bottom-6 right-6 z-50">
        {desktopOpen && (
          <div className="absolute bottom-20 right-0 flex flex-col gap-3 mb-2">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className="flex items-center gap-3 bg-white text-gray-800 pl-3 pr-5 py-3 rounded-full shadow-lg border border-gray-100 transition-all duration-150 active:scale-95 hover:shadow-xl"
                style={{ animation: `fabSlideUp 0.2s ease-out ${idx * 0.05}s both` }}
                aria-label={action.label}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${action.iconBg}`}>
                  <action.icon className={`w-4 h-4 ${action.iconColor}`} strokeWidth={2} />
                </div>
                <span className="font-semibold whitespace-nowrap text-sm">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            if ('vibrate' in navigator) navigator.vibrate(10);
            setDesktopOpen(!desktopOpen);
          }}
          className={`w-14 h-14 ${
            desktopOpen ? 'bg-gray-800 hover:bg-gray-900' : 'bg-orange-500 hover:bg-orange-600'
          } text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95`}
          aria-label={desktopOpen ? 'Close menu' : 'Quick actions'}
          aria-expanded={desktopOpen}
        >
          <span className={`transition-transform duration-200 block ${desktopOpen ? 'rotate-45' : ''}`}>
            {desktopOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
          </span>
        </button>

        <style>{`
          @keyframes fabSlideUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </>
  );
}
