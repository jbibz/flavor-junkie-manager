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
    setLoading(true);
    try {
      const data = await api.products.getAll();
      if (data) setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
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
    setLoading(true);
    try {
      const data = await api.components.getAll();
      if (data) setComponents(data);
    } catch (error) {
      console.error('Error loading components:', error);
    } finally {
      setLoading(false);
    }
  }

  return { components, loading, reload: loadComponents };
}

export function useProduct(id: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadProduct(id);
      return;
    }

    setProduct(null);
    setRecipe(null);
    setLoading(false);
  }, [id]);

  async function loadProduct(productId: string) {
    setLoading(true);
    try {
      const [productData, recipeData] = await Promise.all([
        api.products.getOne(productId),
        api.products.getRecipe(productId).catch(() => null),
      ]);

      if (productData) setProduct(productData);
      setRecipe(recipeData);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
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
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
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
    setLoading(true);
    try {
      let data = await api.production.getAll();

      if (productId && data) {
        data = data.filter((batch: ProductionHistory) => batch.product_id === productId);
      }

      if (data) setHistory(data);
    } catch (error) {
      console.error('Error loading production history:', error);
    } finally {
      setLoading(false);
    }
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
    setLoading(true);
    try {
      const data = await api.dashboard.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }

  return { stats, loading };
}
