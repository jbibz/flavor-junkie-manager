import { useEffect, useState } from 'react';
import { Settings2, Loader2 } from 'lucide-react';
import type { Component } from '../lib/database.types';

interface ComponentUpdatePayload {
  quantity: number;
  average_cost: number;
  total_value: number;
}

interface EditComponentModalProps {
  component: Component;
  onClose: () => void;
  onSave: (payload: ComponentUpdatePayload) => Promise<void>;
}

export default function EditComponentModal({ component, onClose, onSave }: EditComponentModalProps) {
  const [quantity, setQuantity] = useState(component.quantity.toString());
  const [averageCost, setAverageCost] = useState(formatNumber(component.average_cost, component.category === 'seasonings'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    setQuantity(component.quantity.toString());
    setAverageCost(formatNumber(component.average_cost, component.category === 'seasonings'));
  }, [component]);

  const totalValue = calculateTotalValue(quantity, averageCost);
  const canSave = quantity !== '' && averageCost !== '' && Number(quantity) >= 0 && Number(averageCost) >= 0;

  async function handleSubmit() {
    if (!canSave) return;

    setLoading(true);
    setError(null);

    try {
      await onSave({
        quantity: Number(quantity),
        average_cost: Number(averageCost),
        total_value: totalValue,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update component';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={onClose} />

      <div className="hidden md:flex fixed inset-0 items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full pointer-events-auto animate-fade-in">
          <ModalContent
            component={component}
            quantity={quantity}
            setQuantity={setQuantity}
            averageCost={averageCost}
            setAverageCost={setAverageCost}
            totalValue={totalValue}
            canSave={canSave}
            loading={loading}
            error={error}
            onClose={onClose}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      <div className="md:hidden bottom-sheet animate-slide-up z-50">
        <div className="bottom-sheet-handle" />
        <ModalContent
          component={component}
          quantity={quantity}
          setQuantity={setQuantity}
          averageCost={averageCost}
          setAverageCost={setAverageCost}
          totalValue={totalValue}
          canSave={canSave}
          loading={loading}
          error={error}
          onClose={onClose}
          onSubmit={handleSubmit}
        />
      </div>
    </>
  );
}

interface ModalContentProps {
  component: Component;
  quantity: string;
  setQuantity: (value: string) => void;
  averageCost: string;
  setAverageCost: (value: string) => void;
  totalValue: number;
  canSave: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
}

function ModalContent({
  component,
  quantity,
  setQuantity,
  averageCost,
  setAverageCost,
  totalValue,
  canSave,
  loading,
  error,
  onClose,
  onSubmit,
}: ModalContentProps) {
  const isSeasoning = component.category === 'seasonings';
  const componentName = component.type.charAt(0).toUpperCase() + component.type.slice(1).replace(/_/g, ' ');
  const categoryName = component.category.charAt(0).toUpperCase() + component.category.slice(1);

  return (
    <div className="flex flex-col max-h-[85vh] md:max-h-none">
      <div className="flex items-center gap-3 p-4 md:p-6 border-b border-gray-100">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">Edit Component</h2>
          <p className="text-sm text-gray-500">
            {componentName} ({categoryName})
          </p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
        <div className="grid grid-cols-2 gap-3">
          <InfoTile label={isSeasoning ? 'Current Stock (g)' : 'Current Stock'} value={component.quantity.toLocaleString()} />
          <InfoTile label={isSeasoning ? 'Current Cost / g' : 'Current Unit Cost'} value={`$${formatNumber(component.average_cost, isSeasoning)}`} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isSeasoning ? 'Set Quantity (g)' : 'Set Quantity'}
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input-touch"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isSeasoning ? 'Set Cost per Gram' : 'Set Average Unit Cost'}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step={isSeasoning ? '0.0001' : '0.01'}
              value={averageCost}
              onChange={(e) => setAverageCost(e.target.value)}
              className="input-touch pl-8"
            />
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">New Stock Level</span>
            <span className="font-semibold text-gray-900">
              {Number(quantity || 0).toLocaleString()}{isSeasoning ? ' g' : ''}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Projected Inventory Value</span>
            <span className="font-semibold text-gray-900">${totalValue.toFixed(2)}</span>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-3 p-4 md:p-6 border-t border-gray-100">
        <button onClick={onClose} disabled={loading} className="flex-1 btn-secondary">
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
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function calculateTotalValue(quantity: string, averageCost: string) {
  const qty = Number(quantity);
  const cost = Number(averageCost);

  if (Number.isNaN(qty) || Number.isNaN(cost)) {
    return 0;
  }

  return Number((qty * cost).toFixed(2));
}

function formatNumber(value: number, highPrecision = false) {
  if (value === undefined || value === null) return '0';
  const formatted = Number(value);
  if (Number.isNaN(formatted)) return '0';
  if (highPrecision) return formatted.toFixed(4);
  return Number.isInteger(formatted) ? formatted.toString() : formatted.toFixed(2);
}
