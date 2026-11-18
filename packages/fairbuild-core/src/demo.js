import { mkdtempSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { AgentRuntime } from './runtime.js';

/** Pseudonym key for demos and documentation only: they run on fictional fixtures, and a fixed key keeps their output the same from run to run. Real runs use the per-customer key in .fairbuild/personal.key. */
export const DEMO_PERSONAL_KEY = createHash('sha256').update('fairbuild demos: fictional fixtures only').digest();

/** Copy bundled fixtures into a temp folder and return a runtime rooted there. */
export function demoRuntime(manifest, fixturesDir, options = {}) {
  const root = mkdtempSync(join(tmpdir(), `${manifest.name}-demo-`));
  cpSync(fixturesDir, root, { recursive: true });
  return new AgentRuntime(manifest, { root, personalKey: DEMO_PERSONAL_KEY, ...options });
}

export function printStep(label, r) {
  const head = `\n▶ ${label}\n  status: ${r.status}  decision: ${r.decision}${r.approved_by ? `  approved by: ${r.approved_by}` : ''}${r.auto ? '  (auto)' : ''}`;
  process.stdout.write(head + '\n');
  if (r.reason && r.status !== 'executed') process.stdout.write(`  reason: ${r.reason}\n`);
  if (r.result && r.result.summary) process.stdout.write(`  ${r.result.summary}\n`);
}
