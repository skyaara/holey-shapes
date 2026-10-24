import assert from 'node:assert/strict';
import { handleFromPath, normalizeHandle, shareOnX, shareUrl, validHandle } from '../src/handle.js';

// Share links: handles are case-insensitive, the @ is optional, and anything
// that is not a plausible handle is rejected rather than rendered.
assert.equal(normalizeHandle('  @@Ada_Lovelace '), 'ada_lovelace');
assert.equal(handleFromPath('/@Ada'), 'ada');
assert.equal(handleFromPath('/@ada/'), 'ada');
assert.equal(handleFromPath('/@%40ada'), 'ada');
assert.equal(handleFromPath('/@grace.hopper-1'), 'grace.hopper-1');
for (const path of ['/', '/@', '/ada', '/@a/b', '/@%E0%A4%A', '/@<script>', `/@${'a'.repeat(33)}`]) {
  assert.equal(handleFromPath(path), '', path);
}
assert.equal(validHandle('ada'), true);
assert.equal(validHandle('ad a'), false);
assert.equal(shareUrl('ada'), 'https://holey-shapes.aakashreddy.com/@ada');
assert.match(shareOnX('ada', 'My holey.'), /^https:\/\/x\.com\/intent\/post\?text=My%20holey\.&url=https%3A%2F%2Fholey-shapes\.aakashreddy\.com%2F%40ada$/);
console.log('share link handle checks passed');
