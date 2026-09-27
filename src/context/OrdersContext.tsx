import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { acceptOrder, fetchOrders, markReady, rejectOrder, startPreparing } from '../api/orders';
import { Order } from '../types';

// No push notifications yet (needs FCM + a real build), so new orders are found
// by polling while the app is open.
const POLL_MS = 8000;

interface OrdersContextValue {
  orders: Order[];
  /** True until the first load finishes. */
  loading: boolean;
  /** Set when the last refresh failed; cleared by the next success. */
  loadError: string | null;
  newOrders: Order[];
  activeOrders: Order[];
  historyOrders: Order[];
  /** The order the full-screen takeover is showing, if any. */
  alertOrder: Order | null;
  refresh: () => Promise<void>;
  accept: (id: number, unavailableItemIds?: number[]) => Promise<void>;
  reject: (id: number) => Promise<void>;
  markPreparing: (id: number) => Promise<void>;
  markOrderReady: (id: number) => Promise<void>;
}

const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Orders that have already had (or are queued for) a takeover alert.
  const alertedIds = useRef<Set<number>>(new Set());
  const [alertQueue, setAlertQueue] = useState<number[]>([]);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await fetchOrders();
      setOrders(next);
      setLoadError(null);
      const fresh = next.filter((o) => o.status === 'placed' && !alertedIds.current.has(o.id)).map((o) => o.id);
      fresh.forEach((id) => alertedIds.current.add(id));
      setAlertQueue((q) => {
        const stillNew = new Set(next.filter((o) => o.status === 'placed').map((o) => o.id));
        // Drop queued alerts for orders that were handled elsewhere (or rejected/cancelled meanwhile).
        return [...q.filter((id) => stillNew.has(id)), ...fresh];
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load orders.');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh]);

  const dismissAlert = useCallback((id: number) => setAlertQueue((q) => q.filter((x) => x !== id)), []);

  const accept = useCallback(
    async (id: number, unavailableItemIds: number[] = []) => {
      await acceptOrder(id, unavailableItemIds);
      dismissAlert(id);
      await refresh();
    },
    [dismissAlert, refresh]
  );

  const reject = useCallback(
    async (id: number) => {
      await rejectOrder(id);
      dismissAlert(id);
      await refresh();
    },
    [dismissAlert, refresh]
  );

  const markPreparing = useCallback(
    async (id: number) => {
      await startPreparing(id);
      await refresh();
    },
    [refresh]
  );

  const markOrderReady = useCallback(
    async (id: number) => {
      await markReady(id);
      await refresh();
    },
    [refresh]
  );

  const value = useMemo<OrdersContextValue>(() => {
    const newOrders = orders.filter((o) => o.status === 'placed');
    const activeOrders = orders.filter((o) => ['accepted', 'picked_up', 'on_the_way'].includes(o.status));
    const historyOrders = orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled');
    const alertOrder = alertQueue.length ? (orders.find((o) => o.id === alertQueue[0]) ?? null) : null;
    return {
      orders, loading, loadError, newOrders, activeOrders, historyOrders, alertOrder,
      refresh, accept, reject, markPreparing, markOrderReady,
    };
  }, [orders, loading, loadError, alertQueue, refresh, accept, reject, markPreparing, markOrderReady]);

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used within an OrdersProvider');
  return ctx;
}
