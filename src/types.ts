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

export type PortionUnit = 'pc' | 'gm' | 'kg' | 'ml' | 'ltr';

export interface MenuItem {
  id: number;
  name: string;
  /** The normal price, set by Fengle. Null while the dish is still awaiting a price. */
  price: number | null;
  /** What customers pay right now: lower than `price` while an admin-set offer runs. Null while awaiting a price. */
  effectivePrice: number | null;
  /** A dish this kitchen proposed that Fengle hasn't priced and published yet (hidden from customers). */
  awaitingPrice: boolean;
  categoryId: number;
  categoryName: string;
  imageUrl: string | null;
  isVeg: boolean;
  isAvailable: boolean;
  /** Optional portion size, e.g. 500 + 'gm'. Both are set or both are null. */
  quantityValue: number | null;
  quantityUnit: PortionUnit | null;
  /** Ready-made label from the server ("500 gm", "3 pc"); null when no portion is set. */
  portionLabel: string | null;
}

export interface Category {
  id: number;
  name: string;
}

export type DocumentsStatus = 'complete' | 'expiring' | 'pending' | 'rejected' | 'expired' | 'missing';

/** Where the kitchen stands on its KYC / licence documents (uploaded at partner.fengle.in, approved by Fengle). */
export interface PartnerDocuments {
  status: DocumentsStatus;
  /** Required document types never uploaded: 'aadhaar' | 'fssai' | 'trade_license'. */
  missing: string[];
  /** When the earliest-expiring required document runs out (only meaningful while `expiring`). */
  validUntil: string | null;
  pendingCount: number;
}

export interface RestaurantProfile {
  id: number;
  name: string;
  address: string;
  categories: Category[];
  /** True until the owner accepts the in-app agreement (or the client publishes a newer version). */
  agreementRequired: boolean;
  /** Admin's review of the selfie: only 'approved' partners can use the app. Treated as approved if the backend doesn't send it. */
  verificationStatus: 'pending' | 'approved' | 'denied';
  /** Why the photo was denied (shown on the agreement screen). */
  verificationDeniedReason: string | null;
  /** Null if the backend didn't send it (older build). */
  documents: PartnerDocuments | null;
  /** The partner web portal where documents are uploaded. */
  documentsPortalUrl: string;
  /** Where payouts go. Masked by the server (only the last 4 digits); null until the kitchen adds one. */
  bankAccount: BankAccount | null;
}

export interface BankAccount {
  accountHolderName: string;
  accountNumberLast4: string;
  ifsc: string;
  bankName: string | null;
  upiId: string | null;
  updatedAt: string | null;
}
