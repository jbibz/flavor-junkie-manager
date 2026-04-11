import { useEffect, useState } from 'react';
import { Edit3, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Product } from '../lib/database.types';

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onSave: () => void;
}

interface EditProductForm {
  name: string;
  size: string;
  current_stock: string;
  min_stock_level: string;
  lid_color: string;
  bottle_type: string;
  price: string;
  description: string;
}

export default function EditProductModal({ product, onClose, onSave }: EditProductModalProps) {
  const [form, setForm] = useState<EditProductForm>({
    name: product.name,
    size: product.size,
    current_stock: String(product.current_stock),
    min_stock_level: String(product.min_stock_level),
    lid_color: product.lid_color,
    bottle_type: product.bottle_type,
    price: String(product.price),
    description: product.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    setForm({
      name: product.name,
      size: product.size,
      current_stock: String(product.current_stock),
      min_stock_level: String(product.min_stock_level),
      lid_color: product.lid_color,
      bottle_type: product.bottle_type,
      price: String(product.price),
      description: product.description || '',
    });
  }, [product]);

  const canSave =
    form.name.trim() !== '' &&
    form.size.trim() !== '' &&
    form.lid_color.trim() !== '' &&
    form.bottle_type.trim() !== '' &&
    Number(form.current_stock) >= 0 &&
    Number(form.min_stock_level) >= 0 &&
    Number(form.price) >= 0;

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!canSave) return;

    setLoading(true);
    setError('');

    try {
      await api.products.update(product.id, {
        name: form.name.trim(),
        size: form.size.trim(),
        current_stock: Number(form.current_stock),
        min_stock_level: Number(form.min_stock_level),
        lid_color: form.lid_color.trim(),
        bottle_type: form.bottle_type.trim(),
        price: Number(form.price),
        description: form.description.trim(),
      });
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={onClose} />

      <div className="hidden md:flex fixed inset-0 items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-fade-in">
          <ModalContent
            form={form}
            canSave={canSave}
            loading={loading}
            error={error}
            onClose={onClose}
            onChange={updateField}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      <div className="md:hidden bottom-sheet animate-slide-up z-50">
        <div className="bottom-sheet-handle" />
        <ModalContent
          form={form}
          canSave={canSave}
          loading={loading}
          error={error}
          onClose={onClose}
          onChange={updateField}
          onSubmit={handleSubmit}
        />
      </div>
    </>
  );
}

interface ModalContentProps {
  form: EditProductForm;
  canSave: boolean;
  loading: boolean;
  error: string;
  onClose: () => void;
  onChange: (field: keyof EditProductForm, value: string) => void;
  onSubmit: () => void;
}

function ModalContent({ form, canSave, loading, error, onClose, onChange, onSubmit }: ModalContentProps) {
  return (
    <div className="flex flex-col max-h-[85vh] md:max-h-[90vh]">
      <div className="flex items-center gap-3 p-4 md:p-6 border-b border-gray-100">
        <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
          <Edit3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">Edit Product</h2>
          <p className="text-xs text-gray-500">Update inventory, packaging, and pricing details</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Product Name">
            <input
              type="text"
              value={form.name}
              onChange={(event) => onChange('name', event.target.value)}
              className="input-touch"
            />
          </Field>
          <Field label="Size">
            <select
              value={form.size}
              onChange={(event) => onChange('size', event.target.value)}
              className="select-touch"
            >
              <option value="Regular">Regular</option>
              <option value="Big">Big</option>
            </select>
          </Field>
          <Field label="Current Stock">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={form.current_stock}
              onChange={(event) => onChange('current_stock', event.target.value)}
              className="input-touch"
            />
          </Field>
          <Field label="Minimum Stock Level">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={form.min_stock_level}
              onChange={(event) => onChange('min_stock_level', event.target.value)}
              className="input-touch"
            />
          </Field>
          <Field label="Lid Color">
            <input
              type="text"
              value={form.lid_color}
              onChange={(event) => onChange('lid_color', event.target.value)}
              className="input-touch"
            />
          </Field>
          <Field label="Bottle Type">
            <input
              type="text"
              value={form.bottle_type}
              onChange={(event) => onChange('bottle_type', event.target.value)}
              className="input-touch"
            />
          </Field>
          <Field label="Price">
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.price}
              onChange={(event) => onChange('price', event.target.value)}
              className="input-touch"
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(event) => onChange('description', event.target.value)}
            rows={4}
            className="input-touch resize-none"
          />
        </Field>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
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
            'Save Product'
          )}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {children}
    </div>
  );
}
