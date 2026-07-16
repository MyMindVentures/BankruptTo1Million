import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyPublicI18n } from '../scripts/verify-public-i18n.mjs';

test('public i18n registry verification passes for enforced surfaces', async () => {
  const errors = await verifyPublicI18n();
  if (errors.length) {
    assert.fail(`Public i18n verification failed:\n${errors.slice(0, 30).map((entry) => `- ${entry}`).join('\n')}${errors.length > 30 ? `\n- ...and ${errors.length - 30} more` : ''}`);
  }
});
