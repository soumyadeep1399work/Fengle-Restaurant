import { apiFetch } from './client';
import { Order, OrderItem, OrderLine, OrderStatus, PaymentMethod } from '../types';

// Money columns arrive as decimal strings.
const num = (v: unknown) => Number(v ?? 0);

function mapOrder(o: any): Order {
  const items: OrderItem[] = (o.items ?? [])
    .filter((i: any) => i.status === undefined || i.status === 'confirmed')
    .map((i: any) => ({
      itemId: Number(i.item_id),
      name: String(i.name),
      quantity: Number(i.quantity),
      categoryName: String(i.category_name ?? ''),
    }));
  return {
    id: Number(o.id),
    status: o.status as OrderStatus,
    isClubbed: Boolean(o.is_clubbed),
    categoriesLabel: String(o.category_name ?? ''),
    itemTotal: num(o.item_total),
    paymentMethod: o.payment_method as PaymentMethod,
    deliveryAddress: String(o.delivery_address ?? ''),
    createdAt: String(o.created_at),
    preparationStartedAt: o.preparation_started_at ?? null,
    readyAt: o.ready_at ?? null,
    deliveredAt: o.delivered_at ?? null,
    riderAssigned: o.rider_id != null,
    items,
  };
}

export async function fetchOrders(): Promise<Order[]> {
  const { orders } = await apiFetch<{ orders: any[] }>('/orders');
  return orders.map(mapOrder);
}

/** Full order with priced lines, including any dropped at accept time. */
export async function fetchOrderDetail(id: number): Promise<{ order: Order; lines: OrderLine[] }> {
  const { order, items } = await apiFetch<{ order: any; items: any[] }>(`/orders/${id}`);
  const lines: OrderLine[] = items.map((i) => ({
    itemId: Number(i.item_id),
    name: String(i.name),
    quantity: Number(i.quantity),
    categoryName: String(i.category_name ?? ''),
    unitPrice: num(i.unit_price),
    subtotal: num(i.subtotal),
    dropped: i.status === 'dropped_unavailable',
  }));
  return { order: mapOrder({ ...order, items }), lines };
}

/** Accepts the order; items listed in `unavailableItemIds` are dropped and refunded. */
export function acceptOrder(id: number, unavailableItemIds: number[] = []) {
  return apiFetch<unknown>(`/orders/${id}/accept`, {
    method: 'POST',
    body: unavailableItemIds.length ? { unavailable_item_ids: unavailableItemIds } : {},
  });
}

/** Rejecting hands the order to the next kitchen, or cancels + refunds if none is left. */
export function rejectOrder(id: number) {
  return apiFetch<{ message: string; reassigned: boolean }>(`/orders/${id}/reject`, { method: 'POST', body: {} });
}

export function startPreparing(id: number) {
  return apiFetch<unknown>(`/orders/${id}/start-preparing`, { method: 'POST', body: {} });
}

/** Tells the rider the food is ready. Signal only — the order stays `accepted` until pickup. */
export function markReady(id: number) {
  return apiFetch<unknown>(`/orders/${id}/mark-ready`, { method: 'POST', body: {} });
}
