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

/**
 * Multipart uploads (photos) go through XMLHttpRequest, not fetch. Expo's
 * runtime replaces the global `fetch`, and that version rejects React Native's
 * { uri, name, type } file parts with "Unsupported FormDataPart implementation"
 * before sending a single byte (the user just saw "Can't reach the server"
 * instantly on every photo). React Native's XHR still streams those parts
 * natively and isn't touched by that swap.
 */
function xhrSend(
  url: string,
  method: string,
  headers: Record<string, string>,
  form: FormData,
  timeoutMs: number
): Promise<{ status: number; text: string; date: string | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.timeout = timeoutMs;
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText, date: xhr.getResponseHeader('date') });
    xhr.onerror = () => reject(new Error('network error'));
    xhr.ontimeout = () => reject(new Error('timeout'));
    xhr.onabort = () => reject(new Error('aborted'));
    xhr.send(form);
  });
}

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, timeoutMs = 15000 } = opts;

  const headers: Record<string, string> = { Accept: 'application/json' };
  // FormData sets its own multipart Content-Type (with the boundary).
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  if (isForm) {
    let sent: { status: number; text: string; date: string | null };
    try {
      sent = await xhrSend(`${API_BASE_URL}${path}${buildQuery(query)}`, method, headers, body as FormData, timeoutMs);
    } catch {
      throw new ApiError(0, 'Can’t reach the server. Check your connection and try again.');
    }
    if (sent.date) {
      const serverTime = Date.parse(sent.date);
      if (!Number.isNaN(serverTime)) serverOffsetMs = serverTime - Date.now();
    }
    let formData: unknown = null;
    if (sent.text) {
      try {
        formData = JSON.parse(sent.text);
      } catch {
        formData = sent.text;
      }
    }
    if (sent.status < 200 || sent.status >= 300) {
      const serverMessage =
        formData && typeof formData === 'object' ? ((formData as any).error ?? (formData as any).message) : undefined;
      if (sent.status === 401 && token) onUnauthorized?.();
      throw new ApiError(sent.status, serverMessage ? String(serverMessage) : `Request failed (${sent.status})`, formData);
    }
    return formData as T;
  }

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
