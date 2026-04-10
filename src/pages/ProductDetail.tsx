import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Calculator, Package, Loader2, Edit3 } from 'lucide-react';
import { useProduct, useComponents, useProductionHistory } from '../lib/hooks';
import { api } from '../lib/api';
import type { RecipeIngredient, Product, Component } from '../lib/database.types';
import type { ToastType } from '../components/Toast';
import UnitToggle from '../components/UnitToggle';

interface ProductDetailProps {
  productId: string | undefined;
  onBack: () => void;
  showToast?: (type: ToastType, message: string) => void;
}

export default function ProductDetail({ productId, onBack, showToast }: ProductDetailProps) {
  const { product, recipe, loading } = useProduct(productId);
  const { components, reload: reloadComponents } = useComponents();
  const { history, reload: reloadHistory } = useProductionHistory(productId);
  const [desiredBottles, setDesiredBottles] = useState('');
  const [scaledRecipe, setScaledRecipe] = useState<{ factor: number; ingredients: RecipeIngredient[] } | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['margin']);
  const [makingBatch, setMakingBatch] = useState(false);
  const [showGrams, setShowGrams] = useState(true);
  const [manualQuantities, setManualQuantities] = useState<Record<string, string>>({});
  const [savingComponentId, setSavingComponentId] = useState<string | null>(null);

  if (loading || !product || !recipe) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  const ingredients = recipe.ingredients as unknown as RecipeIngredient[];

  function calculateRecipe() {
    const desired = parseInt(desiredBottles);
    if (desired <= 0 || !recipe) return;

    const factor = desired / recipe.original_batch_size;
    const scaled = ingredients.map(ing => ({
      ...ing,
      amount: Math.round(ing.amount * factor * 10) / 10
    }));

    setScaledRecipe({ factor, ingredients: scaled });
  }

  async function makeBatch() {
    if (!scaledRecipe || !product) return;

    setMakingBatch(true);
    const desired = parseInt(desiredBottles);
    const lidKey = product.lid_color.toLowerCase();
    const bottleKey = product.bottle_type.toLowerCase();

    const lidComponent = components.find(c => c.category === 'lids' && c.type === lidKey);
    const bottleComponent = components.find(c => c.category === 'bottles' && c.type === bottleKey);
    const labelComponent = findLabelComponent(product, components);
    const labelKey = labelComponent?.type ?? getProductLabelCandidates(product)[0];

    if (!lidComponent || !bottleComponent || !labelComponent) {
      showToast?.('error', 'Missing component data');
      setMakingBatch(false);
      return;
    }

    if (lidComponent.quantity < desired || bottleComponent.quantity < desired || labelComponent.quantity < desired) {
      showToast?.('error', 'Insufficient components in stock');
      setMakingBatch(false);
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
          bottles: `${bottleKey}: ${desired}`,
          labels: `${labelKey}: ${desired}`
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

      await api.components.update(labelComponent.id, {
        quantity: labelComponent.quantity - desired,
        average_cost: labelComponent.average_cost,
        total_value: (labelComponent.quantity - desired) * labelComponent.average_cost
      });

      reloadHistory();
      reloadComponents();
      setScaledRecipe(null);
      setDesiredBottles('');
      showToast?.('success', `Produced ${desired} units of ${product.name}`);
    } catch {
      showToast?.('error', 'Failed to create batch');
    } finally {
      setMakingBatch(false);
    }
  }

  function toggleSection(section: string) {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  }

  function convertAmount(amount: number, unit: string) {
    if (showGrams) {
      return `${amount}${unit}`;
    }
    const pounds = amount / 453.592;
    return `${(Math.round(pounds * 100) / 100).toFixed(2)}lbs`;
  }

  function convertTotalWeight(weight: number) {
    if (showGrams) {
      return `${weight}g`;
    }
    const pounds = weight / 453.592;
    return `${(Math.round(pounds * 100) / 100).toFixed(2)}lbs`;
  }

  const lidComponent = components.find(c => c.category === 'lids' && c.type === product.lid_color.toLowerCase());
  const bottleComponent = components.find(c => c.category === 'bottles' && c.type === product.bottle_type.toLowerCase());
  const labelComponent = findLabelComponent(product, components);

  function updateManualQuantity(componentId: string, value: string) {
    setManualQuantities((prev) => ({ ...prev, [componentId]: value }));
  }

  async function saveMaterialOverride(component: Component, label: string) {
    const rawValue = manualQuantities[component.id];
    const nextQty = Number(rawValue);

    if (!Number.isFinite(nextQty) || !Number.isInteger(nextQty) || nextQty < 0) {
      showToast?.('error', 'Enter a whole number quantity (0 or greater)');
      return;
    }

    setSavingComponentId(component.id);
    try {
      const averageCost = asNumber(component.average_cost);
      await api.components.update(component.id, {
        quantity: nextQty,
        average_cost: averageCost,
        total_value: nextQty * averageCost
      });

      await reloadComponents();
      setManualQuantities((prev) => {
        const updated = { ...prev };
        delete updated[component.id];
        return updated;
      });
      showToast?.('success', `${label} quantity updated`);
    } catch {
      showToast?.('error', `Failed to update ${label.toLowerCase()} quantity`);
    } finally {
      setSavingComponentId(null);
    }
  }

  const lidAverageCost = asNumber(lidComponent?.average_cost);
  const bottleAverageCost = asNumber(bottleComponent?.average_cost);
  const productPrice = asNumber(product.price);
  const componentCost = lidAverageCost + bottleAverageCost + 0.30;
  const ingredientCost = 1.50;
  const totalCost = componentCost + ingredientCost;
  const grossProfit = productPrice - totalCost;
  const profitMargin = productPrice > 0 ? (grossProfit / productPrice) * 100 : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 active:text-gray-900 transition-colors touch-target -ml-2 px-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Inventory</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{product.name}</h1>
          {product.size !== 'Regular' && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
              {product.size}
            </span>
          )}
          <p className="text-gray-600 mt-2 text-sm sm:text-base">{product.description}</p>

          <div className="grid grid-cols-2 gap-4 mt-5">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs sm:text-sm text-gray-500">Current Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{product.current_stock}</p>
              <p className="text-xs text-gray-400">units</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs sm:text-sm text-gray-500">Price</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">${productPrice.toFixed(2)}</p>
              <p className="text-xs text-gray-400">per unit</p>
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Material Stock</h2>
          <div className="space-y-2">
            <MaterialOverrideRow
              label={`Lid (${product.lid_color})`}
              component={lidComponent}
              value={lidComponent ? (manualQuantities[lidComponent.id] ?? '') : ''}
              saving={lidComponent ? savingComponentId === lidComponent.id : false}
              onChange={updateManualQuantity}
              onSave={saveMaterialOverride}
            />
            <MaterialOverrideRow
              label={`Bottle (${product.bottle_type})`}
              component={bottleComponent}
              value={bottleComponent ? (manualQuantities[bottleComponent.id] ?? '') : ''}
              saving={bottleComponent ? savingComponentId === bottleComponent.id : false}
              onChange={updateManualQuantity}
              onSave={saveMaterialOverride}
            />
            <MaterialOverrideRow
              label="Label"
              component={labelComponent}
              value={labelComponent ? (manualQuantities[labelComponent.id] ?? '') : ''}
              saving={labelComponent ? savingComponentId === labelComponent.id : false}
              onChange={updateManualQuantity}
              onSave={saveMaterialOverride}
            />
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Batch Calculator</h2>
          </div>
          <UnitToggle showGrams={showGrams} onToggle={() => setShowGrams(!showGrams)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">
              Original Recipe ({recipe.original_batch_size} bottles)
            </h3>
            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm">
                  <span className="text-gray-700">{ing.name}</span>
                  <span className="font-medium text-gray-900">{convertAmount(ing.amount, ing.unit)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center p-2 bg-orange-50 rounded-lg font-semibold text-sm">
                <span className="text-gray-900">Total Weight</span>
                <span className="text-orange-600">{convertTotalWeight(recipe.total_recipe_weight)}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Calculate Batch</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How many bottles?
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={desiredBottles}
                    onChange={(e) => setDesiredBottles(e.target.value)}
                    placeholder="Enter quantity"
                    className="input-touch flex-1"
                  />
                  <button
                    onClick={calculateRecipe}
                    className="btn-primary px-5"
                  >
                    Calculate
                  </button>
                </div>
              </div>

              {scaledRecipe && (
                <div className="border-2 border-orange-200 rounded-xl p-4 space-y-3 bg-orange-50/50">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Scaled Recipe</span>
                    <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded-lg">
                      {scaledRecipe.factor.toFixed(2)}x
                    </span>
                  </div>
                  {scaledRecipe.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{ing.name}</span>
                      <span className="font-semibold text-orange-600">
                        {showGrams ? `${ing.amount}${ing.unit}` : `${(ing.amount / 453.592).toFixed(2)}lbs`}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-orange-200">
                    <button
                      onClick={makeBatch}
                      disabled={makingBatch}
                      className="w-full btn-touch bg-green-600 text-white active:bg-green-700 disabled:opacity-50"
                    >
                      {makingBatch ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Creating Batch...
                        </>
                      ) : (
                        <>
                          <Package className="w-5 h-5 mr-2" />
                          Make This Batch
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Cost Analysis</h2>

        <div className={`p-4 sm:p-6 rounded-xl mb-4 ${
          profitMargin > 50 ? 'bg-green-50 border-2 border-green-200' :
          profitMargin > 30 ? 'bg-yellow-50 border-2 border-yellow-200' :
          'bg-red-50 border-2 border-red-200'
        }`}>
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Profit Margin</p>
          <p className={`text-3xl sm:text-4xl font-bold ${
            profitMargin > 50 ? 'text-green-600' :
            profitMargin > 30 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {profitMargin.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ${grossProfit.toFixed(2)} profit per unit
          </p>
        </div>

        <div className="space-y-2">
          <CollapsibleSection
            title="Component Costs"
            expanded={expandedSections.includes('components')}
            onToggle={() => toggleSection('components')}
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Lid</span>
                <span className="text-gray-900">${lidAverageCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bottle</span>
                <span className="text-gray-900">${bottleAverageCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Label</span>
                <span className="text-gray-900">$0.30</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-gray-100">
                <span className="text-gray-900">Total Packaging</span>
                <span className="text-gray-900">${componentCost.toFixed(2)}</span>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Full Breakdown"
            expanded={expandedSections.includes('full')}
            onToggle={() => toggleSection('full')}
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Components</span>
                <span className="text-gray-900">${componentCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ingredients</span>
                <span className="text-gray-900">${ingredientCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-gray-100">
                <span className="text-gray-900">Total Cost</span>
                <span className="text-gray-900">${totalCost.toFixed(2)}</span>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Profitability"
            expanded={expandedSections.includes('margin')}
            onToggle={() => toggleSection('margin')}
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Selling Price</span>
                <span className="text-gray-900">${productPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Cost</span>
                <span className="text-gray-900">${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-green-600 pt-2 border-t border-gray-100">
                <span>Gross Profit</span>
                <span>${grossProfit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-green-600">
                <span>Margin</span>
                <span>{profitMargin.toFixed(1)}%</span>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Production History</h2>
        {history.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No production history yet</p>
        ) : (
          <div className="space-y-3">
            {history.map(record => {
              const componentsUsed = record.components_used as Record<string, string>;
              return (
                <div key={record.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{record.quantity_made} units</p>
                      <p className="text-xs text-gray-500">
                        {new Date(record.production_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      Completed
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    {Object.entries(componentsUsed).map(([key, value]) => (
                      <p key={key} className="capitalize">{key}: {value}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => showToast?.('error', 'Product editing is not available yet')}
        className="fixed left-4 md:left-6 bottom-[calc(92px+env(safe-area-inset-bottom))] md:bottom-6 z-30 btn-touch bg-[#1e3a5f] text-white active:bg-[#2a4d78] px-4"
      >
        <Edit3 className="w-4 h-4 mr-2" />
        Edit Product
      </button>
    </div>
  );
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getProductLabelCandidates(product: Product) {
  const base = slugifyName(product.name);
  const normalizedHeat = base.replace('_plus_heat', '_heat');
  const uniqueBases = Array.from(new Set([normalizedHeat, base]));

  if (product.size === 'Big') {
    return uniqueBases.map((value) => `${value}_big`);
  }

  return uniqueBases;
}

function findLabelComponent(product: Product, components: Component[]) {
  const labels = components.filter((component) => component.category === 'labels');
  const candidates = getProductLabelCandidates(product);

  for (const candidate of candidates) {
    const exact = labels.find((label) => label.type === candidate);
    if (exact) return exact;
  }

  return labels.find((label) => candidates.some((candidate) => label.type.includes(candidate))) ?? null;
}

interface MaterialOverrideRowProps {
  label: string;
  component: Component | null | undefined;
  value: string;
  saving: boolean;
  onChange: (componentId: string, value: string) => void;
  onSave: (component: Component, label: string) => void;
}

function MaterialOverrideRow({
  label,
  component,
  value,
  saving,
  onChange,
  onSave
}: MaterialOverrideRowProps) {
  if (!component) {
    return (
      <div className="p-3 bg-red-50 rounded-xl border border-red-100">
        <p className="text-sm font-medium text-red-700">{label}</p>
        <p className="text-xs text-red-600 mt-1">Component not mapped</p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <div className="flex justify-between items-center gap-3 mb-2">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{component.quantity}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(component.id, event.target.value)}
          placeholder="Set qty"
          className="input-touch flex-1 h-10 text-sm"
        />
        <button
          onClick={() => onSave(component, label)}
          disabled={saving || value.trim() === ''}
          className="h-10 px-3 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Apply'}
        </button>
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, expanded, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-target"
      >
        <span className="font-semibold text-gray-900 text-sm sm:text-base">{title}</span>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {expanded && (
        <div className="p-4 pt-0 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}
