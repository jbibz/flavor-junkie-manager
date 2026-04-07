import { useState, useEffect } from 'react';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { useComponents } from '../lib/hooks';
import { api } from '../lib/api';

interface QuickComponentModalProps {
  onClose: () => void;
  onSuccess: (message?: string) => void;
}

export default function QuickComponentModal({ onClose, onSuccess }: QuickComponentModalProps) {
  const { components } = useComponents();
  const [selectedComponentId, setSelectedComponentId] = useState('');
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

  const selectedComponent = components.find(c => c.id === selectedComponentId);
  const costPerUnit = quantity && totalPaid ? (parseFloat(totalPaid) / parseFloat(quantity)).toFixed(2) : '0.00';

  async function handleSave() {
    if (!selectedComponent || !quantity || !totalPaid) return;

    const qty = parseInt(quantity);
    const paid = parseFloat(totalPaid);

    if (qty <= 0 || paid <= 0) {
      setError('Please enter valid quantity and price');
      return;
    }

    setLoading(true);
    setError('');

    const costPerUnitValue = paid / qty;
    const oldQty = selectedComponent.quantity;
    const oldCost = selectedComponent.average_cost;
    const newQty = oldQty + qty;
    const newAvgCost = (oldQty * oldCost + qty * costPerUnitValue) / newQty;
    const newTotalValue = newQty * newAvgCost;

    try {
      await api.components.addPurchase(selectedComponent.id, {
        quantity: qty,
        total_paid: paid
      });

      const name = selectedComponent.type.charAt(0).toUpperCase() + selectedComponent.type.slice(1);
      onSuccess(`Added ${qty} ${name} ${selectedComponent.category}`);
    } catch {
      setError('Failed to save purchase. Please try again.');
      setLoading(false);
    }
  }

  const canSave = Boolean(selectedComponentId && quantity && totalPaid &&
                  parseFloat(quantity) > 0 && parseFloat(totalPaid) > 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={onClose} />

      <div className="hidden md:flex fixed inset-0 items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full pointer-events-auto animate-fade-in">
          <ModalContent
            components={components}
            selectedComponentId={selectedComponentId}
            setSelectedComponentId={setSelectedComponentId}
            quantity={quantity}
            setQuantity={setQuantity}
            totalPaid={totalPaid}
            setTotalPaid={setTotalPaid}
            selectedComponent={selectedComponent}
            costPerUnit={costPerUnit}
            error={error}
            loading={loading}
            canSave={canSave}
            onClose={onClose}
            onSubmit={handleSave}
          />
        </div>
      </div>

      <div className="md:hidden bottom-sheet animate-slide-up z-50">
        <div className="bottom-sheet-handle" />
        <ModalContent
          components={components}
          selectedComponentId={selectedComponentId}
          setSelectedComponentId={setSelectedComponentId}
          quantity={quantity}
          setQuantity={setQuantity}
          totalPaid={totalPaid}
          setTotalPaid={setTotalPaid}
          selectedComponent={selectedComponent}
          costPerUnit={costPerUnit}
          error={error}
          loading={loading}
          canSave={canSave}
          onClose={onClose}
          onSubmit={handleSave}
        />
      </div>
    </>
  );
}

interface ComponentType {
  id: string;
  category: string;
  type: string;
  quantity: number;
  average_cost: number;
}

interface ModalContentProps {
  components: ComponentType[];
  selectedComponentId: string;
  setSelectedComponentId: (id: string) => void;
  quantity: string;
  setQuantity: (qty: string) => void;
  totalPaid: string;
  setTotalPaid: (paid: string) => void;
  selectedComponent: ComponentType | undefined;
  costPerUnit: string;
  error: string;
  loading: boolean;
  canSave: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

function ModalContent({
  components,
  selectedComponentId,
  setSelectedComponentId,
  quantity,
  setQuantity,
  totalPaid,
  setTotalPaid,
  selectedComponent,
  costPerUnit,
  error,
  loading,
  canSave,
  onClose,
  onSubmit
}: ModalContentProps) {
  return (
    <div className="flex flex-col max-h-[85vh] md:max-h-none">
      <div className="flex items-center gap-3 p-4 md:p-6 border-b border-gray-100">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-lg md:text-xl font-bold text-gray-900">Add Component Purchase</h2>
      </div>

      <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Component</label>
          <select
            value={selectedComponentId}
            onChange={(e) => setSelectedComponentId(e.target.value)}
            className="select-touch"
          >
            <option value="">Choose a component...</option>
            <optgroup label="Lids">
              {components.filter(c => c.category === 'lids').map(comp => (
                <option key={comp.id} value={comp.id}>
                  {comp.type.charAt(0).toUpperCase() + comp.type.slice(1)} Lids (Current: {comp.quantity})
                </option>
              ))}
            </optgroup>
            <optgroup label="Bottles">
              {components.filter(c => c.category === 'bottles').map(comp => (
                <option key={comp.id} value={comp.id}>
                  {comp.type.charAt(0).toUpperCase() + comp.type.slice(1)} Bottles (Current: {comp.quantity})
                </option>
              ))}
            </optgroup>
            <optgroup label="Labels">
              {components.filter(c => c.category === 'labels').map(comp => (
                <option key={comp.id} value={comp.id}>
                  {comp.type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} (Current: {comp.quantity})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Purchased</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
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

        {selectedComponent && quantity && totalPaid && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Cost per unit:</span>
              <span className="text-lg font-bold text-blue-600">${costPerUnit}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Current stock:</span>
              <span className="font-semibold text-gray-900">{selectedComponent.quantity}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">New stock:</span>
              <span className="font-semibold text-green-600">{selectedComponent.quantity + parseInt(quantity || '0')}</span>
            </div>
            <div className="pt-2 border-t border-blue-200">
              <p className="text-xs text-gray-600">
                Current avg: ${asNumber(selectedComponent.average_cost).toFixed(2)} &rarr; New avg: $
                {((selectedComponent.quantity * asNumber(selectedComponent.average_cost) + parseFloat(totalPaid || '0')) /
                  (selectedComponent.quantity + parseInt(quantity || '0'))).toFixed(2)}
              </p>
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
          className="flex-1 btn-touch bg-blue-600 text-white active:bg-blue-700 disabled:opacity-50 disabled:active:scale-100"
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

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
