import { useEffect, useState } from 'react';
import { serverNow } from '../api/client';
import { colors, status } from '../theme';
import { Order, OrderItem, OrderStatus, PaymentMethod } from '../types';
import { formatDay } from './time';

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net banking',
  cod: 'COD',
  wallet: 'Wallet',
};

export const paymentLabel = (m: PaymentMethod) => PAYMENT_LABEL[m] ?? String(m).toUpperCase();

export const itemsSummary = (items: OrderItem[]) => items.map((i) => `${i.name} × ${i.quantity}`).join(', ');

/** "Just now", "2 min ago", "3 h ago", then the date — measured on the server's clock. */
export function placedAgo(createdAt: string): string {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.floor((serverNow() - t) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} h ago`;
  return formatDay(t);
}

/** Re-renders the caller every `ms` so relative times like "2 min ago" stay fresh. */
export function useTick(ms = 30000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return tick;
}

export interface StatusStyle {
  label: string;
  bg: string;
  color: string;
}

/** Chip for the order detail screen. */
export function statusStyle(order: Pick<Order, 'status' | 'preparationStartedAt' | 'readyAt'>): StatusStyle {
  const s: OrderStatus = order.status;
  switch (s) {
    case 'placed':
      return { label: 'New', bg: status.newBg, color: status.newText };
    case 'accepted': {
      const label = order.readyAt ? 'Ready for pickup' : order.preparationStartedAt ? 'Preparing' : 'Accepted';
      return { label, bg: colors.primaryTint, color: colors.primaryMid };
    }
    case 'picked_up':
      return { label: 'Picked up', bg: colors.goldChipBg, color: colors.goldChipText };
    case 'on_the_way':
      return { label: 'On the way', bg: colors.goldChipBg, color: colors.goldChipText };
    case 'delivered':
      return { label: 'Delivered', bg: status.doneBg, color: status.doneText };
    default:
      return { label: 'Cancelled', bg: colors.greyChipBg, color: colors.bodyMuted };
  }
}

/** Card title — the backend doesn't send customer names to the kitchen. */
export const orderTitle = (o: Pick<Order, 'id'>) => `Order #${o.id}`;
