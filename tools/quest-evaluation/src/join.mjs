// The private sink is trusted capture infrastructure, not an output citation source.
export function joinCaptured(record, capture) {
  if (record.schema !== 'quest-observation-v1' || capture.schema !== 'briefing-evidence-v1' ||
      capture.evidenceOrigin !== 'independent-input' || !Array.isArray(capture.evidence) ||
      !record.response?.traceId || record.response.traceId !== capture.traceId ||
      record.request?.ticker !== capture.request?.ticker ||
      (record.request?.question ?? '') !== capture.request?.question ||
      record.response.asOf !== capture.asOf || !Number.isFinite(Date.parse(capture.asOf)) ||
      record.inputOrigin !== capture.inputOrigin || record.errorCode || record.response.version !== record.expectedVersion) {
    throw new Error('Independent capture does not match observation');
  }
  return { ...record, evidence: capture.evidence, asOf: capture.asOf, evidenceOrigin: 'independent-input' };
}
