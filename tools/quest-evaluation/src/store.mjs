import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { digest, canonical } from './evaluate.mjs';

export async function saveSnapshot(directory, record) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const hash = digest(record);
  const path = join(directory, `${hash}.json`);
  try { await writeFile(path, canonical(record) + '\n', { flag: 'wx', mode: 0o600 }); }
  catch (e) {
    if (e.code !== 'EEXIST') throw e;
    if (digest(JSON.parse(await readFile(path, 'utf8'))) !== hash) throw new Error('Existing snapshot integrity failure');
  }
  // Write-once API + content-addressed verification, not a claim of OS-level WORM storage.
  return { hash, path };
}
export async function readSnapshots(directory) {
  const files = (await readdir(directory)).filter(f => /^[a-f0-9]{64}\.json$/.test(f)).sort();
  const rows = [];
  for (const file of files) {
    const record = JSON.parse(await readFile(join(directory, file), 'utf8'));
    if (`${digest(record)}.json` !== basename(file)) throw new Error('Snapshot integrity failure');
    if (!['synthetic', 'observed'].includes(record.provenance)) throw new Error('Snapshot provenance required');
    rows.push(record);
  }
  return rows;
}
