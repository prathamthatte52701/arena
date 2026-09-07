import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'docs', 'phase0', 'evidence');
mkdirSync(output, { recursive: true });
const jobs = [
  ['legacy-tests', ['tests/combat.mjs']],
  ['phase0-tests', ['--test', 'tests/phase0.mjs']],
  ['types', ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false']],
  ['build', ['node_modules/vinext/dist/cli.js', 'build']],
  ['lint', ['node_modules/oxlint/bin/oxlint']],
];
const results = [];
for (const [name, args] of jobs) {
  const started = Date.now();
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  writeFileSync(join(output, name + '.log'), (result.stdout ?? '') + (result.stderr ?? '') + (result.error?.message ?? ''));
  results.push({ name, exitCode: result.status, durationMs: Date.now() - started });
  console.log(name + ': ' + (result.status === 0 ? 'PASS' : 'FAIL'));
}
writeFileSync(join(output, 'results.json'), JSON.stringify({ date: new Date().toISOString(), node: process.version, results }, null, 2) + '\n');
// Keep pre-existing lint failures visible; never report a fully green gate while they remain.
process.exitCode = results.some(r => r.exitCode !== 0) ? 1 : 0;
