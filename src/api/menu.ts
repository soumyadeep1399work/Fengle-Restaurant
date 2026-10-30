import { ApiError, apiFetch } from './client';
import { MenuItem, PortionUnit, RestaurantProfile } from '../types';

/**
 * GET /restaurants/me/menu — every item in the kitchen's approved categories,
 * including the ones switched off, plus this kitchen's own dishes still waiting
 * for Fengle to set a price (`awaiting_price`, with `price` null).
 */
export async function fetchMenu(): Promise<MenuItem[]> {
  const { items } = await apiFetch<{ items: any[] }>('/restaurants/me/menu');
  return items.map((i) => ({
    id: Number(i.id),
    name: String(i.name),
    price: i.price == null ? null : Number(i.price),
    effectivePrice: i.effective_price == null ? null : Number(i.effective_price),
    awaitingPrice: Boolean(i.awaiting_price),
    categoryId: Number(i.category_id),
    categoryName: String(i.category_name ?? ''),
    imageUrl: i.image_url ? String(i.image_url) : null,
    isVeg: Boolean(i.is_veg),
    isAvailable: Boolean(i.is_available),
    quantityValue: i.quantity_value == null ? null : Number(i.quantity_value),
    quantityUnit: i.quantity_unit ? (String(i.quantity_unit) as PortionUnit) : null,
    portionLabel: i.portion_label ? String(i.portion_label) : null,
  }));
}

export function setItemAvailability(restaurantId: number, itemId: number, isAvailable: boolean) {
  return apiFetch<unknown>(`/restaurants/${restaurantId}/items/${itemId}/availability`, {
    method: 'PATCH',
    body: { is_available: isAvailable },
  });
}

function mapProfile(restaurant: any): RestaurantProfile {
  return {
    id: Number(restaurant.id),
    name: String(restaurant.name),
    address: String(restaurant.address ?? ''),
    categories: (restaurant.categories ?? []).map((c: any) => ({ id: Number(c.id), name: String(c.name) })),
    // Missing on an older backend build -> not gated, since there's no accept-agreement endpoint to submit to yet.
    agreementRequired: Boolean(restaurant.agreementRequired),
    verificationStatus: restaurant.verificationStatus ?? 'approved',
    verificationDeniedReason: restaurant.verificationDeniedReason ?? null,
    documents: restaurant.documents
      ? {
          status: restaurant.documents.status,
          missing: Array.isArray(restaurant.documents.missing) ? restaurant.documents.missing.map(String) : [],
          validUntil: restaurant.documents.validUntil ?? null,
          pendingCount: Number(restaurant.documents.pendingCount ?? 0),
        }
      : null,
    documentsPortalUrl: restaurant.documentsPortalUrl ? String(restaurant.documentsPortalUrl) : 'https://partner.fengle.in',
    bankAccount: restaurant.bank_account
      ? {
          accountHolderName: String(restaurant.bank_account.account_holder_name ?? ''),
          accountNumberLast4: String(restaurant.bank_account.account_number_last4 ?? ''),
          ifsc: String(restaurant.bank_account.ifsc ?? ''),
          bankName: restaurant.bank_account.bank_name ?? null,
          upiId: restaurant.bank_account.upi_id ?? null,
          updatedAt: restaurant.bank_account.updated_at ?? null,
        }
      : null,
  };
}

/** GET /restaurants/me — null when the backend doesn't have it (404). */
export async function fetchRestaurantProfile(): Promise<RestaurantProfile | null> {
  try {
    const { restaurant } = await apiFetch<{ restaurant: any }>('/restaurants/me');
    return mapProfile(restaurant);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export interface BankAccountInput {
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  upiId?: string | null;
}

/** Saves (or replaces) the account payouts are sent to. The server answers with the masked profile. */
export async function saveBankAccount(input: BankAccountInput): Promise<RestaurantProfile> {
  const { restaurant } = await apiFetch<{ restaurant: any }>('/restaurants/me/bank-account', {
    method: 'PUT',
    body: {
      account_holder_name: input.accountHolderName,
      account_number: input.accountNumber,
      ifsc: input.ifsc,
      upi_id: input.upiId || null,
    },
  });
  return mapProfile(restaurant);
}

/**
 * POST /uploads/image — multipart, field `image`; returns the photo's public URL.
 * `uri` is a local file (already resized by utils/photo).
 */
export async function uploadImage(uri: string): Promise<string> {
  const form = new FormData();
  // React Native's FormData takes a { uri, name, type } descriptor for files.
  form.append('image', { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
  const { url } = await apiFetch<{ url: string }>('/uploads/image', { method: 'POST', body: form, timeoutMs: 60000 });
  return url;
}

export interface Portion {
  value: number;
  unit: PortionUnit;
}

// Prices are set by Fengle admins only (the backend answers 403 `price_admin_only` to a kitchen that sends
// one), so nothing in this file can send a price. A new dish is created hidden and priced later by an admin.

export interface NewItem {
  categoryId: number;
  name: string;
  isVeg: boolean;
  imageUrl?: string;
  portion?: Portion;
}

/**
 * POST /items — proposes a dish for this kitchen. It stays hidden from customers
 * (`awaiting_price`) until a Fengle admin prices and publishes it.
 */
export function createItem(item: NewItem) {
  return apiFetch<{ item: unknown }>('/items', {
    method: 'POST',
    body: {
      category_id: item.categoryId,
      name: item.name,
      is_veg: item.isVeg,
      ...(item.imageUrl ? { image_url: item.imageUrl } : {}),
      ...(item.portion ? { quantity_value: item.portion.value, quantity_unit: item.portion.unit } : {}),
    },
  });
}

export interface ItemChanges {
  name?: string;
  isVeg?: boolean;
  /** A URL to set the photo, or null to remove it. Leave undefined to keep it. */
  imageUrl?: string | null;
  /** A portion to set, or null to clear it. Leave undefined to keep it. */
  portion?: Portion | null;
}

/**
 * PATCH /items/:id — the item is shared by every kitchen in its category, so
 * changes show for all of them (and for customers). Category can't be changed,
 * and the price isn't editable here: it belongs to Fengle admins.
 */
export function updateItem(id: number, changes: ItemChanges) {
  const body: Record<string, unknown> = {};
  if (changes.name !== undefined) body.name = changes.name;
  if (changes.isVeg !== undefined) body.is_veg = changes.isVeg;
  if (changes.imageUrl !== undefined) body.image_url = changes.imageUrl;
  if (changes.portion !== undefined) {
    // The backend wants both together, or both null to clear.
    body.quantity_value = changes.portion ? changes.portion.value : null;
    body.quantity_unit = changes.portion ? changes.portion.unit : null;
  }
  return apiFetch<{ item: unknown }>(`/items/${id}`, { method: 'PATCH', body });
}
