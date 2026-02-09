import { useEffect, useState } from 'react';
import { api } from './api';
import type { Product, Component, Recipe, SalesEvent, ProductionHistory } from './database.types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await api.products.getAll();
      if (data) setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
    setLoading(false);
  }

  return { products, loading, reload: loadProducts };
}

export function useComponents() {
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComponents();
  }, []);

  async function loadComponents() {
    try {
      const data = await api.components.getAll();
      if (data) setComponents(data);
    } catch (error) {
      console.error('Error loading components:', error);
    }
    setLoading(false);
  }

  return { components, loading, reload: loadComponents };
}

export function useProduct(id: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadProduct(id);
  }, [id]);

  async function loadProduct(productId: string) {
    try {
      const data = await api.products.getOne(productId);
      if (data) setProduct(data);
      setRecipe(null);
    } catch (error) {
      console.error('Error loading product:', error);
    }
    setLoading(false);
  }

  return { product, recipe, loading, reload: () => id && loadProduct(id) };
}

export function useSalesEvents(month?: string) {
  const [events, setEvents] = useState<SalesEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [month]);

  async function loadEvents() {
    try {
      let data = await api.sales.getEvents();

      if (month && data) {
        const startDate = `${month}-01`;
        const endDate = new Date(month + '-01');
        endDate.setMonth(endDate.getMonth() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];

        data = data.filter((event: SalesEvent) =>
          event.event_date >= startDate && event.event_date < endDateStr
        );
      }

      if (data) setEvents(data);
    } catch (error) {
      console.error('Error loading sales events:', error);
    }
    setLoading(false);
  }

  return { events, loading, reload: loadEvents };
}

export function useProductionHistory(productId?: string) {
  const [history, setHistory] = useState<ProductionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [productId]);

  async function loadHistory() {
    try {
      let data = await api.production.getAll();

      if (productId && data) {
        data = data.filter((batch: ProductionHistory) => batch.product_id === productId);
      }

      if (data) setHistory(data);
    } catch (error) {
      console.error('Error loading production history:', error);
    }
    setLoading(false);
  }

  return { history, loading, reload: loadHistory, refresh: loadHistory };
}

export function useDashboardStats() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    lowStockItems: 0,
    totalProducts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await api.dashboard.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
    setLoading(false);
  }

  return { stats, loading };
}
