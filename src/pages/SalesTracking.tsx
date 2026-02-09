import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Loader2, X, Edit2 } from 'lucide-react';
import { useSalesEvents } from '../lib/hooks';
import type { SalesEvent } from '../lib/database.types';
import type { ToastType } from '../components/Toast';
import AddSaleModal from '../components/AddSaleModal';
import EditSaleModal from '../components/EditSaleModal';

interface SalesTrackingProps {
  showToast?: (type: ToastType, message: string) => void;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  bgColor: string;
}

function StatCard({ label, value, icon, bgColor }: StatCardProps) {
  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">{label}</p>
          <p className="text-xl sm:text-3xl font-bold mt-1 text-gray-900">{value}</p>
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bgColor} rounded-xl flex items-center justify-center flex-shrink-0 ml-2`}>
          <span className="text-lg sm:text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}

export default function SalesTracking({ showToast }: SalesTrackingProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  );
  const { events, loading, reload } = useSalesEvents(selectedMonth);
  const [addSaleModalOpen, setAddSaleModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SalesEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<SalesEvent | null>(null);
  const [totalUnits, setTotalUnits] = useState(0);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const year = parseInt(selectedMonth.split('-')[0]);
  const month = parseInt(selectedMonth.split('-')[1]) - 1;

  useEffect(() => {
    loadMonthStats();
  }, [events]);

  async function loadMonthStats() {
    if (events.length === 0) {
      setTotalUnits(0);
      return;
    }

    const eventIds = events.map(e => e.id);
    const { data: items } = await supabase
      .from('sales_items')
      .select('quantity_sold')
      .in('sales_event_id', eventIds);

    const units = items?.reduce((sum, item) => sum + item.quantity_sold, 0) || 0;
    setTotalUnits(units);
  }

  function previousMonth() {
    const newDate = new Date(year, month - 1);
    setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
  }

  function nextMonth() {
    const newDate = new Date(year, month + 1);
    setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
  }

  function goToToday() {
    const today = new Date();
    setSelectedMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  }

  function getDaysInMonth() {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }

  function getEventForDate(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.find(e => e.event_date === dateStr);
  }

  const days = getDaysInMonth();
  const monthRevenue = events.reduce((sum, e) => sum + e.total_revenue, 0);
  const marketDays = events.length;
  const avgPerMarket = marketDays > 0 ? monthRevenue / marketDays : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales</h1>
          <p className="text-sm text-gray-500 mt-1">Track revenue and events</p>
        </div>
        <button
          onClick={() => setAddSaleModalOpen(true)}
          className="flex items-center gap-2 btn-primary px-4 sm:px-5"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Sale</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Units Sold"
          value={totalUnits.toString()}
          icon="📦"
          bgColor="bg-orange-100"
        />
        <StatCard
          label="Total Revenue"
          value={`$${monthRevenue >= 1000 ? `${(monthRevenue / 1000).toFixed(1)}k` : monthRevenue.toFixed(0)}`}
          icon="💰"
          bgColor="bg-amber-100"
        />
        <StatCard
          label="Average per Market"
          value={`$${avgPerMarket >= 1000 ? `${(avgPerMarket / 1000).toFixed(1)}k` : avgPerMarket.toFixed(0)}`}
          icon="📊"
          bgColor="bg-yellow-100"
        />
        <StatCard
          label="Market Days"
          value={marketDays.toString()}
          icon="📅"
          bgColor="bg-orange-100"
        />
      </div>

      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button
            onClick={previousMonth}
            className="p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors touch-target"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
              <span className="sm:hidden">{shortMonthNames[month]} {year}</span>
              <span className="hidden sm:inline">{monthNames[month]} {year}</span>
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-xs sm:text-sm bg-[#1e3a5f] text-white rounded-lg active:bg-[#2a4d78] transition-colors font-medium"
            >
              Today
            </button>
          </div>

          <button
            onClick={nextMonth}
            className="p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors touch-target"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <div key={idx} className="text-center font-semibold text-gray-500 text-[10px] sm:text-sm py-2 sm:py-3 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (!day) {
              return <div key={idx} className="aspect-square bg-gray-50/50 rounded-lg" />;
            }

            const event = getEventForDate(day);
            const hasEvent = !!event;
            const isToday = day === currentDate.getDate() &&
              month === currentDate.getMonth() &&
              year === currentDate.getFullYear();

            return (
              <button
                key={idx}
                onClick={() => hasEvent && setSelectedEvent(event)}
                disabled={!hasEvent}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-center transition-all duration-150 touch-target ${
                  hasEvent
                    ? 'bg-gradient-to-br from-orange-500 to-orange-600 active:from-orange-600 active:to-orange-700 shadow-md active:scale-95'
                    : isToday
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-gray-50'
                }`}
              >
                <div className={`text-[10px] sm:text-sm font-bold ${
                  hasEvent ? 'text-white/90' : isToday ? 'text-white' : 'text-gray-700'
                }`}>
                  {day}
                </div>
                {hasEvent && (
                  <div className="text-xs sm:text-lg font-bold text-white leading-tight">
                    ${event.total_revenue >= 1000 ? `${(event.total_revenue / 1000).toFixed(1)}k` : event.total_revenue.toFixed(0)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {monthRevenue > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm text-gray-600">Month Total</span>
            <span className="text-lg sm:text-xl font-bold text-orange-600">${monthRevenue.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Events This Month</h2>
        {events.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No sales events this month</p>
            <p className="text-gray-400 text-sm mt-1">Tap + to record your first event</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="w-full card-interactive p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 truncate text-sm sm:text-base">{event.event_name}</h3>
                      <span className="flex-shrink-0 px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] sm:text-xs font-medium rounded-full">
                        {new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long'
                      })}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg sm:text-2xl font-bold text-orange-600">
                      ${event.total_revenue.toFixed(0)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {addSaleModalOpen && (
        <AddSaleModal
          onClose={() => setAddSaleModalOpen(false)}
          onSave={() => {
            reload();
            setAddSaleModalOpen(false);
            showToast?.('success', 'Sales event saved');
          }}
        />
      )}

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => {
            setEditingEvent(selectedEvent);
            setSelectedEvent(null);
          }}
        />
      )}

      {editingEvent && (
        <EditSaleModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={() => {
            reload();
            setEditingEvent(null);
            showToast?.('success', 'Sales event updated');
          }}
        />
      )}
    </div>
  );
}

interface EventDetailsModalProps {
  event: SalesEvent;
  onClose: () => void;
  onEdit: () => void;
}

function EventDetailsModal({ event, onClose, onEdit }: EventDetailsModalProps) {
  const [items, setItems] = useState<Array<{
    id: string;
    product_name: string;
    starting_stock: number;
    ending_stock: number;
    quantity_sold: number;
    unit_price: number;
    subtotal: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [event.id]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  async function loadItems() {
    const { data } = await supabase
      .from('sales_items')
      .select('*')
      .eq('sales_event_id', event.id);
    if (data) setItems(data);
    setLoading(false);
  }

  const hasPendingItems = items.some(item => item.ending_stock === item.starting_stock && item.quantity_sold === 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={onClose} />

      <div className="hidden md:flex fixed inset-0 items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-fade-in">
          <ModalContent event={event} items={items} loading={loading} onClose={onClose} onEdit={onEdit} hasPendingItems={hasPendingItems} />
        </div>
      </div>

      <div className="md:hidden bottom-sheet animate-slide-up z-50">
        <div className="bottom-sheet-handle" />
        <ModalContent event={event} items={items} loading={loading} onClose={onClose} onEdit={onEdit} hasPendingItems={hasPendingItems} />
      </div>
    </>
  );
}

interface ModalContentProps {
  event: SalesEvent;
  items: Array<{
    id: string;
    product_name: string;
    starting_stock: number;
    ending_stock: number;
    quantity_sold: number;
    unit_price: number;
    subtotal: number;
  }>;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  hasPendingItems: boolean;
}

function ModalContent({ event, items, loading, onClose, onEdit, hasPendingItems }: ModalContentProps) {
  return (
    <div className="flex flex-col max-h-[85vh] md:max-h-[90vh]">
      <div className="flex items-start justify-between p-4 md:p-6 border-b border-gray-100">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">{event.event_name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors touch-target"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
        {hasPendingItems && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            Some products need "Remaining" counts. Tap <span className="font-semibold">Edit Event</span> to complete.
          </div>
        )}

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 md:p-5 text-white">
          <p className="text-sm text-white/80 mb-1">Total Revenue</p>
          <p className="text-3xl md:text-4xl font-bold">${event.total_revenue.toFixed(2)}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
          </div>
        ) : items.length > 0 ? (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Products</h3>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="p-3 md:p-4 bg-gray-50 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-gray-900 text-sm sm:text-base">{item.product_name}</p>
                    <p className="font-bold text-green-600">${item.subtotal.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-500">
                    <span>Brought: <span className="font-medium text-gray-700">{item.starting_stock}</span></span>
                    <span>Remaining: <span className="font-medium text-gray-700">{item.ending_stock}</span></span>
                    <span>Sold: <span className="font-semibold text-green-600">{item.quantity_sold}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {event.notes && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Notes</h3>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 md:p-4 rounded-xl">{event.notes}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 p-4 md:p-6 border-t border-gray-100">
        <button
          onClick={onClose}
          className="flex-1 btn-secondary"
        >
          Close
        </button>
        <button
          onClick={onEdit}
          className="flex-1 btn-primary flex items-center justify-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Edit Event
        </button>
      </div>
    </div>
  );
}
