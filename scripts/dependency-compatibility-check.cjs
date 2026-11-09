// Offline regression for the scoped typescript-estree -> minimatch override.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const parser = require('@typescript-eslint/parser');
const fromEstree = createRequire(require.resolve('@typescript-eslint/typescript-estree'));
const { minimatch } = fromEstree('minimatch');
assert.equal(fromEstree('minimatch/package.json').version, '11.0.1');
assert.equal(minimatch('.hidden.ts', '*.ts', { dot: true }), true);
assert.equal(minimatch('nested/item.ts', '*.ts', { dot: true }), false);
assert.equal(minimatch('Component.tsx', '*.{ts,tsx}', { dot: true }), true);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quest-parser-compat-'));
try {
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { strict: true, jsx: 'preserve', target: 'ES2022' },
    include: ['included.ts'],
  }));
  fs.writeFileSync(path.join(dir, 'included.ts'), 'export const included = true;');
  const samples = [
    ['sample.ts', 'interface Row { value: number }; const row: Row = { value: 1 }; export default row;'],
    ['Component.tsx', 'type Props = { title: string }; export const Component = ({ title }: Props) => <button>{title}</button>;'],
    ['.hidden.ts', 'export const values = [1, 2] satisfies number[];'],
  ];
  for (const [name, source] of samples) {
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, source);
    const result = parser.parseForESLint(source, {
      filePath, tsconfigRootDir: dir,
      projectService: { allowDefaultProject: ['*.ts', '*.tsx'], defaultProject: 'tsconfig.json' },
      ecmaFeatures: { jsx: true }, sourceType: 'module', loc: true, range: true,
    });
    assert.equal(result.ast.type, 'Program');
    assert.ok(result.services.program, 'typed project service must provide a Program');
    assert.ok(result.services.program.getSourceFile(filePath), 'typed source must be included');
  }
  const rejected = path.join(dir, 'nested', 'rejected.ts');
  fs.mkdirSync(path.dirname(rejected));
  fs.writeFileSync(rejected, 'export const rejected = 1;');
  assert.throws(() => parser.parseForESLint('export const rejected = 1;', {
    filePath: rejected, tsconfigRootDir: dir,
    projectService: { allowDefaultProject: ['*.ts', '*.tsx'], defaultProject: 'tsconfig.json' },
  }), /not found by the project service|allowDefaultProject/);
  console.log('PASS: scoped minimatch11 named CJS API, dot/brace/path matching; typed TS/TSX/default-project selection and nested exclusion; no network');
} finally {
  parser.clearCaches();
  // This directory is created by mkdtemp above and contains only synthetic fixtures.
  assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(dir).startsWith('quest-parser-compat-'));
  fs.rmSync(dir, { recursive: true, force: true });
}
