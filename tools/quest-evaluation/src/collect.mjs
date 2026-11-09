import { randomUUID } from 'node:crypto';
import { saveSnapshot } from './store.mjs';

export async function collect({ endpoint, cases, version, limit = 3, live = false, directory = 'private/observations',
  cookie, bearer, allowHttp = false, localEval = false, evalToken, fetchImpl = fetch, delayMs = 13000 }) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error('Limit must be 1..10');
  if (!version || !Array.isArray(cases) || cases.length === 0) throw new Error('Version and nonempty cases required');
  const selected = cases.slice(0, limit);
  for (const c of selected) {
    if (!/^[A-Z0-9.-]{1,12}$/.test(c.request?.ticker ?? '') ||
      (c.request.question !== undefined && (typeof c.request.question !== 'string' || c.request.question.length > 500))) throw new Error('Invalid request case');
  }
  const summary = { mode: live ? 'live' : 'dry-run', plannedRequests: selected.length, completed: 0, failed: 0,
    evidenceStatus: 'pending-independent-input-snapshot' };
  if (!live) return summary;
  const url = new URL(endpoint);
  if (url.username || url.password || url.search || url.hash) throw new Error('Endpoint must not contain credentials, query, or fragment');
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))) throw new Error('HTTPS required except explicit local HTTP');
  if (localEval && (!allowHttp || url.protocol !== 'http:' || !['localhost','127.0.0.1','[::1]'].includes(url.hostname) ||
      typeof evalToken !== 'string' || evalToken.length < 32 || !cookie)) throw new Error('Local evaluation requires loopback HTTP, cookie and configured token');
  for (let i = 0; i < selected.length; i++) {
    if (i > 0 && delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
    const c = selected[i];
    const localCollectionId = randomUUID();
    const request = { ticker: c.request.ticker, ...(c.request.question === undefined ? {} : { question: c.request.question }) };
    const started = Date.now();
    let response = null, errorCode = null, httpStatus = null;
    try {
      const res = await fetchImpl(url, { method: 'POST', redirect: 'error', credentials: 'omit',
        headers: { 'Content-Type': 'application/json', Origin: url.origin, ...(cookie ? { Cookie: cookie } : {}), ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...(localEval ? { 'x-briefing-eval-token': evalToken } : {}) },
        body: JSON.stringify(request), signal: AbortSignal.timeout(30000) });
      httpStatus = res.status;
      if (!res.ok) errorCode = 'http_error';
      {
        const reader = res.body.getReader(); const chunks = []; let length = 0;
        for (;;) { const { done, value } = await reader.read(); if (done) break;
          length += value.length; if (length > 1048576) { await reader.cancel(); throw new Error('Response limit'); } chunks.push(value); }
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        // Preserve server trace ID even for rejected requests, without retaining error prose.
        response = res.ok ? parsed : { traceId: typeof parsed?.traceId === 'string' ? parsed.traceId : null };
      }
    } catch { errorCode ??= 'transport_or_parse_error'; }
    await saveSnapshot(directory, { schema: 'quest-observation-v1', provenance: 'observed', inputOrigin: c.inputOrigin ?? 'synthetic',
      caseId: c.id, split: c.split, request, expectedVersion: version,
      // API contract is stateless: no prior messages or conversation identifiers are sent.
      freshConversation: true, conversationId: localCollectionId, collectedAt: new Date().toISOString(),
      durationMs: Date.now()-started, httpStatus, errorCode, response, evidence: null,
      evidenceOrigin: 'not-captured', localCollectionId });
    if (errorCode) summary.failed++; else summary.completed++;
    // Stop on auth/rate-limit failures; do not retry or amplify spend.
    if ([401,403,429].includes(httpStatus)) break;
  }
  return summary;
}
