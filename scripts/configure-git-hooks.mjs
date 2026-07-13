import { chmodSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const hookDirectory = resolve('.githooks');
const preCommitHook = resolve(hookDirectory, 'pre-commit');

if (!existsSync('.git')) {
  console.log('Skipping Git hook setup: no .git directory found.');
  process.exit(0);
}

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
  if (existsSync(preCommitHook)) chmodSync(preCommitHook, 0o755);
  console.log('Git hooks configured from .githooks.');
} catch (error) {
  console.warn('Git hook setup could not be completed:', error instanceof Error ? error.message : error);
}
