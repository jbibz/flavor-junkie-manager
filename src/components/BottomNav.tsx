import { LayoutDashboard, Package, BarChart3, Factory, Plus, DollarSign } from 'lucide-react';

type Page = 'dashboard' | 'inventory' | 'sales' | 'analytics' | 'production';

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: Page) => void;
  onPlusPress: () => void;
}

const leftItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Package },
];

const rightItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'production', label: 'Production', icon: Factory },
];

export default function BottomNav({ currentPage, onNavigate, onPlusPress }: BottomNavProps) {
  function handleTap(page: Page) {
    if ('vibrate' in navigator) navigator.vibrate(10);
    onNavigate(page);
  }

  function handlePlus() {
    if ('vibrate' in navigator) navigator.vibrate(15);
    onPlusPress();
  }

  function NavButton({ item }: { item: (typeof leftItems)[0] }) {
    const isActive =
      currentPage === item.id ||
      (currentPage === 'product-detail' && item.id === 'inventory');
    const Icon = item.icon;

    return (
      <button
        onClick={() => handleTap(item.id)}
        className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all duration-150 relative ${
          isActive ? 'text-orange-500' : 'text-gray-400 active:text-gray-600'
        }`}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
      >
        {isActive && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-orange-500 rounded-full" />
        )}
        <Icon
          className="w-[22px] h-[22px] transition-transform duration-150"
          strokeWidth={isActive ? 2.5 : 2}
          style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)' }}
        />
        <span
          className={`text-[10px] leading-none ${
            isActive ? 'font-bold' : 'font-medium'
          }`}
        >
          {item.label}
        </span>
      </button>
    );
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="bg-white border-t border-gray-100 shadow-[0_-2px_16px_rgba(0,0,0,0.07)] flex items-stretch"
        style={{ height: '64px' }}
      >
        {leftItems.map(item => (
          <NavButton key={item.id} item={item} />
        ))}

        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={handlePlus}
            className="w-[52px] h-[52px] bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-200/60 active:scale-95 transition-transform duration-150 -translate-y-3"
            aria-label="Quick actions"
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {rightItems.map(item => (
          <NavButton key={item.id} item={item} />
        ))}
      </div>
    </nav>
  );
}
