import type {
  Component,
  DashboardNotes,
  Product,
  ProductionHistory,
  Recipe,
  SalesEvent,
  SalesItem,
} from './database.types';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3033/api' : '/api');

export interface ProductUpsertPayload {
  name: string;
  size: string;
  current_stock: number;
  min_stock_level: number;
  lid_color: string;
  bottle_type: string;
  price: number;
  description: string;
}

export interface SaleEventItemPayload {
  product_id: string;
  product_name: string;
  starting_stock: number;
  ending_stock: number;
  quantity_sold: number;
  price_per_unit: number;
}

export interface SaleEventPayload {
  event_name: string;
  event_date: string;
  notes: string;
  items: SaleEventItemPayload[];
}

export interface SalesEventDetailsResponse {
  event: SalesEvent;
  items: SalesItem[];
}

export interface DashboardStatsResponse {
  totalRevenue: number;
  totalSales: number;
  lowStockItems: number;
  totalProducts: number;
}

export interface ProductionComponentAdjustment {
  component_id: string;
  quantity_delta: number;
}

export interface ProductionPayload {
  production_date: string;
  product_id: string;
  product_name: string;
  quantity_made: number;
  components_used: Record<string, string>;
  notes: string;
  component_adjustments?: ProductionComponentAdjustment[];
}

export interface ComponentUpdatePayload {
  quantity: number;
  average_cost: number;
  total_value: number;
}

export interface ComponentPurchasePayload {
  quantity: number;
  total_paid: number;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  products: {
    getAll: () => fetchAPI<Product[]>('/products'),
    getOne: (id: string) => fetchAPI<Product>(`/products/${id}`),
    getRecipe: (id: string) => fetchAPI<Recipe>(`/products/${id}/recipe`),
    update: (id: string, data: ProductUpsertPayload) =>
      fetchAPI<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  sales: {
    getEvents: () => fetchAPI<SalesEvent[]>('/sales/events'),
    getEvent: (id: string) => fetchAPI<SalesEventDetailsResponse>(`/sales/events/${id}`),
    createEvent: (data: SaleEventPayload) =>
      fetchAPI<SalesEvent>('/sales/events', { method: 'POST', body: JSON.stringify(data) }),
    updateEvent: (id: string, data: SaleEventPayload) =>
      fetchAPI<SalesEvent>(`/sales/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteEvent: (id: string) => fetchAPI<{ success: true }>(`/sales/events/${id}`, { method: 'DELETE' }),
    getItems: () => fetchAPI<SalesItem[]>('/sales/items'),
  },
  production: {
    getAll: () => fetchAPI<ProductionHistory[]>('/production'),
    create: (data: ProductionPayload) =>
      fetchAPI<ProductionHistory>('/production', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: ProductionPayload) =>
      fetchAPI<ProductionHistory>(`/production/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<{ success: true }>(`/production/${id}`, { method: 'DELETE' }),
  },
  dashboard: {
    getStats: () => fetchAPI<DashboardStatsResponse>('/dashboard/stats'),
    getNotes: () => fetchAPI<DashboardNotes | null>('/dashboard/notes'),
    createNotes: (content: string) =>
      fetchAPI<DashboardNotes>('/dashboard/notes', { method: 'POST', body: JSON.stringify({ content }) }),
    updateNotes: (id: string, content: string) =>
      fetchAPI<DashboardNotes>(`/dashboard/notes/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  },
  components: {
    getAll: () => fetchAPI<Component[]>('/components'),
    update: (id: string, data: ComponentUpdatePayload) =>
      fetchAPI<Component>(`/components/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    addPurchase: (id: string, data: ComponentPurchasePayload) =>
      fetchAPI<Component>(`/components/${id}/purchases`, { method: 'POST', body: JSON.stringify(data) }),
  },
};
