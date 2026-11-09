import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { digest } from './evaluate.mjs';
const nativeRequire = createRequire(import.meta.url);

// Trusted local source only, NOT a sandbox for untrusted modules. No production loader changes.
export function loadService(servicePath, { env = {}, allowGoogleAuth = false, fetchImpl = async () => { throw new Error('Offline'); } } = {}) {
  const entry = realpathSync(servicePath), root = dirname(entry), cache = new Map();
  const source = readFileSync(entry, 'utf8');
  const context = vm.createContext({ Buffer, URL, AbortSignal, Date, console: { log() {}, error() {}, warn() {} },
    process: { env: { ...env }, cwd: () => root }, fetch: fetchImpl });
  function load(file) {
    file = realpathSync(file);
    if (dirname(file) !== root) throw new Error('Only sibling briefing modules supported');
    if (cache.has(file)) return cache.get(file).exports;
    const loaded = { exports: {} }; cache.set(file, loaded);
    const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true
    } }).outputText;
    const require = name => {
      if (name === 'server-only') return {}; // CLI-only boundary marker; production marker is untouched.
      if (name === 'google-auth-library') return allowGoogleAuth ? nativeRequire(name) : { GoogleAuth: class { async getAccessToken() { throw new Error('Offline credentials'); } } };
      if (name === '@/lib/feed') return { getFeed() { throw new Error('Frozen replay cannot retrieve'); } };
      if (name.startsWith('node:')) return nativeRequire(name);
      if (name.startsWith('./')) return load(resolve(root, name + '.ts'));
      throw new Error('Unsupported replay dependency');
    };
    vm.runInContext('(function(require,module,exports){' + js + '\n})', context, { timeout: 5000 })(require,loaded,loaded.exports);
    return loaded.exports;
  }
  const service = load(entry), types = load(resolve(root, 'types.ts'));
  if (typeof service.generateBriefingFromEvidence !== 'function' || typeof types.VERSION !== 'string') throw new Error('Invalid service artifact');
  return { generate: service.generateBriefingFromEvidence, version: types.VERSION, implementationHash: digest(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, removeComments: true } }).outputText) };
}
