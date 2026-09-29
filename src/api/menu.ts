import { ApiError, apiFetch } from './client';
import { MenuItem, RestaurantProfile } from '../types';

/**
 * GET /restaurants/me/menu — every item in the kitchen's approved categories,
 * including the ones switched off.
 */
export async function fetchMenu(): Promise<MenuItem[]> {
  const { items } = await apiFetch<{ items: any[] }>('/restaurants/me/menu');
  return items.map((i) => ({
    id: Number(i.id),
    name: String(i.name),
    price: Number(i.price),
    categoryId: Number(i.category_id),
    categoryName: String(i.category_name ?? ''),
    imageUrl: i.image_url ? String(i.image_url) : null,
    isVeg: Boolean(i.is_veg),
    isAvailable: Boolean(i.is_available),
  }));
}

export function setItemAvailability(restaurantId: number, itemId: number, isAvailable: boolean) {
  return apiFetch<unknown>(`/restaurants/${restaurantId}/items/${itemId}/availability`, {
    method: 'PATCH',
    body: { is_available: isAvailable },
  });
}

/** GET /restaurants/me — null when the backend doesn't have it (404). */
export async function fetchRestaurantProfile(): Promise<RestaurantProfile | null> {
  try {
    const { restaurant } = await apiFetch<{ restaurant: any }>('/restaurants/me');
    return {
      id: Number(restaurant.id),
      name: String(restaurant.name),
      address: String(restaurant.address ?? ''),
      categories: (restaurant.categories ?? []).map((c: any) => ({ id: Number(c.id), name: String(c.name) })),
      // Missing on an older backend build -> not gated, since there's no accept-agreement endpoint to submit to yet.
      agreementRequired: Boolean(restaurant.agreementRequired),
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
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

export interface NewItem {
  categoryId: number;
  name: string;
  price: number;
  isVeg: boolean;
  imageUrl?: string;
}

/** POST /items — the item joins the shared catalog and is switched on at this kitchen. */
export function createItem(item: NewItem) {
  return apiFetch<{ item: unknown }>('/items', {
    method: 'POST',
    body: {
      category_id: item.categoryId,
      name: item.name,
      price: item.price,
      is_veg: item.isVeg,
      ...(item.imageUrl ? { image_url: item.imageUrl } : {}),
    },
  });
}

export interface ItemChanges {
  name?: string;
  price?: number;
  isVeg?: boolean;
  /** A URL to set the photo, or null to remove it. Leave undefined to keep it. */
  imageUrl?: string | null;
}

/**
 * PATCH /items/:id — the item is shared by every kitchen in its category, so
 * changes show for all of them (and for customers). Category can't be changed.
 */
export function updateItem(id: number, changes: ItemChanges) {
  const body: Record<string, unknown> = {};
  if (changes.name !== undefined) body.name = changes.name;
  if (changes.price !== undefined) body.price = changes.price;
  if (changes.isVeg !== undefined) body.is_veg = changes.isVeg;
  if (changes.imageUrl !== undefined) body.image_url = changes.imageUrl;
  return apiFetch<{ item: unknown }>(`/items/${id}`, { method: 'PATCH', body });
}
