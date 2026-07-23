import { execFileSync } from 'node:child_process';

const forbidden = [
  'Kevin De Vlieger',
  'De Vlieger',
  'Y8541916Y',
];

let failed = false;
for (const value of forbidden) {
  try {
    const output = execFileSync('git', ['grep', '-n', '-i', '--', value, 'HEAD', '--', '.', ':(exclude)supabase/migrations/20260723123000_remove_kevin_personal_identifiers.sql'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (output) {
      console.error(`Forbidden personal identifier found: ${value}\n${output}`);
      failed = true;
    }
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}

if (failed) process.exit(1);
console.log('Privacy redaction check passed.');
