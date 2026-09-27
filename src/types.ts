export type OrderStatus = 'placed' | 'accepted' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'cod' | 'wallet';

export interface OrderItem {
  itemId: number;
  name: string;
  quantity: number;
  categoryName: string;
}

// A line on the detail screen also has a price and can have been dropped at accept time.
export interface OrderLine extends OrderItem {
  unitPrice: number;
  subtotal: number;
  dropped: boolean;
}

export interface Order {
  id: number;
  status: OrderStatus;
  isClubbed: boolean;
  categoriesLabel: string;
  itemTotal: number;
  paymentMethod: PaymentMethod;
  deliveryAddress: string;
  createdAt: string;
  preparationStartedAt: string | null;
  /** Set by "Mark ready" — a signal for the rider; doesn't change status. */
  readyAt: string | null;
  deliveredAt: string | null;
  riderAssigned: boolean;
  items: OrderItem[];
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  categoryId: number;
  categoryName: string;
  imageUrl: string | null;
  isVeg: boolean;
  isAvailable: boolean;
}

export interface Category {
  id: number;
  name: string;
}

export interface RestaurantProfile {
  id: number;
  name: string;
  address: string;
  categories: Category[];
}
