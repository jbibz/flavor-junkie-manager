import { useState, useEffect } from 'react';
import { Trash2, DollarSign, Loader2, Package } from 'lucide-react';
import { useProducts } from '../lib/hooks';
import { api } from '../lib/api';

interface AddSaleModalProps {
  onClose: () => void;
  onSave: () => void;
}

interface SaleItem {
  productId: string;
  productName: string;
  startingStock: number;
  endingStock: number | null;
  quantitySold: number;
  unitPrice: number;
  subtotal: number;
}

export default function AddSaleModal({ onClose, onSave }: AddSaleModalProps) {
  const { products, loading: productsLoading } = useProducts();
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventName, setEventName] = useState('Farmers Market');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!productsLoading && products.length > 0 && !initialized) {
      const allItems = products.map(product => ({
        productId: product.id,
        productName: `${product.name} (${product.size})`,
        startingStock: 0,
        endingStock: null as number | null,
        quantitySold: 0,
        unitPrice: product.price,
        subtotal: 0
      }));
      setItems(allItems);
      setInitialized(true);
    }
  }, [products, productsLoading, initialized]);

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof SaleItem, value: string | number | null) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'startingStock' || field === 'endingStock') {
      const starting = field === 'startingStock' ? parseInt(String(value)) || 0 : newItems[index].startingStock;
      const ending = field === 'endingStock' ? (value === '' || value === null ? null : parseInt(String(value))) : newItems[index].endingStock;
      newItems[index].endingStock = ending;
      if (ending !== null) {
        newItems[index].quantitySold = Math.max(0, starting - ending);
        newItems[index].subtotal = newItems[index].quantitySold * newItems[index].unitPrice;
      } else {
        newItems[index].quantitySold = 0;
        newItems[index].subtotal = 0;
      }
    }

    setItems(newItems);
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const itemsWithStock = items.filter(item => item.startingStock > 0);

      const salesItems = itemsWithStock.map(item => ({
        product_id: item.productId,
        product_name: item.productName,
        starting_stock: item.startingStock,
        ending_stock: item.endingStock ?? item.startingStock,
        quantity_sold: item.quantitySold,
        price_per_unit: item.unitPrice,
        subtotal: item.subtotal
      }));

      await api.sales.createEvent({
        event_name: eventName,
        event_date: eventDate,
        notes,
        items: salesItems
      });

      onSave();
    } catch (error) {
      console.error('Error saving sales event:', error);
      setError(error instanceof Error ? error.message : 'Failed to save sales event');
    } finally {
      setLoading(false);
    }
  }

  const itemsWithStock = items.filter(item => item.startingStock > 0);
  const totalRevenue = itemsWithStock.reduce((sum, item) => sum + item.subtotal, 0);
  const canSave = Boolean(eventDate && eventName && itemsWithStock.length > 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={onClose} />

      <div className="hidden md:flex fixed inset-0 items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-fade-in">
          <ModalContent
            productsLoading={productsLoading}
            eventDate={eventDate}
            setEventDate={setEventDate}
            eventName={eventName}
            setEventName={setEventName}
            notes={notes}
            setNotes={setNotes}
            items={items}
            itemsWithStock={itemsWithStock}
            totalRevenue={totalRevenue}
            canSave={canSave}
            loading={loading}
            error={error}
            onRemoveItem={removeItem}
            onUpdateItem={updateItem}
            onClose={onClose}
            onSubmit={handleSave}
          />
        </div>
      </div>

      <div className="md:hidden bottom-sheet animate-slide-up z-50">
        <div className="bottom-sheet-handle" />
        <ModalContent
          productsLoading={productsLoading}
          eventDate={eventDate}
          setEventDate={setEventDate}
          eventName={eventName}
          setEventName={setEventName}
          notes={notes}
          setNotes={setNotes}
          items={items}
          itemsWithStock={itemsWithStock}
          totalRevenue={totalRevenue}
          canSave={canSave}
          loading={loading}
          error={error}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
          onClose={onClose}
          onSubmit={handleSave}
        />
      </div>
    </>
  );
}

interface ModalContentProps {
  productsLoading: boolean;
  eventDate: string;
  setEventDate: (date: string) => void;
  eventName: string;
  setEventName: (name: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  items: SaleItem[];
  itemsWithStock: SaleItem[];
  totalRevenue: number;
  canSave: boolean;
  loading: boolean;
  error: string;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: keyof SaleItem, value: string | number | null) => void;
  onClose: () => void;
  onSubmit: () => void;
}

function ModalContent({
  productsLoading,
  eventDate,
  setEventDate,
  eventName,
  setEventName,
  notes,
  setNotes,
  items,
  itemsWithStock,
  totalRevenue,
  canSave,
  loading,
  error,
  onRemoveItem,
  onUpdateItem,
  onClose,
  onSubmit
}: ModalContentProps) {
  const pendingItems = itemsWithStock.filter(item => item.endingStock === null);
  const completedItems = itemsWithStock.filter(item => item.endingStock !== null);

  return (
    <div className="flex flex-col max-h-[85vh] md:max-h-[90vh]">
      <div className="flex items-center gap-3 p-4 md:p-6 border-b border-gray-100">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">Add Sales Event</h2>
          <p className="text-xs text-gray-500">Enter bottles brought to market</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="input-touch"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Name</label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g., Farmers Market"
              className="input-touch"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes about this sales event"
            rows={2}
            className="input-touch resize-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">Products</h3>
              <p className="text-xs text-gray-500">Set "Brought" to 0 if not bringing a product</p>
            </div>
          </div>

          {productsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
              <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No products found.</p>
              <p className="text-sm text-gray-500 mt-1">Add products in the Inventory section first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.productId}
                  className={`border rounded-xl p-3 transition-colors ${
                    item.startingStock > 0
                      ? 'border-orange-200 bg-orange-50/50'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 text-sm truncate flex-1 mr-2">
                      {item.productName}
                    </span>
                    {item.startingStock > 0 && (
                      <button
                        onClick={() => onRemoveItem(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">Brought</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={item.startingStock || ''}
                        onChange={(e) => onUpdateItem(idx, 'startingStock', e.target.value === '' ? 0 : parseInt(e.target.value))}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">Remaining</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={item.endingStock ?? ''}
                        onChange={(e) => onUpdateItem(idx, 'endingStock', e.target.value === '' ? null : e.target.value)}
                        placeholder="--"
                        disabled={item.startingStock === 0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>

                    <div className="text-center">
                      <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">Sold</label>
                      <div className={`py-2 px-3 rounded-lg text-sm font-bold ${
                        item.quantitySold > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {item.quantitySold > 0 ? item.quantitySold : '--'}
                      </div>
                    </div>
                  </div>

                  {item.startingStock > 0 && item.endingStock !== null && (
                    <div className="mt-2 pt-2 border-t border-gray-200 flex justify-end">
                      <span className="text-sm font-semibold text-green-600">
                        ${item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {itemsWithStock.length > 0 && (
          <div className="space-y-2">
            {pendingItems.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                <span className="font-medium">{pendingItems.length} product{pendingItems.length !== 1 ? 's' : ''}</span> awaiting "Remaining" count after event
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex justify-between items-center">
              <div>
                <span className="font-semibold text-gray-900">Total Revenue</span>
                {completedItems.length > 0 && (
                  <p className="text-xs text-gray-500">{completedItems.length} product{completedItems.length !== 1 ? 's' : ''} counted</p>
                )}
              </div>
              <span className="text-2xl font-bold text-orange-600">${totalRevenue.toFixed(2)}</span>
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
            'Save Event'
          )}
        </button>
      </div>
    </div>
  );
}
