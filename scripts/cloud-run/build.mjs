import { configuration, run } from './common.mjs';
const { config, image, execute } = configuration();
run('docker', ['build', '--platform=linux/amd64', '--pull', '--build-arg', `NEXT_PUBLIC_SUPABASE_URL=${config.supabaseUrl}`, '--build-arg', `NEXT_PUBLIC_SUPABASE_ANON_KEY=${config.supabaseAnonKey}`, '-t', image, '.'], execute);
console.log(`Image: ${image}. Build only; nothing pushed.`);
