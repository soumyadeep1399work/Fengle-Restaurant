import { apiFetch } from './client';

/**
 * Bump this whenever the client supplies new agreement text. The backend
 * rejects a submission whose version doesn't match its own current one
 * (409), so a stale app build can't silently accept outdated terms.
 */
export const AGREEMENT_VERSION = 1;

/**
 * POST /restaurants/me/accept-agreement — multipart, field `selfie` (a live
 * camera photo, see utils/photo.takeSelfie) plus `agreement_version`. The
 * server records its own clock as the acceptance time — that's the
 * evidentiary timestamp, not anything the client sends.
 */
export async function submitAgreement(selfieUri: string): Promise<{ agreementAcceptedAt: string }> {
  const form = new FormData();
  form.append('selfie', { uri: selfieUri, name: 'agreement-selfie.jpg', type: 'image/jpeg' } as unknown as Blob);
  form.append('agreement_version', String(AGREEMENT_VERSION));
  return apiFetch<{ agreementAcceptedAt: string }>('/restaurants/me/accept-agreement', {
    method: 'POST',
    body: form,
    timeoutMs: 60000,
  });
}
