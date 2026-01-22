import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDirectionalEdge, normalizedId } from './shared.mjs';

test('normalizedId trims strings and stringifies primitives', () => {
  assert.equal(normalizedId('  abc  '), 'abc');
  assert.equal(normalizedId(123), '123');
  assert.equal(normalizedId(true), 'true');
  assert.equal(normalizedId(null), '');
  assert.equal(normalizedId(undefined), '');
});

test('isDirectionalEdge default behavior treats missing toEnd as arrow', () => {
  assert.equal(isDirectionalEdge({ fromEnd: 'none' }), true);
  assert.equal(isDirectionalEdge({ fromEnd: 'none', toEnd: 'none' }), false);
  assert.equal(isDirectionalEdge({ fromEnd: 'arrow', toEnd: 'none' }), true);
});

