import { test } from 'node:test';
import assert from 'node:assert';
import {
  readJson,
  isFiniteNumber,
  normalizedId,
  getNodeSortKey,
  getNodeTypePriority,
  getNodeColor,
  getEdgeColor,
  isDirectionalEdge,
  isContainedBy,
  hexToHsl,
  hslToHex,
  mutateColor,
  generateRainbowGradient,
  generateHierarchicalColors,
} from './shared.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// File I/O Tests
test('readJson reads and parses JSON file', () => {
  const testFile = path.join(__dirname, '..', '..', 'test-files', 'structured-json-2-single-array.json');
  const data = readJson(testFile);
  assert(typeof data === 'object');
  assert(data !== null);
});

// Data Validation Tests
test('isFiniteNumber returns true for finite numbers', () => {
  assert.strictEqual(isFiniteNumber(42), true);
  assert.strictEqual(isFiniteNumber(0), true);
  assert.strictEqual(isFiniteNumber(-3.14), true);
});

test('isFiniteNumber returns false for non-finite values', () => {
  assert.strictEqual(isFiniteNumber(Infinity), false);
  assert.strictEqual(isFiniteNumber(-Infinity), false);
  assert.strictEqual(isFiniteNumber(NaN), false);
  assert.strictEqual(isFiniteNumber('42'), false);
  assert.strictEqual(isFiniteNumber(null), false);
});

test('normalizedId converts strings by trimming', () => {
  assert.strictEqual(normalizedId('  hello  '), 'hello');
  assert.strictEqual(normalizedId('test'), 'test');
});

test('normalizedId converts numbers and booleans to strings', () => {
  assert.strictEqual(normalizedId(42), '42');
  assert.strictEqual(normalizedId(true), 'true');
  assert.strictEqual(normalizedId(false), 'false');
});

test('normalizedId returns empty string for null/undefined', () => {
  assert.strictEqual(normalizedId(null), '');
  assert.strictEqual(normalizedId(undefined), '');
});

// Node Sorting Tests
test('getNodeSortKey extracts text from text nodes', () => {
  const node = { type: 'text', text: '  Hello World  ' };
  assert.strictEqual(getNodeSortKey(node), 'hello world');
});

test('getNodeSortKey extracts filename from file nodes', () => {
  const node = { type: 'file', file: 'path/to/document.md' };
  assert.strictEqual(getNodeSortKey(node), 'document.md');
});

test('getNodeSortKey extracts URL from link nodes', () => {
  const node = { type: 'link', url: 'https://example.com' };
  assert.strictEqual(getNodeSortKey(node), 'https://example.com');
});

test('getNodeSortKey extracts label from group nodes', () => {
  const node = { type: 'group', label: 'My Group' };
  assert.strictEqual(getNodeSortKey(node), 'my group');
});

test('getNodeSortKey falls back to node id', () => {
  const node = { id: 'node-123', type: 'unknown' };
  assert.strictEqual(getNodeSortKey(node), 'node-123');
});

test('getNodeTypePriority returns 0 for content nodes', () => {
  assert.strictEqual(getNodeTypePriority({ type: 'text' }), 0);
  assert.strictEqual(getNodeTypePriority({ type: 'file' }), 0);
  assert.strictEqual(getNodeTypePriority({ type: 'group' }), 0);
});

test('getNodeTypePriority returns 1 for link nodes', () => {
  assert.strictEqual(getNodeTypePriority({ type: 'link' }), 1);
});

// Color Tests
test('getNodeColor returns lowercase color', () => {
  assert.strictEqual(getNodeColor({ color: '#FF0000' }), '#ff0000');
  assert.strictEqual(getNodeColor({ color: 'red' }), 'red');
});

test('getNodeColor returns empty string for missing color', () => {
  assert.strictEqual(getNodeColor({}), '');
  assert.strictEqual(getNodeColor({ color: undefined }), '');
});

test('getEdgeColor returns lowercase color', () => {
  assert.strictEqual(getEdgeColor({ color: '#00FF00' }), '#00ff00');
});

test('getEdgeColor returns empty string for missing color', () => {
  assert.strictEqual(getEdgeColor({}), '');
});

test('isDirectionalEdge detects arrow endpoints', () => {
  assert.strictEqual(isDirectionalEdge({ fromEnd: 'arrow' }), true);
  assert.strictEqual(isDirectionalEdge({ toEnd: 'arrow' }), true);
  assert.strictEqual(isDirectionalEdge({ fromEnd: 'none', toEnd: 'arrow' }), true);
});

test('isDirectionalEdge returns false for non-directional edges', () => {
  assert.strictEqual(isDirectionalEdge({ fromEnd: 'none', toEnd: 'none' }), false);
});

// Containment Tests
test('isContainedBy detects contained nodes', () => {
  const node = { x: 100, y: 100, width: 50, height: 50 };
  const group = { x: 50, y: 50, width: 200, height: 200 };
  assert.strictEqual(isContainedBy(node, group), true);
});

test('isContainedBy returns false for non-contained nodes', () => {
  const node = { x: 300, y: 300, width: 50, height: 50 };
  const group = { x: 50, y: 50, width: 200, height: 200 };
  assert.strictEqual(isContainedBy(node, group), false);
});

test('isContainedBy handles edge cases with default values', () => {
  const node = { x: undefined, y: undefined };
  const group = { x: 0, y: 0, width: 100, height: 100 };
  assert.strictEqual(isContainedBy(node, group), true);
});

// Color Conversion Tests
test('hexToHsl converts hex to HSL', () => {
  const [h, s, l] = hexToHsl('#FF0000');
  assert(h >= 0 && h <= 360);
  assert(s >= 0 && s <= 100);
  assert(l >= 0 && l <= 100);
});

test('hslToHex converts HSL to hex', () => {
  const hex = hslToHex(0, 100, 50);
  assert.strictEqual(typeof hex, 'string');
  assert(hex.startsWith('#'));
  assert.strictEqual(hex.length, 7);
});

test('hexToHsl and hslToHex round-trip', () => {
  const original = '#FF5733';
  const [h, s, l] = hexToHsl(original);
  const converted = hslToHex(h, s, l);
  // Allow small rounding differences
  const originalRgb = hexToHsl(converted);
  assert(Math.abs(originalRgb[0] - h) < 1);
  assert(Math.abs(originalRgb[1] - s) < 1);
  assert(Math.abs(originalRgb[2] - l) < 1);
});

test('mutateColor shifts hue', () => {
  const original = '#FF0000';
  const mutated = mutateColor(original, 120, 1, 1);
  const [origH] = hexToHsl(original);
  const [mutH] = hexToHsl(mutated);
  assert(Math.abs(mutH - (origH + 120)) < 1 || Math.abs(mutH - (origH + 120 - 360)) < 1);
});

test('mutateColor adjusts saturation', () => {
  const original = '#FF0000';
  const mutated = mutateColor(original, 0, 0.5, 1);
  const [, origS] = hexToHsl(original);
  const [, mutS] = hexToHsl(mutated);
  assert(mutS < origS);
});

test('mutateColor adjusts lightness', () => {
  const original = '#FF0000';
  const mutated = mutateColor(original, 0, 1, 1.2);
  const [, , origL] = hexToHsl(original);
  const [, , mutL] = hexToHsl(mutated);
  assert(mutL > origL);
});

// Rainbow Gradient Tests
test('generateRainbowGradient generates correct number of colors', () => {
  const colors = generateRainbowGradient(5);
  assert.strictEqual(colors.length, 5);
});

test('generateRainbowGradient generates valid hex colors', () => {
  const colors = generateRainbowGradient(10);
  for (const color of colors) {
    assert(typeof color === 'string');
    assert(color.startsWith('#'));
    assert.strictEqual(color.length, 7);
  }
});

test('generateRainbowGradient generates diverse colors', () => {
  const colors = generateRainbowGradient(7);
  const uniqueColors = new Set(colors);
  assert(uniqueColors.size > 1);
});

// Hierarchical Colors Tests
test('generateHierarchicalColors generates correct number of colors', () => {
  const colors = generateHierarchicalColors('#FF0000', 3);
  assert.strictEqual(colors.length, 4); // base + 3 levels
});

test('generateHierarchicalColors includes base color', () => {
  const baseColor = '#FF0000';
  const colors = generateHierarchicalColors(baseColor, 2);
  assert.strictEqual(colors[0], baseColor);
});

test('generateHierarchicalColors generates valid hex colors', () => {
  const colors = generateHierarchicalColors('#0000FF', 5);
  for (const color of colors) {
    assert(typeof color === 'string');
    assert(color.startsWith('#'));
    assert.strictEqual(color.length, 7);
  }
});

test('generateHierarchicalColors creates progressively different colors', () => {
  const colors = generateHierarchicalColors('#FF0000', 3);
  const uniqueColors = new Set(colors);
  assert(uniqueColors.size > 1);
});
