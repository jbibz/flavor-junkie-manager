const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3033/api';

async function fetchAPI(endpoint: string, options?: RequestInit) {
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
    getAll: () => fetchAPI('/products'),
    getOne: (id: string) => fetchAPI(`/products/${id}`),
    create: (data: any) => fetchAPI('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI(`/products/${id}`, { method: 'DELETE' }),
    addComponent: (id: string, data: any) => fetchAPI(`/products/${id}/components`, { method: 'POST', body: JSON.stringify(data) }),
    getComponents: (id: string) => fetchAPI(`/products/${id}/components`),
  },
  sales: {
    getEvents: () => fetchAPI('/sales/events'),
    getEvent: (id: string) => fetchAPI(`/sales/events/${id}`),
    createEvent: (data: any) => fetchAPI('/sales/events', { method: 'POST', body: JSON.stringify(data) }),
    updateEvent: (id: string, data: any) => fetchAPI(`/sales/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteEvent: (id: string) => fetchAPI(`/sales/events/${id}`, { method: 'DELETE' }),
    getItems: () => fetchAPI('/sales/items'),
  },
  production: {
    getAll: () => fetchAPI('/production'),
    getOne: (id: string) => fetchAPI(`/production/${id}`),
    create: (data: any) => fetchAPI('/production', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI(`/production/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI(`/production/${id}`, { method: 'DELETE' }),
  },
  dashboard: {
    getStats: () => fetchAPI('/dashboard/stats'),
    getNotes: () => fetchAPI('/dashboard/notes'),
    createNotes: (content: string) => fetchAPI('/dashboard/notes', { method: 'POST', body: JSON.stringify({ content }) }),
    updateNotes: (id: string, content: string) => fetchAPI(`/dashboard/notes/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  },
  components: {
    getAll: () => fetchAPI('/components'),
    getOne: (id: string) => fetchAPI(`/components/${id}`),
    update: (id: string, data: any) => fetchAPI(`/components/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    addPurchase: (id: string, data: any) => fetchAPI(`/components/${id}/purchases`, { method: 'POST', body: JSON.stringify(data) }),
  },
};
