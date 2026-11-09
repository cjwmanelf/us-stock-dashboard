// Offline component callback checks. Native browser focus/hydration remain a separate check.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(file, dependencies = {}, globals = {}) {
  const slots = [], effects = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useId() { cursor++; return 'test-id'; },
    useEffect(callback, deps) {
      const i = cursor++, previous = slots[i];
      if (!previous || deps.some((value, j) => !Object.is(value, previous.deps[j]))) {
        previous?.cleanup?.();
        slots[i] = { deps };
        effects.push(() => { slots[i].cleanup = callback(); });
      }
    },
    useActionState(action, initial) {
      const [state, update] = hooks.useState(initial);
      return [state, async data => update(await action(state, data)), false];
    },
    ...dependencies.react,
  };
  const loaded = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext('(function(require,module,exports){' + code + '\n})', {
    URL, AbortController, setTimeout, clearTimeout, ...globals,
  })(name => name === 'react' ? hooks : dependencies[name] ?? require(name), loaded, loaded.exports);
  return {
    exports: loaded.exports,
    render(component, props = {}) { cursor = 0; return component(props); },
    flush() { effects.splice(0).forEach(effect => effect()); },
    dispose() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
const find = (tree, type) => nodes(tree).find(node => node.type === type);
const wait = () => new Promise(resolve => setTimeout(resolve, 210));

(async () => {
  const h = harness('src/components/BriefingCitations.tsx');
  const props = { answer: 'Evidence [s1]', sources: [{ id: 's1', title: 'Synthetic', url: 'https://example.invalid', publishedAt: null }] };
  let tree = h.render(h.exports.BriefingCitations, props);
  const events = [];
  const modal = { open: false, showModal() { this.open = true; events.push('modal'); }, close() { this.open = false; } };
  find(tree, 'dialog').props.ref.current = modal;
  nodes(tree).find(node => node.props?.autoFocus).props.ref.current = { focus() { assert(modal.open); events.push('close-focus'); } };
  h.flush();
  find(tree, 'button').props.onClick({ currentTarget: { isConnected: true, focus() { events.push('return-focus'); } } });
  tree = h.render(h.exports.BriefingCitations, props); h.flush();
  assert.deepEqual(events, ['modal', 'close-focus']);
  nodes(tree).find(node => node.props?.autoFocus).props.onClick();
  find(tree, 'dialog').props.onClose();
  assert.deepEqual(events, ['modal', 'close-focus', 'return-focus']);
  assert.equal(find(h.render(h.exports.BriefingCitations, props), 'button').props['aria-expanded'], false);

  let result = { error: 'synthetic validation failure' }, resets = 0;
  const add = harness('src/components/AddHoldingForm.tsx', {
    '@/app/portfolio/actions': { addHolding: async () => result },
    '@/components/TickerAutocomplete': { TickerAutocomplete: 'ticker-test' },
  });
  tree = add.render(add.exports.AddHoldingForm);
  tree.props.ref.current = { reset() { resets++; } };
  await tree.props.action(new FormData());
  tree = add.render(add.exports.AddHoldingForm);
  assert.equal(resets, 0); assert.equal(find(tree, 'ticker-test').key, '0');
  result = { success: true };
  for (let n = 1; n <= 2; n++) {
    await tree.props.action(new FormData()); tree = add.render(add.exports.AddHoldingForm);
    assert.equal(resets, n); assert.equal(find(tree, 'ticker-test').key, String(n));
  }

  const row = { holding: { id: 'mock', ticker: 'MOCK', quantity: 2, avg_price: 10 }, cost: 20, price: null, value: null, gain: null, gainPct: null };
  const edit = harness('src/components/EditableHoldingRow.tsx', {
    '@/app/portfolio/actions': { updateHolding: async () => result },
    '@/components/SubmitButton': { SubmitButton: 'submit-test' },
    '@/lib/format': Object.fromEntries(['formatKRW', 'formatNumber', 'formatPct', 'formatSignedUSD', 'formatUSD'].map(name => [name, String])),
  });
  tree = edit.render(edit.exports.EditableHoldingRow, { row });
  find(tree, 'button').props.onClick();
  const editor = edit.render(edit.exports.EditableHoldingRow, { row });
  let closed = 0;
  const editorProps = { ...editor.props, onClose: () => closed++ };
  result = { error: 'synthetic edit failure' };
  tree = edit.render(editor.type, editorProps);
  await find(tree, 'form').props.action(new FormData());
  tree = edit.render(editor.type, editorProps);
  assert.equal(find(tree, 'p').props.children, result.error);
  assert.equal(closed, 0);
  result = { success: true };
  await find(tree, 'form').props.action(new FormData());
  assert.equal(closed, 1);

  let subscription, snapshot, serverSnapshot, notify, disconnected = false, mediaListener;
  const document = { documentElement: { dataset: { theme: 'dark' } }, cookie: '' };
  const media = { matches: false, addEventListener(_name, listener) { mediaListener = listener; }, removeEventListener(_name, listener) { assert.equal(listener, mediaListener); } };
  const theme = harness('src/components/ThemeToggle.tsx', { react: {
    useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
      subscription = subscribe; snapshot = getSnapshot; serverSnapshot = getServerSnapshot;
      return getServerSnapshot();
    },
  } }, { document, window: { matchMedia: () => media }, MutationObserver: class {
    constructor(listener) { notify = listener; }
    observe(target, options) { assert.equal(target, document.documentElement); assert.equal(options.attributeFilter[0], 'data-theme'); }
    disconnect() { disconnected = true; }
  } });
  tree = theme.render(theme.exports.ThemeToggle);
  assert.equal(serverSnapshot(), null); assert.equal(find(tree, 'svg'), undefined); assert.equal(snapshot(), true);
  let notifications = 0;
  const unsubscribe = subscription(() => notifications++);
  tree.props.onClick(); notify(); assert.equal(snapshot(), false); assert.equal(notifications, 1);
  assert(document.cookie.startsWith('theme=light;'));
  delete document.documentElement.dataset.theme; media.matches = true; mediaListener();
  assert.equal(snapshot(), true); unsubscribe(); assert(disconnected);

  const calls = [], pending = [];
  const autocomplete = harness('src/components/TickerAutocomplete.tsx', {}, {
    fetch: (url, options) => {
      if (url.includes('warm=1')) return Promise.resolve({});
      calls.push(url);
      return new Promise(resolve => pending.push({ resolve, signal: options.signal }));
    },
  });
  const render = () => autocomplete.render(autocomplete.exports.TickerAutocomplete, { inputCls: '' });
  const change = value => { find(render(), 'input').props.onChange({ target: { value } }); autocomplete.flush(); render(); autocomplete.flush(); };
  render(); autocomplete.flush();
  change('a'); change('aa');
  assert.equal(calls.length, 0); await wait(); assert.equal(calls.length, 1);
  change('ms'); assert.equal(pending[0].signal.aborted, true);
  pending[0].resolve({ ok: true, json: async () => [{ symbol: 'STALE', description: 'stale' }] });
  await wait(); assert.equal(calls.length, 2);
  pending[1].resolve({ ok: true, json: async () => [{ symbol: 'MSFT', description: 'Synthetic' }] });
  await new Promise(resolve => setImmediate(resolve));
  tree = render(); assert.equal(find(tree, 'li').props.children[0].props.children, 'MSFT');
  find(tree, 'input').props.onKeyDown({ key: 'ArrowDown', preventDefault() {} });
  tree = render(); let prevented = false;
  find(tree, 'input').props.onKeyDown({ key: 'Enter', preventDefault() { prevented = true; } });
  tree = render(); autocomplete.flush(); assert(prevented);
  assert.equal(find(tree, 'input').props.value, 'MSFT');
  assert.equal(find(tree, 'input').props['aria-expanded'], false);
  await wait(); assert.equal(calls.length, 2);
  change(''); assert.equal(find(render(), 'input').props['aria-expanded'], false);
  change('ms'); assert.equal(find(render(), 'li').props.children[0].props.children, 'MSFT');
  await wait(); assert.equal(calls.length, 2);
  autocomplete.dispose();
  console.log('PASS: modal focus ordering/close/return; repeated add resets/error retention; edit error/success close; theme SSR snapshot/DOM and media subscriptions/cleanup; autocomplete debounce, stale-response abort, keyboard selection, clear and cache; offline callback harness, not native browser proof');
})().catch(error => { console.error(error); process.exitCode = 1; });
