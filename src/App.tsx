import { useState, useCallback } from 'react';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import ProductDetail from './pages/ProductDetail';
import SalesTracking from './pages/SalesTracking';
import SalesAnalytics from './pages/SalesAnalytics';
import Production from './pages/Production';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import FloatingActionButton from './components/FloatingActionButton';
import QuickBatchModal from './components/QuickBatchModal';
import QuickComponentModal from './components/QuickComponentModal';
import AddSaleModal from './components/AddSaleModal';
import Toast, { ToastMessage, createToast, ToastType } from './components/Toast';

type Page = 'dashboard' | 'inventory' | 'sales' | 'analytics' | 'production' | 'product-detail';
type QuickAction = 'batch' | 'components' | 'sale' | null;

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const toast = createToast(type, message);
    setToasts(prev => [...prev, toast]);
    if ('vibrate' in navigator) {
      navigator.vibrate(type === 'error' ? [50, 30, 50] : 10);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  function navigateToProduct(productId: string) {
    setSelectedProductId(productId);
    setCurrentPage('product-detail');
  }

  function handleQuickActionSuccess(message?: string) {
    setQuickAction(null);
    setMobileActionsOpen(false);
    setRefreshKey(prev => prev + 1);
    if (message) {
      showToast('success', message);
    }
  }

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard key={refreshKey} onProductClick={navigateToProduct} />;
      case 'inventory':
        return <Inventory key={refreshKey} onProductClick={navigateToProduct} />;
      case 'product-detail':
        return (
          <ProductDetail
            key={refreshKey}
            productId={selectedProductId}
            onBack={() => setCurrentPage('inventory')}
            showToast={showToast}
          />
        );
      case 'sales':
        return <SalesTracking key={refreshKey} showToast={showToast} />;
      case 'analytics':
        return <SalesAnalytics key={refreshKey} />;
      case 'production':
        return <Production key={refreshKey} />;
      default:
        return <Dashboard key={refreshKey} onProductClick={navigateToProduct} />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="container mx-auto px-3 sm:px-4 pt-4 pb-28 md:py-6 md:pb-8 max-w-7xl">
        {renderPage()}
      </main>

      <BottomNav
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onPlusPress={() => setMobileActionsOpen(true)}
      />

      <FloatingActionButton
        onMakeBatch={() => setQuickAction('batch')}
        onAddComponents={() => setQuickAction('components')}
        onAddSale={() => setQuickAction('sale')}
        mobileOpen={mobileActionsOpen}
        onMobileClose={() => setMobileActionsOpen(false)}
      />

      {quickAction === 'batch' && (
        <QuickBatchModal
          onClose={() => setQuickAction(null)}
          onSuccess={(msg) => handleQuickActionSuccess(msg || 'Batch created successfully')}
        />
      )}

      {quickAction === 'components' && (
        <QuickComponentModal
          onClose={() => setQuickAction(null)}
          onSuccess={(msg) => handleQuickActionSuccess(msg || 'Purchase recorded successfully')}
        />
      )}

      {quickAction === 'sale' && (
        <AddSaleModal
          onClose={() => setQuickAction(null)}
          onSave={() => handleQuickActionSuccess('Sales event saved successfully')}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
