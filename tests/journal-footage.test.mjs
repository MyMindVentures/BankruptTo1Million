import test from 'node:test';
import assert from 'node:assert/strict';

const FILENAME_LIKE = /^[\w.-]+\.(jpe?g|png|gif|webp|avif|heic|mp4|mov|webm|mkv)$/i;
const NUMERIC_ONLY = /^\d+$/;

function isFilenameLikeText(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return false;
  return FILENAME_LIKE.test(normalized) || NUMERIC_ONLY.test(normalized);
}

function resolveFootageCaption(captionOverride, caption) {
  const resolved = String(captionOverride || caption || '').trim();
  return resolved || null;
}

function resolveFootageAlt(altOverride, altText, assetType, number, labels) {
  const candidate = String(altOverride || altText || '').trim();
  if (candidate && !isFilenameLikeText(candidate)) return candidate;
  const template = assetType === 'video' ? labels.video : labels.image;
  return template.replace('{number}', String(number));
}

function isVideoFootage(item) {
  return item.asset_type === 'video' || Boolean(item.mime_type?.startsWith('video/'));
}

function wrapFootageIndex(index, length, direction) {
  if (length < 1) return 0;
  return (index + direction + length) % length;
}

const labels = {
  image: 'Event photo {number}',
  video: 'Event video {number}',
};

test('resolveFootageCaption only uses editorial caption fields', () => {
  assert.equal(resolveFootageCaption(null, null), null);
  assert.equal(resolveFootageCaption('Sunset at the venue', null), 'Sunset at the venue');
  assert.equal(resolveFootageCaption(null, 'Behind the scenes'), 'Behind the scenes');
});

test('resolveFootageAlt rejects filename-like values', () => {
  assert.equal(resolveFootageAlt(null, '11367.jpg', 'image', 2, labels), 'Event photo 2');
  assert.equal(resolveFootageAlt(null, '11367', 'image', 3, labels), 'Event photo 3');
  assert.equal(resolveFootageAlt('Crowd cheering', '11367.jpg', 'image', 1, labels), 'Crowd cheering');
  assert.equal(resolveFootageAlt(null, null, 'video', 4, labels), 'Event video 4');
});

test('isVideoFootage detects videos by type or mime', () => {
  assert.equal(isVideoFootage({ asset_type: 'video', mime_type: null }), true);
  assert.equal(isVideoFootage({ asset_type: 'image', mime_type: 'video/mp4' }), true);
  assert.equal(isVideoFootage({ asset_type: 'image', mime_type: 'image/jpeg' }), false);
});

test('wrapFootageIndex loops in both directions', () => {
  assert.equal(wrapFootageIndex(0, 4, -1), 3);
  assert.equal(wrapFootageIndex(3, 4, 1), 0);
  assert.equal(wrapFootageIndex(1, 4, 1), 2);
});
