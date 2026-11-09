import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
export const root = fileURLToPath(new URL('../../', import.meta.url));
export function configuration() {
  const args = process.argv.slice(2);
  if (!args[0] || args.some((arg, i) => i > 0 && arg !== '--execute')) throw new Error('Usage: node scripts/cloud-run/<build|deploy>.mjs CONFIG.json [--execute]');
  const config = JSON.parse(readFileSync(args[0], 'utf8').replace(/^\uFEFF/, ''));
  for (const key of ['project', 'region', 'service', 'repository', 'tag']) {
    if (typeof config[key] !== 'string' || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(config[key])) throw new Error(`Invalid explicit ${key}`);
  }
  if (!/^https:\/\/[a-z0-9.-]+\/?$/.test(config.supabaseUrl ?? '')) throw new Error('Explicit public Supabase HTTPS URL required');
  const publicKey = config.supabaseAnonKey ?? '';
  let anon = publicKey.startsWith('sb_publishable_');
  try { anon ||= JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url')).role === 'anon'; } catch {}
  if (!anon || !/^[A-Za-z0-9_.-]+$/.test(publicKey) || publicKey.startsWith('sb_secret_')) throw new Error('Only a Supabase publishable or anon-role key is permitted');
  const image = `${config.region}-docker.pkg.dev/${config.project}/${config.repository}/${config.service}:${config.tag}`;
  return { config, image, execute: args.includes('--execute') };
}
export function run(command, args, execute, capture = false) {
  if (!execute) { console.log(JSON.stringify({ command, args })); return ''; }
  // Windows gcloud is a .cmd shim; invoke through its Python entry point instead
  // of passing untrusted config through cmd.exe shell quoting.
  let executable = command;
  let argv = args;
  if (process.platform === 'win32' && command === 'gcloud') {
    const lookup = spawnSync('where.exe', ['gcloud.cmd'], { encoding: 'utf8' });
    if (lookup.status !== 0) throw new Error('gcloud.cmd not on PATH');
    const shim = lookup.stdout.trim().split(/\r?\n/)[0];
    const sdk = resolve(dirname(shim), '..');
    executable = process.env.CLOUDSDK_PYTHON || join(sdk, 'platform', 'bundledpython', 'python.exe');
    argv = [join(sdk, 'lib', 'gcloud.py'), ...args];
  }
  const result = spawnSync(executable, argv, { cwd: root, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8', shell: false });
  if (result.error || result.status !== 0) throw new Error(`${command} failed (${result.status ?? result.error?.code})`);
  return result.stdout;
}


