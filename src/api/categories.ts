import { ApiError, apiFetch } from './client';
import { Category } from '../types';

export interface CategoryOption {
  id: number;
  name: string;
  /** True if this kitchen already serves the category. */
  joined: boolean;
}

export interface CategoryOptions {
  /** Every active category (or those matching the search text), by name. */
  categories: CategoryOption[];
  /** A category whose name is the same once spelling variants and plurals are ignored ("Momos" for "Momo"). */
  exact: CategoryOption | null;
  /** Close matches the kitchen probably meant instead of creating a new one. */
  similar: CategoryOption[];
}

const toOption = (c: any): CategoryOption => ({ id: Number(c.id), name: String(c.name), joined: Boolean(c.joined) });

export async function fetchCategoryOptions(q: string): Promise<CategoryOptions> {
  const data = await apiFetch<any>('/restaurants/me/category-options', { query: { q: q.trim() || undefined } });
  return {
    categories: (data.categories ?? []).map(toOption),
    exact: data.exact ? toOption(data.exact) : null,
    similar: (data.similar ?? []).map(toOption),
  };
}

/** Adds an existing category to this kitchen. */
export async function joinCategory(categoryId: number): Promise<Category> {
  const { category } = await apiFetch<{ category: any }>('/restaurants/me/categories', {
    method: 'POST',
    body: { category_id: categoryId },
  });
  return { id: Number(category.id), name: String(category.name) };
}

export type CreateCategoryResult =
  | { status: 'created'; category: Category }
  /** The name is the same as an existing category — nothing was created. */
  | { status: 'exists'; category: CategoryOption }
  /** Close to existing categories — nothing was created; retry with `confirmNotDuplicate` to create anyway. */
  | { status: 'similar'; similar: CategoryOption[] };

/**
 * Creates a new category and adds it to this kitchen. The server is the
 * authority on duplicates; the two 409 answers come back as results, not errors.
 */
export async function createCategory(name: string, confirmNotDuplicate = false): Promise<CreateCategoryResult> {
  try {
    const { category } = await apiFetch<{ category: any }>('/restaurants/me/categories', {
      method: 'POST',
      body: { name: name.trim(), ...(confirmNotDuplicate ? { confirm_not_duplicate: true } : {}) },
    });
    return { status: 'created', category: { id: Number(category.id), name: String(category.name) } };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409 && e.body && typeof e.body === 'object') {
      const body = e.body as any;
      if (body.code === 'category_exists' && body.category) return { status: 'exists', category: toOption(body.category) };
      if (body.code === 'similar_categories') return { status: 'similar', similar: (body.similar ?? []).map(toOption) };
    }
    throw e;
  }
}
