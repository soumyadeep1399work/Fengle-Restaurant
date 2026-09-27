import { API_BASE_URL } from './config';
import { getToken } from './token';

// status 0 = the request never got a response (offline, server down, timeout).
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// The phone's clock can be minutes off, but server timestamps (like an order's
// cancellable_until) are in server time. Every response's Date header refreshes
// this offset so countdowns run against the server's clock.
let serverOffsetMs = 0;

/** "Now" according to the backend's clock. */
export function serverNow(): number {
  return Date.now() + serverOffsetMs;
}

let onUnauthorized: (() => void) | null = null;

// Called when an authenticated request comes back 401 (token expired/invalid).
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** Attach the bearer token (default true). Set false for OTP endpoints. */
  auth?: boolean;
  timeoutMs?: number;
}

function buildQuery(query?: Query): string {
  if (!query) return '';
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, timeoutMs = 15000 } = opts;

  const headers: Record<string, string> = { Accept: 'application/json' };
  // FormData sets its own multipart Content-Type (with the boundary).
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'Can’t reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  const dateHeader = res.headers.get('date');
  if (dateHeader) {
    const serverTime = Date.parse(dateHeader);
    if (!Number.isNaN(serverTime)) serverOffsetMs = serverTime - Date.now();
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const serverMessage =
      data && typeof data === 'object' ? ((data as any).error ?? (data as any).message) : undefined;
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, serverMessage ? String(serverMessage) : `Request failed (${res.status})`, data);
  }

  return data as T;
}
