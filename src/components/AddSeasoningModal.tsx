import { useEffect, useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';

interface AddSeasoningModalProps {
  onClose: () => void;
  onSave: (payload: { name: string; grams: number; totalPaid: number }) => Promise<void>;
}

const GRAMS_PER_POUND = 453.592;

export default function AddSeasoningModal({ onClose, onSave }: AddSeasoningModalProps) {
  const [name, setName] = useState('');
  const [weightLb, setWeightLb] = useState('');
  const [totalPaid, setTotalPaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const pounds = Number(weightLb);
  const paid = Number(totalPaid);
  const grams = Number.isFinite(pounds) && pounds > 0 ? Math.round(pounds * GRAMS_PER_POUND) : 0;
  const costPerGram = grams > 0 && Number.isFinite(paid) && paid > 0 ? paid / grams : 0;

  const canSave =
    name.trim().length > 0 &&
    Number.isFinite(pounds) &&
    pounds > 0 &&
    Number.isFinite(paid) &&
    paid > 0 &&
    grams > 0;

  async function handleSave() {
    if (!canSave) return;

    setLoading(true);
    setError('');

    try {
      await onSave({
        name: name.trim(),
        grams,
        totalPaid: paid,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add seasoning');
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={onClose} />

      <div className="hidden md:flex fixed inset-0 items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full pointer-events-auto animate-fade-in">
          <ModalContent
            name={name}
            setName={setName}
            weightLb={weightLb}
            setWeightLb={setWeightLb}
            totalPaid={totalPaid}
            setTotalPaid={setTotalPaid}
            grams={grams}
            costPerGram={costPerGram}
            canSave={canSave}
            loading={loading}
            error={error}
            onClose={onClose}
            onSubmit={handleSave}
          />
        </div>
      </div>

      <div className="md:hidden bottom-sheet animate-slide-up z-50">
        <div className="bottom-sheet-handle" />
        <ModalContent
          name={name}
          setName={setName}
          weightLb={weightLb}
          setWeightLb={setWeightLb}
          totalPaid={totalPaid}
          setTotalPaid={setTotalPaid}
          grams={grams}
          costPerGram={costPerGram}
          canSave={canSave}
          loading={loading}
          error={error}
          onClose={onClose}
          onSubmit={handleSave}
        />
      </div>
    </>
  );
}

interface ModalContentProps {
  name: string;
  setName: (value: string) => void;
  weightLb: string;
  setWeightLb: (value: string) => void;
  totalPaid: string;
  setTotalPaid: (value: string) => void;
  grams: number;
  costPerGram: number;
  canSave: boolean;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => void;
}

function ModalContent({
  name,
  setName,
  weightLb,
  setWeightLb,
  totalPaid,
  setTotalPaid,
  grams,
  costPerGram,
  canSave,
  loading,
  error,
  onClose,
  onSubmit,
}: ModalContentProps) {
  return (
    <div className="flex flex-col max-h-[85vh] md:max-h-none">
      <div className="flex items-center gap-3 p-4 md:p-6 border-b border-gray-100">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">Add Seasoning</h2>
          <p className="text-sm text-gray-500">Track grams and cost per gram</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ingredient Name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ex: Sea Salt"
            className="input-touch"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Weight Purchased (lb)</label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={weightLb}
            onChange={(event) => setWeightLb(event.target.value)}
            placeholder="ex: 25"
            className="input-touch"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Total Cost Paid</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={totalPaid}
              onChange={(event) => setTotalPaid(event.target.value)}
              placeholder="0.00"
              className="input-touch pl-8"
            />
          </div>
        </div>

        {(weightLb || totalPaid) && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total grams</span>
              <span className="font-semibold text-gray-900">{grams.toLocaleString()} g</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Cost per gram</span>
              <span className="text-lg font-bold text-emerald-700">${costPerGram.toFixed(4)}</span>
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
        <button onClick={onClose} disabled={loading} className="flex-1 btn-secondary">
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSave || loading}
          className="flex-1 btn-touch bg-emerald-700 text-white active:bg-emerald-800 disabled:opacity-50 disabled:active:scale-100"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Add Seasoning'
          )}
        </button>
      </div>
    </div>
  );
}
