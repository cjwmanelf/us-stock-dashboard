import { configuration, run } from './common.mjs';
const { config: c, image, execute } = configuration();
if (!new RegExp(`^[a-z][a-z0-9-]{4,28}[a-z0-9]@${c.project}\\.iam\\.gserviceaccount\\.com$`).test(c.runtimeServiceAccount ?? '')) throw new Error('Explicit dedicated runtimeServiceAccount in target project required');
if (!['private', 'public'].includes(c.access)) throw new Error('Explicit access: private or public required');
if (!['512Mi', '1Gi'].includes(c.memory ?? '512Mi')) throw new Error('memory must be 512Mi or 1Gi');
const allowedSecrets = new Set(['SUPABASE_SERVICE_ROLE_KEY', 'STOCK_API_KEY', 'MARKETAUX_API_KEY', 'CRON_SECRET', 'BRIEFING_FEEDBACK_SECRET', 'BRIEFING_LLM_API_KEY']);
const allowedEnv = new Set(['BRIEFING_LLM_PROVIDER', 'BRIEFING_LLM_MODEL', 'BRIEFING_LLM_BASE_URL', 'GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_LOCATION', 'BRIEFING_VERTEX_PROJECT_ID', 'BRIEFING_VERTEX_LOCATION', 'BRIEFING_VERTEX_AUTH', 'SEC_USER_AGENT', 'GAME_API_ALLOWED_ORIGINS']);
const env = { NEXT_PUBLIC_SUPABASE_URL: c.supabaseUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: c.supabaseAnonKey, BRIEFING_EVAL_MODE: 'false', BRIEFING_TRACE_CONTENT: 'false', LANGFUSE_CAPTURE_CONTENT: 'false', LANGFUSE_ENABLED: 'false' };
for (const [key, value] of Object.entries(c.env ?? {})) {
  if (!allowedEnv.has(key) || typeof value !== 'string' || /[|\r\n]/.test(value)) throw new Error(`Unsupported public runtime setting: ${key}`);
  env[key] = value;
}
if (env.BRIEFING_VERTEX_AUTH && env.BRIEFING_VERTEX_AUTH !== 'adc') throw new Error('Cloud Vertex authentication must use adc');
const secrets = Object.entries(c.secrets ?? {}).map(([key, ref]) => {
  if (!allowedSecrets.has(key) || typeof ref !== 'string' || !/^[a-zA-Z0-9_-]+:[1-9][0-9]*$/.test(ref)) throw new Error(`Use an allowed secret and pinned numeric version: ${key}`);
  return `${key}=${ref}`;
});
if (execute) {
  const services = JSON.parse(run('gcloud', ['run', 'services', 'list', '--project', c.project, '--region', c.region, '--format=json', '--quiet'], true, true));
  if (services.some(service => service.metadata?.name === c.service)) throw new Error('Service already exists: refusing to modify an existing service. Use a new isolated service name.');
}
run('gcloud', ['auth', 'configure-docker', `${c.region}-docker.pkg.dev`, '--quiet'], execute);
run('docker', ['push', image], execute);
const args = ['run', 'deploy', c.service, '--project', c.project, '--region', c.region, '--platform=managed', '--image', image, '--service-account', c.runtimeServiceAccount, '--port=8080', '--min=0', '--max=1', '--min-instances=0', '--max-instances=1', '--cpu=1', `--memory=${c.memory ?? '512Mi'}`, '--concurrency=8', '--timeout=300s', '--cpu-throttling', '--ingress=all', c.access === 'public' ? '--allow-unauthenticated' : '--no-allow-unauthenticated', '--set-env-vars', '^|^' + Object.entries(env).map(([k, v]) => `${k}=${v}`).join('|'), '--quiet'];
if (secrets.length) args.push('--set-secrets', secrets.join(','));
run('gcloud', args, execute);
// Initial revision deliberately has no trusted origin and rejects briefing POSTs.
// Discover the provider-issued HTTPS URL only after creating this new service.
const describeArgs = ['run', 'services', 'describe', c.service, '--project', c.project, '--region', c.region, '--format=json', '--quiet'];
if (execute) {
  const service = JSON.parse(run('gcloud', describeArgs, true, true));
  const origin = service.status?.url;
  const url = new URL(origin);
  if (service.metadata?.name !== c.service || url.protocol !== 'https:' || url.origin !== origin || !url.hostname.endsWith('.run.app')) throw new Error('Cloud Run service URL could not be validated; origin remains fail-closed');
  run('gcloud', ['run', 'services', 'update', c.service, '--project', c.project, '--region', c.region, '--update-env-vars', `BRIEFING_ALLOWED_ORIGINS=${origin}`, '--quiet'], true);
} else {
  run('gcloud', describeArgs, false);
  console.log('After creation: validate status.url as exact HTTPS *.run.app origin, then update only BRIEFING_ALLOWED_ORIGINS on the newly created service.');
}
console.log(execute ? 'Deployment and service-origin configuration completed; verify application auth and runtime behavior before cutover.' : 'Dry run only: no cloud calls, authentication changes, push or deployment.');

