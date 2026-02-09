import { useState, useEffect } from 'react';
import { Edit2, Loader2, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { SalesEvent } from '../lib/database.types';

interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  startingStock: number;
  endingStock: number | null;
  quantitySold: number;
  unitPrice: number;
  subtotal: number;
}

interface EditSaleModalProps {
  event: SalesEvent;
  onClose: () => void;
  onSave: () => void;
}

export default function EditSaleModal({ event, onClose, onSave }: EditSaleModalProps) {
  const [eventDate, setEventDate] = useState(event.event_date);
  const [eventName, setEventName] = useState(event.event_name);
  const [notes, setNotes] = useState(event.notes || '');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    loadItems();
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  async function loadItems() {
    try {
      const response = await api.sales.getEvent(event.id);
      if (response && response.items) {
        setItems(response.items.map(item => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          startingStock: item.starting_stock,
          endingStock: item.ending_stock,
          quantitySold: item.quantity_sold,
          unitPrice: item.unit_price,
          subtotal: item.subtotal
        })));
      }
    } catch (error) {
      console.error('Error loading sales items:', error);
    }
    setLoading(false);
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
    setSaving(true);
    try {
      await api.sales.updateEvent(event.id, {
        market_name: eventName,
        event_date: eventDate,
        items: items.map(item => ({
          product_id: item.productId,
          product_name: item.productName,
          quantity_sold: item.quantitySold,
          price_per_unit: item.unitPrice
        }))
      });
      onSave();
    } catch (error) {
      console.error('Error saving sales event:', error);
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.sales.deleteEvent(event.id);
      onSave();
    } catch (error) {
      console.error('Error deleting sales event:', error);
      setDeleting(false);
    }
  }

  const totalRevenue = items.reduce((sum, item) => sum + item.subtotal, 0);
  const pendingItems = items.filter(item => item.endingStock === null);
  const completedItems = items.filter(item => item.endingStock !== null);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={onClose} />

      <div className="hidden md:flex fixed inset-0 items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-fade-in">
          <ModalContent
            eventDate={eventDate}
            setEventDate={setEventDate}
            eventName={eventName}
            setEventName={setEventName}
            notes={notes}
            setNotes={setNotes}
            items={items}
            pendingItems={pendingItems}
            completedItems={completedItems}
            totalRevenue={totalRevenue}
            loading={loading}
            saving={saving}
            deleting={deleting}
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
            onUpdateItem={updateItem}
            onClose={onClose}
            onSubmit={handleSave}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <div className="md:hidden bottom-sheet animate-slide-up z-50">
        <div className="bottom-sheet-handle" />
        <ModalContent
          eventDate={eventDate}
          setEventDate={setEventDate}
          eventName={eventName}
          setEventName={setEventName}
          notes={notes}
          setNotes={setNotes}
          items={items}
          pendingItems={pendingItems}
          completedItems={completedItems}
          totalRevenue={totalRevenue}
          loading={loading}
          saving={saving}
          deleting={deleting}
          showDeleteConfirm={showDeleteConfirm}
          setShowDeleteConfirm={setShowDeleteConfirm}
          onUpdateItem={updateItem}
          onClose={onClose}
          onSubmit={handleSave}
          onDelete={handleDelete}
        />
      </div>
    </>
  );
}

interface ModalContentProps {
  eventDate: string;
  setEventDate: (date: string) => void;
  eventName: string;
  setEventName: (name: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  items: SaleItem[];
  pendingItems: SaleItem[];
  completedItems: SaleItem[];
  totalRevenue: number;
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  onUpdateItem: (index: number, field: keyof SaleItem, value: string | number | null) => void;
  onClose: () => void;
  onSubmit: () => void;
  onDelete: () => void;
}

function ModalContent({
  eventDate,
  setEventDate,
  eventName,
  setEventName,
  notes,
  setNotes,
  items,
  pendingItems,
  completedItems,
  totalRevenue,
  loading,
  saving,
  deleting,
  showDeleteConfirm,
  setShowDeleteConfirm,
  onUpdateItem,
  onClose,
  onSubmit,
  onDelete
}: ModalContentProps) {
  return (
    <div className="flex flex-col max-h-[85vh] md:max-h-[90vh]">
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Edit2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Edit Sales Event</h2>
            <p className="text-xs text-gray-500">Update event details and remaining counts</p>
          </div>
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
              <p className="text-xs text-gray-500">Enter "Remaining" after the event ends</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`border rounded-xl p-3 transition-colors ${
                    item.endingStock !== null
                      ? 'border-green-200 bg-green-50/50'
                      : 'border-amber-200 bg-amber-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 text-sm truncate flex-1 mr-2">
                      {item.productName}
                    </span>
                    {item.endingStock !== null && (
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                        Complete
                      </span>
                    )}
                    {item.endingStock === null && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
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

                  {item.endingStock !== null && (
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

        {items.length > 0 && (
          <div className="space-y-2">
            {pendingItems.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                <span className="font-medium">{pendingItems.length} product{pendingItems.length !== 1 ? 's' : ''}</span> still need "Remaining" count
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex justify-between items-center">
              <div>
                <span className="font-semibold text-gray-900">Total Revenue</span>
                {completedItems.length > 0 && (
                  <p className="text-xs text-gray-500">{completedItems.length} of {items.length} products counted</p>
                )}
              </div>
              <span className="text-2xl font-bold text-orange-600">${totalRevenue.toFixed(2)}</span>
            </div>
          </div>
        )}

        {showDeleteConfirm ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-800 font-medium mb-3">Delete this sales event? This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Event
          </button>
        )}
      </div>

      <div className="flex gap-3 p-4 md:p-6 border-t border-gray-100">
        <button
          onClick={onClose}
          disabled={saving || deleting}
          className="flex-1 btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={saving || deleting || loading}
          className="flex-1 btn-primary disabled:opacity-50 disabled:active:scale-100"
        >
          {saving ? (
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
