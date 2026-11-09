import { createHash } from 'node:crypto';

export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
const iso = v => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
export const uuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const httpsUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password; } catch { return false; } };
const operationalFailure = r => !!r.errorCode || (r.httpStatus != null && (!Number.isInteger(r.httpStatus) || r.httpStatus < 200 || r.httpStatus >= 300));
export const criteria = ['contract', 'source_fidelity', 'date_fidelity', 'ticker_fidelity', 'no_data', 'fresh_version'];

// Evidence must be captured independently BEFORE generation, not copied from output.sources.
export function evaluate(record) {
  const r = record.response;
  const checks = Object.fromEntries(criteria.map(k => [k, 'pending']));
  const result = () => ({ checks, manual: ['claim_entailment', 'headline_only_scope', 'financial_advice', ...(r?.status === 'insufficient_evidence' ? ['abstention_appropriateness'] : [])], provenance: record.provenance });
  if (!r || typeof r !== 'object' || Array.isArray(r)) { checks.contract = 'fail'; return result(); }
  const sourceShape = s => s && typeof s.id === 'string' && s.id.length > 0 && typeof s.title === 'string' &&
    (s.url === null || (typeof s.url === 'string' && httpsUrl(s.url))) &&
    (s.publishedAt === null || iso(s.publishedAt)) && ['news', 'filing', 'earnings'].includes(s.kind);
  checks.contract = typeof r.answer === 'string' && r.answer.trim().length > 0 && Array.isArray(r.sources) && r.sources.length <= 12 &&
    r.sources.every(sourceShape) && uuid(r.traceId) &&
    typeof r.version === 'string' && iso(r.asOf) && ['ok','insufficient_evidence','unavailable'].includes(r.status) &&
    Array.isArray(r.limitations) && r.limitations.every(x => typeof x === 'string') ? 'pass' : 'fail';
  checks.fresh_version = record.freshConversation === true && typeof record.expectedVersion === 'string' &&
    record.expectedVersion === r.version ? 'pass' : 'fail';
  if (!Array.isArray(r.sources)) return result();
  const evidence = record.evidence;
  if (Array.isArray(evidence) && record.evidenceOrigin === 'independent-input') {
    const map = new Map(evidence.map(s => [s.id, s]));
    const unique = new Set(r.sources.map(s => s?.id)).size === r.sources.length;
    checks.source_fidelity = unique && r.sources.every(s => {
      const e = map.get(s?.id);
      return e && s.title === e.title && s.url === e.url && s.kind === e.kind;
    }) ? 'pass' : 'fail';
    checks.date_fidelity = r.sources.every(s => map.has(s?.id) && s.publishedAt === map.get(s.id).publishedAt) &&
      iso(record.asOf) && record.asOf === r.asOf ? 'pass' : 'fail';
    // A source can only be attributed when trusted input explicitly records its ticker.
    if (r.status !== 'insufficient_evidence' && evidence.every(s => typeof s.ticker === 'string')) {
      checks.ticker_fidelity = r.sources.every(s => map.get(s?.id)?.ticker === record.request?.ticker) ? 'pass' : 'fail';
    }
    checks.no_data = evidence.length === 0
      ? (r.status === 'unavailable' && r.sources.length === 0 && r.limitations?.length > 0 ? 'pass' : 'fail')
      : (r.status === 'ok' ? (r.sources.length > 0 ? 'pass' : 'fail') : 'pending');
  }
  return result();
}

export function report(records) {
  const traceIds = records.filter(r => r.provenance === 'observed' && r.response?.traceId).map(r => r.response.traceId);
  if (new Set(traceIds).size !== traceIds.length) throw new Error('Duplicate observed trace IDs would distort frequency');
  const counts = Object.fromEntries(criteria.map(k => [k, { pass: 0, fail: 0, pending: 0, denominator: records.length }]));
  const actual = records.filter(r => r.provenance === 'observed' && typeof r.response?.traceId === 'string' && r.response.traceId);
  const quality = actual.filter(r => !operationalFailure(r));
  const candidates = [];
  for (const record of records) {
    const e = evaluate(record);
    for (const k of criteria) counts[k][e.checks[k]]++;
  }
  for (const k of criteria) {
    const eligible = quality.filter(r => evaluate(r).checks[k] !== 'pending');
    const failed = eligible.filter(r => evaluate(r).checks[k] === 'fail');
    if (failed.length) candidates.push({ criterion: k, failures: failed.length, denominator: eligible.length,
      frequency: failed.length / eligible.length, traceRefs: failed.map(r => digest(r.response.traceId)),
      impact: 'pending-human-review', cost: 'pending-estimate', selected: false });
  }
  return { schema: 'quest-evaluation-report-v1', total: records.length, actualObservations: actual.length,
    modelQualityObservations: quality.length,
    abstentions: { total: actual.filter(r => r.response?.status === 'insufficient_evidence').length, quality: 'pending-manual-review' },
    operational: { total: records.filter(operationalFailure).length,
      auth: records.filter(r => [401,403].includes(r.httpStatus)).length,
      rateLimited: records.filter(r => r.httpStatus === 429).length,
      transportOrParse: records.filter(r => r.errorCode === 'transport_or_parse_error').length,
      otherHttp: records.filter(r => r.httpStatus != null && (r.httpStatus < 200 || r.httpStatus >= 300) && ![401,403,429].includes(r.httpStatus)).length },
    syntheticRecords: records.filter(r => r.provenance === 'synthetic').length, counts,
    issueCandidates: candidates, threeCandidateReview: candidates.length >= 3 ? 'ready-for-human-triage' : 'pending-more-observed-evidence',
    manualReview: 'pending; automated metadata checks do not establish factual correctness',
    traceReferencePolicy: 'SHA-256 refs; original IDs remain in private immutable snapshots' };
}

export function compare(baseline, candidate) {
  const observed = [...baseline, ...candidate].filter(r => r.provenance === 'observed');
  const traceIds = observed.map(r => r.response?.traceId), conversationIds = observed.map(r => r.conversationId);
  if (traceIds.some(id => !uuid(id)) || conversationIds.some(id => typeof id !== 'string' || !id.trim()) ||
      new Set(traceIds).size !== traceIds.length || new Set(conversationIds).size !== conversationIds.length) {
    throw new Error('Observed replay requires unique valid trace and conversation identities');
  }
  for (const r of [...baseline, ...candidate]) {
    if (!iso(r.asOf) || r.asOf !== r.response?.asOf || operationalFailure(r)) throw new Error('Replay requires explicit frozen asOf and successful capture');
  }
  const key = r => digest({ caseId: r.caseId, request: r.request, evidence: r.evidence, asOf: r.asOf, split: r.split });
  const index = rows => {
    const out = new Map();
    for (const r of rows) { const k = key(r); if (out.has(k)) throw new Error('Duplicate comparison case'); out.set(k, r); }
    return out;
  };
  const b = index(baseline), c = index(candidate);
  const transitions = Object.fromEntries(criteria.map(k => [k, { improved: 0, regressed: 0, unchanged: 0, pending: 0 }]));
  let paired = 0;
  for (const [k, old] of b) {
    const next = c.get(k);
    if (!next) continue;
    if (old.provenance !== next.provenance) throw new Error('Cannot compare synthetic tests with actual observations');
    if (!old.expectedVersion || !next.expectedVersion || old.expectedVersion === next.expectedVersion ||
        old.response?.version !== old.expectedVersion || next.response?.version !== next.expectedVersion ||
        old.freshConversation !== true || next.freshConversation !== true) throw new Error('Comparison requires distinct confirmed versions and fresh conversations');
    if (!Array.isArray(old.evidence) || old.evidenceOrigin !== 'independent-input' || next.evidenceOrigin !== 'independent-input') throw new Error('Comparison requires independent frozen evidence');
    paired++;
    const a = evaluate(old).checks, z = evaluate(next).checks;
    for (const criterion of criteria) {
      const state = a[criterion] === 'pending' || z[criterion] === 'pending' ? 'pending' :
        a[criterion] === z[criterion] ? 'unchanged' : z[criterion] === 'pass' ? 'improved' : 'regressed';
      transitions[criterion][state]++;
    }
  }
  return { schema: 'quest-comparison-v1', paired, unmatchedBaseline: b.size-paired, unmatchedCandidate: c.size-paired,
    status: paired ? 'metadata-comparison-only' : 'pending-matched-evidence', transitions };
}
