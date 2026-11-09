import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { collect } from './collect.mjs';
import { report, compare } from './evaluate.mjs';
import { readSnapshots, saveSnapshot } from './store.mjs';
import { join } from 'node:path';
import { joinCaptured } from './join.mjs';

async function main() {
  const { values: v, positionals: [command] } = parseArgs({ allowPositionals: true, options: {
    live: { type: 'boolean', default: false }, 'allow-local-http': { type: 'boolean', default: false },
    'local-eval': { type: 'boolean', default: false }, evidence: { type: 'string' },
    cases: { type: 'string' }, version: { type: 'string' }, limit: { type: 'string', default: '3' },
    out: { type: 'string', default: 'private/observations' }, input: { type: 'string' },
    baseline: { type: 'string' }, candidate: { type: 'string' }
  } });
  let output;
  if (command === 'collect') {
    const cases = JSON.parse(await readFile(v.cases ?? new URL('../fixtures/cases.json', import.meta.url), 'utf8'));
    output = await collect({ endpoint: process.env.BRIEFING_EVAL_ENDPOINT, cookie: process.env.BRIEFING_EVAL_COOKIE,
      bearer: process.env.BRIEFING_EVAL_BEARER, cases, version: v.version, limit: Number(v.limit), live: v.live,
      directory: v.out, allowHttp: v['allow-local-http'], localEval: v['local-eval'], evalToken: process.env.BRIEFING_EVAL_REQUEST_TOKEN });
  } else if (command === 'snapshot') {
    const record = JSON.parse(await readFile(v.input, 'utf8'));
    if (!['observed','synthetic'].includes(record.provenance)) throw new Error('Explicit provenance required');
    const saved = await saveSnapshot(v.out, record);
    output = { snapshotHash: saved.hash };
  } else if (command === 'join') {
    const rows = await readSnapshots(v.input);
    const joined = [];
    for (const record of rows) {
      const id = record.response?.traceId;
      if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) throw new Error('Capture UUID required');
      const capture = JSON.parse(await readFile(join(v.evidence, `${id}.json`), 'utf8'));
      joined.push(joinCaptured(record, capture));
    }
    for (const record of joined) await saveSnapshot(v.out, record);
    output = { joined: joined.length, evidenceStatus: 'independent-input' };
  } else if (command === 'report') output = report(await readSnapshots(v.input ?? v.out));
  else if (command === 'compare') output = compare(await readSnapshots(v.baseline), await readSnapshots(v.candidate));
  else throw new Error('Commands: collect, snapshot, join, report, compare; see README');
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}
main().catch(() => { process.stderr.write('Evaluation command failed. Check arguments, private input integrity, endpoint configuration and README. Sensitive error details suppressed.\n'); process.exitCode = 1; });
