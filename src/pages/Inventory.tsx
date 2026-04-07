import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, AlertTriangle, CheckCircle, Package, Loader2 } from 'lucide-react';
import { useProducts, useComponents } from '../lib/hooks';
import { api } from '../lib/api';
import type { Component } from '../lib/database.types';
import ComponentPurchaseModal from '../components/ComponentPurchaseModal';

interface InventoryProps {
  onProductClick: (productId: string) => void;
}

export default function Inventory({ onProductClick }: InventoryProps) {
  const { products, loading: productsLoading } = useProducts();
  const { components, loading: componentsLoading, reload: reloadComponents } = useComponents();
  const [expandedSections, setExpandedSections] = useState<string[]>(['lids', 'bottles', 'labels']);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);

  function toggleSection(section: string) {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  }

  function openPurchaseModal(component: Component) {
    setSelectedComponent(component);
    setPurchaseModalOpen(true);
  }

  function closePurchaseModal() {
    setPurchaseModalOpen(false);
    setSelectedComponent(null);
  }

  async function handlePurchase(quantity: number, totalPaid: number) {
    if (!selectedComponent) return;

    await api.components.addPurchase(selectedComponent.id, {
      quantity,
      total_paid: totalPaid
    });

    reloadComponents();
    closePurchaseModal();
  }

  const lids = components.filter(c => c.category === 'lids');
  const bottles = components.filter(c => c.category === 'bottles');
  const labels = components.filter(c => c.category === 'labels');

  const totalStock = products.reduce((sum, p) => sum + p.current_stock, 0);
  const lowStockCount = products.filter(p => p.current_stock < 15).length;

  if (productsLoading || componentsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">Track products and supplies</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Products" value={products.length} />
        <StatCard label="Total Stock" value={totalStock} />
        <StatCard label="Low Stock" value={lowStockCount} variant="warning" />
        <StatCard label="Components" value={components.length} />
      </div>

      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Finished Products</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
          {products.map(product => {
            const isLowStock = product.current_stock < 15;
            return (
              <button
                key={product.id}
                onClick={() => onProductClick(product.id)}
                className="card-interactive p-3 flex flex-col items-center justify-between min-h-[140px] sm:min-h-[160px]"
              >
                <div className="flex items-center gap-1">
                  {isLowStock ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  )}
                  <span className={`text-[10px] font-medium ${isLowStock ? 'text-yellow-600' : 'text-green-600'}`}>
                    {isLowStock ? 'Low' : 'Good'}
                  </span>
                </div>

                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {product.current_stock}
                  </div>
                  <p className="text-[10px] text-gray-400">units</p>
                </div>

                <div className="text-center w-full">
                  {product.size !== 'Regular' && (
                    <p className="text-[9px] font-semibold text-orange-600 uppercase tracking-wide mb-0.5">
                      {product.size}
                    </p>
                  )}
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-700 leading-tight truncate px-1">
                    {product.name}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">${product.price}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Components</h2>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <ComponentSection
            title="Lids"
            items={lids}
            expanded={expandedSections.includes('lids')}
            onToggle={() => toggleSection('lids')}
            onPurchase={openPurchaseModal}
          />

          <ComponentSection
            title="Bottles"
            items={bottles}
            expanded={expandedSections.includes('bottles')}
            onToggle={() => toggleSection('bottles')}
            onPurchase={openPurchaseModal}
          />

          <ComponentSection
            title="Labels"
            items={labels}
            expanded={expandedSections.includes('labels')}
            onToggle={() => toggleSection('labels')}
            onPurchase={openPurchaseModal}
          />
        </div>
      </div>

      {purchaseModalOpen && selectedComponent && (
        <ComponentPurchaseModal
          component={selectedComponent}
          onClose={closePurchaseModal}
          onSave={handlePurchase}
        />
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  variant?: 'default' | 'warning';
}

function StatCard({ label, value, variant = 'default' }: StatCardProps) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs sm:text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold mt-1 ${
        variant === 'warning' ? 'text-yellow-600' : 'text-gray-900'
      }`}>
        {value}
      </p>
    </div>
  );
}

interface ComponentSectionProps {
  title: string;
  items: Component[];
  expanded: boolean;
  onToggle: () => void;
  onPurchase: (component: Component) => void;
}

function ComponentSection({ title, items, expanded, onToggle, onPurchase }: ComponentSectionProps) {
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + Number(item.total_value || 0), 0);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-target"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            expanded ? 'bg-orange-100' : 'bg-gray-100'
          }`}>
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-orange-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-right">
          <span className="text-xs sm:text-sm text-gray-500">
            {totalUnits.toLocaleString()}
          </span>
          <span className="text-xs sm:text-sm font-medium text-gray-700">
            ${totalValue.toFixed(0)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 sm:p-4">
            {items.map(item => (
              <div
                key={item.id}
                className="card p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 capitalize text-sm sm:text-base">
                      {item.type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500">{title.slice(0, -1)}</p>
                  </div>
                  <span className={`text-[10px] sm:text-xs font-medium px-2 py-1 rounded-full ${
                    item.quantity < 50
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {item.quantity < 50 ? 'Low' : 'Good'}
                  </span>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Quantity</span>
                    <span className="font-semibold text-gray-900">{item.quantity.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Unit Cost</span>
                    <span className="font-semibold text-gray-900">${Number(item.average_cost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Total Value</span>
                    <span className="font-bold text-orange-600">${Number(item.total_value || 0).toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => onPurchase(item)}
                  className="w-full flex items-center justify-center gap-2 btn-touch bg-[#1e3a5f] text-white active:bg-[#2a4d78] text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Purchase
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
