import { useState, useEffect } from 'react';
import { ShoppingCart, Loader2 } from 'lucide-react';
import type { Component } from '../lib/database.types';

interface ComponentPurchaseModalProps {
  component: Component;
  onClose: () => void;
  onSave: (quantity: number, totalPaid: number) => Promise<void>;
}

const GRAMS_PER_POUND = 453.592;

export default function ComponentPurchaseModal({ component, onClose, onSave }: ComponentPurchaseModalProps) {
  const [quantity, setQuantity] = useState('');
  const [totalPaid, setTotalPaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const isSeasoning = component.category === 'seasonings';
  const parsedQuantity = Number(quantity);
  const normalizedQuantity = isSeasoning
    ? Math.round((Number.isFinite(parsedQuantity) ? parsedQuantity : 0) * GRAMS_PER_POUND)
    : parseInt(quantity || '0');
  const paid = Number(totalPaid);

  const costPerUnit =
    normalizedQuantity > 0 && Number.isFinite(paid) && paid > 0 ? paid / normalizedQuantity : 0;
  const canSave = normalizedQuantity > 0 && Number.isFinite(paid) && paid > 0;

  async function handleSave() {
    if (!canSave) return;

    setLoading(true);
    setError('');

    try {
      await onSave(normalizedQuantity, paid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save purchase');
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={onClose} />

      <div className="hidden md:flex fixed inset-0 items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full pointer-events-auto animate-fade-in">
          <ModalContent
            component={component}
            quantity={quantity}
            setQuantity={setQuantity}
            totalPaid={totalPaid}
            setTotalPaid={setTotalPaid}
            costPerUnit={costPerUnit}
            normalizedQuantity={normalizedQuantity}
            isSeasoning={isSeasoning}
            loading={loading}
            canSave={canSave}
            error={error}
            onClose={onClose}
            onSubmit={handleSave}
          />
        </div>
      </div>

      <div className="md:hidden bottom-sheet animate-slide-up z-50">
        <div className="bottom-sheet-handle" />
        <ModalContent
          component={component}
          quantity={quantity}
          setQuantity={setQuantity}
          totalPaid={totalPaid}
          setTotalPaid={setTotalPaid}
          costPerUnit={costPerUnit}
          normalizedQuantity={normalizedQuantity}
          isSeasoning={isSeasoning}
          loading={loading}
          canSave={canSave}
          error={error}
          onClose={onClose}
          onSubmit={handleSave}
        />
      </div>
    </>
  );
}

interface ModalContentProps {
  component: Component;
  quantity: string;
  setQuantity: (qty: string) => void;
  totalPaid: string;
  setTotalPaid: (paid: string) => void;
  costPerUnit: number;
  normalizedQuantity: number;
  isSeasoning: boolean;
  loading: boolean;
  canSave: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => void;
}

function ModalContent({
  component,
  quantity,
  setQuantity,
  totalPaid,
  setTotalPaid,
  costPerUnit,
  normalizedQuantity,
  isSeasoning,
  loading,
  canSave,
  error,
  onClose,
  onSubmit
}: ModalContentProps) {
  const componentName = formatComponentName(component.type);
  const categoryName = component.category.charAt(0).toUpperCase() + component.category.slice(1);

  return (
    <div className="flex flex-col max-h-[85vh] md:max-h-none">
      <div className="flex items-center gap-3 p-4 md:p-6 border-b border-gray-100">
        <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">Add Purchase</h2>
          <p className="text-sm text-gray-500">{componentName} ({categoryName})</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isSeasoning ? 'Weight Purchased (lb)' : 'Quantity Purchased'}
          </label>
          <input
            type="number"
            inputMode={isSeasoning ? 'decimal' : 'numeric'}
            min="0"
            step={isSeasoning ? '0.01' : '1'}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={isSeasoning ? 'Enter pounds' : 'Enter quantity'}
            className="input-touch"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Total Price Paid</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={totalPaid}
              onChange={(e) => setTotalPaid(e.target.value)}
              placeholder="0.00"
              className="input-touch pl-8"
            />
          </div>
        </div>

        {quantity && totalPaid && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                {isSeasoning ? 'Cost per gram:' : 'Cost per unit:'}
              </span>
              <span className="text-lg font-bold text-orange-600">
                ${isSeasoning ? costPerUnit.toFixed(4) : costPerUnit.toFixed(2)}
              </span>
            </div>
            {isSeasoning && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Converted grams:</span>
                <span className="font-semibold text-gray-900">{normalizedQuantity.toLocaleString()} g</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Current stock:</span>
              <span className="font-semibold text-gray-900">
                {component.quantity.toLocaleString()}{isSeasoning ? ' g' : ''}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">New stock:</span>
              <span className="font-semibold text-green-600">
                {(component.quantity + normalizedQuantity).toLocaleString()}{isSeasoning ? ' g' : ''}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 p-4 md:p-6 border-t border-gray-100">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSave || loading}
          className="flex-1 btn-primary disabled:opacity-50 disabled:active:scale-100"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Save Purchase'
          )}
        </button>
      </div>
    </div>
  );
}

function formatComponentName(type: string) {
  return type
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
