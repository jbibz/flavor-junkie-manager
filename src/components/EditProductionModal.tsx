import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { ProductionHistory } from '../lib/database.types';

interface EditProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ProductionHistory;
  onSuccess: () => void;
}

export default function EditProductionModal({
  isOpen,
  onClose,
  record,
  onSuccess,
}: EditProductionModalProps) {
  const [productionDate, setProductionDate] = useState('');
  const [quantityMade, setQuantityMade] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (record) {
      setProductionDate(record.production_date.split('T')[0]);
      setQuantityMade(record.quantity_made.toString());
      setNotes(record.notes || '');
    }
  }, [record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const newQuantity = parseInt(quantityMade);
      const oldQuantity = record.quantity_made;
      const quantityDiff = newQuantity - oldQuantity;

      const { error: updateError } = await supabase
        .from('production_history')
        .update({
          production_date: productionDate,
          quantity_made: newQuantity,
          notes: notes.trim(),
        })
        .eq('id', record.id);

      if (updateError) throw updateError;

      if (quantityDiff !== 0) {
        const { data: product } = await supabase
          .from('products')
          .select('current_stock')
          .eq('id', record.product_id)
          .single();

        if (product) {
          const { error: stockError } = await supabase
            .from('products')
            .update({
              current_stock: product.current_stock + quantityDiff,
            })
            .eq('id', record.product_id);

          if (stockError) throw stockError;
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update production record');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 border-b border-orange-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Edit Production Record</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <input
              type="text"
              value={record.product_name}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Production Date
            </label>
            <input
              type="date"
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity Made
            </label>
            <input
              type="number"
              value={quantityMade}
              onChange={(e) => setQuantityMade(e.target.value)}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
            {parseInt(quantityMade) !== record.quantity_made && (
              <p className="text-xs text-orange-600 mt-1">
                Stock will be adjusted by {parseInt(quantityMade) - record.quantity_made} units
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Add any notes about this batch..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
