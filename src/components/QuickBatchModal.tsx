import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Loader2 } from 'lucide-react';
import { useProducts, useComponents } from '../lib/hooks';
import { api } from '../lib/api';

interface QuickBatchModalProps {
  onClose: () => void;
  onSuccess: (message?: string) => void;
}

export default function QuickBatchModal({ onClose, onSuccess }: QuickBatchModalProps) {
  const { products } = useProducts();
  const { components } = useComponents();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  async function handleMakeBatch() {
    if (!selectedProductId || !quantity || parseInt(quantity) <= 0) {
      setError('Please select a product and enter a valid quantity');
      return;
    }

    setLoading(true);
    setError('');

    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      setError('Product not found');
      setLoading(false);
      return;
    }

    const desired = parseInt(quantity);
    const lidKey = product.lid_color.toLowerCase();
    const bottleKey = product.bottle_type.toLowerCase();

    const lidComponent = components.find(c => c.category === 'lids' && c.type === lidKey);
    const bottleComponent = components.find(c => c.category === 'bottles' && c.type === bottleKey);

    if (!lidComponent || !bottleComponent) {
      setError('Missing component data');
      setLoading(false);
      return;
    }

    if (lidComponent.quantity < desired || bottleComponent.quantity < desired) {
      setError(`Insufficient components: Need ${desired} of each. Available: ${lidComponent.quantity} lids, ${bottleComponent.quantity} bottles`);
      setLoading(false);
      return;
    }

    try {
      await api.production.create({
        production_date: new Date().toISOString().split('T')[0],
        product_id: product.id,
        product_name: `${product.name} (${product.size})`,
        quantity_made: desired,
        components_used: {
          lids: `${lidKey}: ${desired}`,
          bottles: `${bottleKey}: ${desired}`
        },
        notes: ''
      });

      await api.components.update(lidComponent.id, {
        quantity: lidComponent.quantity - desired,
        average_cost: lidComponent.average_cost,
        total_value: (lidComponent.quantity - desired) * lidComponent.average_cost
      });

      await api.components.update(bottleComponent.id, {
        quantity: bottleComponent.quantity - desired,
        average_cost: bottleComponent.average_cost,
        total_value: (bottleComponent.quantity - desired) * bottleComponent.average_cost
      });

      onSuccess(`Created ${desired} units of ${product.name}`);
    } catch {
      setError('Failed to create batch. Please try again.');
      setLoading(false);
    }
  }

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const canProduce = Boolean(selectedProduct && quantity && (() => {
    const lidKey = selectedProduct.lid_color.toLowerCase();
    const bottleKey = selectedProduct.bottle_type.toLowerCase();
    const lidComponent = components.find(c => c.category === 'lids' && c.type === lidKey);
    const bottleComponent = components.find(c => c.category === 'bottles' && c.type === bottleKey);
    const desired = parseInt(quantity) || 0;
    return lidComponent && bottleComponent &&
           lidComponent.quantity >= desired &&
           bottleComponent.quantity >= desired;
  })());

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={onClose} />

      <div className="hidden md:flex fixed inset-0 items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full pointer-events-auto animate-fade-in">
          <ModalContent
            products={products}
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            quantity={quantity}
            setQuantity={setQuantity}
            selectedProduct={selectedProduct}
            canProduce={canProduce}
            error={error}
            loading={loading}
            onClose={onClose}
            onSubmit={handleMakeBatch}
          />
        </div>
      </div>

      <div className="md:hidden bottom-sheet animate-slide-up z-50">
        <div className="bottom-sheet-handle" />
        <ModalContent
          products={products}
          selectedProductId={selectedProductId}
          setSelectedProductId={setSelectedProductId}
          quantity={quantity}
          setQuantity={setQuantity}
          selectedProduct={selectedProduct}
          canProduce={canProduce}
          error={error}
          loading={loading}
          onClose={onClose}
          onSubmit={handleMakeBatch}
        />
      </div>
    </>
  );
}

interface ModalContentProps {
  products: Array<{ id: string; name: string; size: string; current_stock: number; lid_color: string; bottle_type: string }>;
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  quantity: string;
  setQuantity: (qty: string) => void;
  selectedProduct: { name: string; lid_color: string; bottle_type: string; current_stock: number } | undefined;
  canProduce: boolean;
  error: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

function ModalContent({
  products,
  selectedProductId,
  setSelectedProductId,
  quantity,
  setQuantity,
  selectedProduct,
  canProduce,
  error,
  loading,
  onClose,
  onSubmit
}: ModalContentProps) {
  return (
    <div className="flex flex-col max-h-[85vh] md:max-h-none">
      <div className="flex items-center gap-3 p-4 md:p-6 border-b border-gray-100">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <Package className="w-5 h-5 text-green-600" />
        </div>
        <h2 className="text-lg md:text-xl font-bold text-gray-900">Quick Batch Production</h2>
      </div>

      <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Product</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="select-touch"
          >
            <option value="">Choose a product...</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.size})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quantity to Produce</label>
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

        {selectedProduct && quantity && (
          <div className={`p-4 rounded-xl border-2 ${canProduce ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-3">
              {canProduce ? (
                <>
                  <Package className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-green-900 mb-1">Components Available</p>
                    <p className="text-sm text-green-700">
                      Will use {quantity} {selectedProduct.lid_color} lids and {quantity} {selectedProduct.bottle_type} bottles
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      New stock: {selectedProduct.current_stock} &rarr; {selectedProduct.current_stock + parseInt(quantity)} units
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-red-900 mb-1">Insufficient Components</p>
                    <p className="text-sm text-red-700">
                      Not enough lids or bottles in stock to produce {quantity} units
                    </p>
                  </div>
                </>
              )}
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
          disabled={!canProduce || loading}
          className="flex-1 btn-touch bg-green-600 text-white active:bg-green-700 disabled:opacity-50 disabled:active:scale-100"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Creating...
            </>
          ) : (
            'Create Batch'
          )}
        </button>
      </div>
    </div>
  );
}
