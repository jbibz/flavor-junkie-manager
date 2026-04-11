import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, PieChart } from 'lucide-react';
import { api } from '../lib/api';
import type { SalesEvent, SalesItem } from '../lib/database.types';

interface AnalyticsData {
  totalUnits: number;
  totalRevenue: number;
  avgPerMarket: number;
  marketDays: number;
  productBreakdown: { name: string; units: number; revenue: number }[];
  salesTrend: { date: string; units: number; revenue: number }[];
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

export default function SalesAnalytics() {
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<AnalyticsData>({
    totalUnits: 0,
    totalRevenue: 0,
    avgPerMarket: 0,
    marketDays: 0,
    productBreakdown: [],
    salesTrend: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [dateFilter, customStart, customEnd]);

  async function loadAnalytics() {
    setLoading(true);

    let startDate = '';
    let endDate = new Date().toISOString().split('T')[0];

    const now = new Date();
    if (dateFilter === 'last7') {
      startDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
    } else if (dateFilter === 'last30') {
      startDate = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
    } else if (dateFilter === 'last90') {
      startDate = new Date(now.setDate(now.getDate() - 90)).toISOString().split('T')[0];
    } else if (dateFilter === 'last180') {
      startDate = new Date(now.setDate(now.getDate() - 180)).toISOString().split('T')[0];
    } else if (dateFilter === 'thisMonth') {
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    } else if (dateFilter === 'lastMonth') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`;
    } else if (dateFilter === 'ytd') {
      startDate = `${now.getFullYear()}-01-01`;
    } else if (dateFilter === 'custom' && customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
    }

    try {
      let events: SalesEvent[] = await api.sales.getEvents();
      if (startDate && events) {
        events = events.filter((event) => event.event_date >= startDate && event.event_date <= endDate);
      }

      const eventIds = events.map((event) => event.id);

      let items: SalesItem[] = await api.sales.getItems();
      if (eventIds.length > 0 && items) {
        items = items.filter((item) => eventIds.includes(item.sales_event_id));
      } else if (startDate) {
        items = [];
      }

      const totalRevenue = events.reduce((sum, event) => sum + Number(event.total_revenue), 0);
      const totalUnits = items.reduce((sum, item) => sum + item.quantity_sold, 0);
      const marketDays = events.length;
      const avgPerMarket = marketDays > 0 ? totalRevenue / marketDays : 0;

      const productMap = new Map<string, { units: number; revenue: number }>();
      items.forEach((item) => {
        const existing = productMap.get(item.product_name) || { units: 0, revenue: 0 };
        productMap.set(item.product_name, {
          units: existing.units + item.quantity_sold,
          revenue: existing.revenue + Number(item.subtotal)
        });
      });

      const productBreakdown = Array.from(productMap.entries())
        .map(([name, breakdown]) => ({ name, ...breakdown }))
        .sort((a, b) => b.units - a.units);

      const unitsByEventId = new Map<string, number>();
      for (const item of items) {
        unitsByEventId.set(item.sales_event_id, (unitsByEventId.get(item.sales_event_id) || 0) + item.quantity_sold);
      }

      const salesTrend = events
        .map((event) => ({
          date: event.event_date,
          units: unitsByEventId.get(event.id) || 0,
          revenue: Number(event.total_revenue)
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setData({
        totalUnits,
        totalRevenue,
        avgPerMarket,
        marketDays,
        productBreakdown,
        salesTrend
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }

    setLoading(false);
  }

  const maxUnits = Math.max(...data.productBreakdown.map(p => p.units), 1);
  const maxRevenue = Math.max(...data.salesTrend.map(t => t.revenue), 1);

  const getFilterLabel = () => {
    if (dateFilter === 'all') return 'All Time';
    if (dateFilter === 'last7') return 'Last 7 Days';
    if (dateFilter === 'last30') return 'Last 30 Days';
    if (dateFilter === 'last90') return 'Last 3 Months';
    if (dateFilter === 'last180') return 'Last 6 Months';
    if (dateFilter === 'thisMonth') return 'This Month';
    if (dateFilter === 'lastMonth') return 'Last Month';
    if (dateFilter === 'ytd') return 'Year to Date';
    if (dateFilter === 'custom') return 'Custom Range';
    return 'All Time';
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="text-gray-600 mt-1">({getFilterLabel()})</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Filter by date:</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
            <option value="last90">Last 3 Months</option>
            <option value="last180">Last 6 Months</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="ytd">Year to Date</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {dateFilter === 'custom' && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Units Sold"
          value={data.totalUnits.toString()}
          icon="📦"
          bgColor="bg-orange-100"
        />
        <StatCard
          label="Total Revenue"
          value={`$${data.totalRevenue >= 1000 ? `${(data.totalRevenue / 1000).toFixed(1)}k` : data.totalRevenue.toFixed(0)}`}
          icon="💰"
          bgColor="bg-amber-100"
        />
        <StatCard
          label="Average per Market"
          value={`$${data.avgPerMarket >= 1000 ? `${(data.avgPerMarket / 1000).toFixed(1)}k` : data.avgPerMarket.toFixed(0)}`}
          icon="📊"
          bgColor="bg-yellow-100"
        />
        <StatCard
          label="Market Days"
          value={data.marketDays.toString()}
          icon="📅"
          bgColor="bg-orange-100"
        />
      </div>

      {data.productBreakdown.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-12 text-center">
          <p className="text-gray-600 text-lg">No sales data for selected period</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Units Sold per Product</h2>
            </div>

            <div className="space-y-4">
              {data.productBreakdown.map(product => (
                <div key={product.name}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">{product.name}</span>
                    <span className="text-sm font-bold text-gray-900">{product.units} units</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(product.units / maxUnits) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Sales Trend</h2>
            </div>

            {data.salesTrend.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No sales trend data available</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-2 h-64">
                  {data.salesTrend.map(trend => (
                    <div key={trend.date} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-orange-200 rounded-t-lg relative" style={{ height: `${(trend.revenue / maxRevenue) * 100}%`, minHeight: '20px' }}>
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-900 whitespace-nowrap">
                          ${trend.revenue.toFixed(0)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 text-center whitespace-nowrap">
                        {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Product Distribution</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {data.productBreakdown.map((product, idx) => {
                  const percentage = (product.units / data.totalUnits) * 100;
                  const colors = [
                    'bg-orange-500',
                    'bg-amber-500',
                    'bg-yellow-500',
                    'bg-orange-400',
                    'bg-amber-400',
                    'bg-yellow-400',
                    'bg-orange-300'
                  ];
                  return (
                    <div key={product.name} className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded ${colors[idx % colors.length]}`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">{product.name}</span>
                          <span className="text-sm font-bold text-gray-900">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {data.productBreakdown.map((product, idx) => {
                      const colors = ['#f97316', '#f59e0b', '#eab308', '#fb923c', '#fbbf24', '#fde047', '#fed7aa'];
                      const percentage = (product.units / data.totalUnits) * 100;
                      const startAngle = data.productBreakdown
                        .slice(0, idx)
                        .reduce((sum, p) => sum + (p.units / data.totalUnits) * 100, 0);
                      const angle = (percentage / 100) * 360;
                      const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                      const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                      const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
                      const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
                      const largeArc = angle > 180 ? 1 : 0;

                      return (
                        <path
                          key={product.name}
                          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={colors[idx % colors.length]}
                          stroke="white"
                          strokeWidth="0.5"
                        />
                      );
                    })}
                    <circle cx="50" cy="50" r="25" fill="white" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{data.totalUnits}</p>
                      <p className="text-xs text-gray-600">Total Units</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
