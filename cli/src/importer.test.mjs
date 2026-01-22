import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importDataToCanvas } from './importer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function readUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

function assertValidCanvas(canvas) {
  assert.ok(canvas && typeof canvas === 'object');
  assert.ok(Array.isArray(canvas.nodes));
  assert.ok(Array.isArray(canvas.edges));

  const allowedNodeTypes = new Set(['text', 'file', 'link', 'group']);
  const nodeIds = new Set();

  for (const n of canvas.nodes) {
    assert.ok(n && typeof n === 'object');
    assert.equal(typeof n.id, 'string');
    assert.ok(n.id.length > 0);
    assert.equal(typeof n.type, 'string');
    assert.ok(allowedNodeTypes.has(n.type));

    assert.ok(Number.isFinite(n.x));
    assert.ok(Number.isFinite(n.y));
    assert.ok(Number.isFinite(n.width));
    assert.ok(Number.isFinite(n.height));

    if ('color' in n) assert.equal(typeof n.color, 'string');

    if (n.type === 'group') {
      assert.equal(typeof n.label, 'string');
      assert.ok(n.label.length > 0);
    }

    if (n.type === 'text') {
      assert.equal(typeof n.text, 'string');
    }

    assert.ok(!nodeIds.has(n.id), `duplicate node id: ${n.id}`);
    nodeIds.add(n.id);
  }

  const edgeIds = new Set();
  for (const e of canvas.edges) {
    assert.ok(e && typeof e === 'object');
    assert.equal(typeof e.id, 'string');
    assert.ok(e.id.length > 0);
    assert.equal(typeof e.fromNode, 'string');
    assert.equal(typeof e.toNode, 'string');
    assert.ok(nodeIds.has(e.fromNode), `edge ${e.id} missing fromNode: ${e.fromNode}`);
    assert.ok(nodeIds.has(e.toNode), `edge ${e.id} missing toNode: ${e.toNode}`);
    if ('color' in e) assert.equal(typeof e.color, 'string');
    if ('label' in e && e.label !== undefined) assert.equal(typeof e.label, 'string');

    assert.ok(!edgeIds.has(e.id), `duplicate edge id: ${e.id}`);
    edgeIds.add(e.id);
  }
}

function assertImportMatchesGolden({ inRel, goldenRel }) {
  const absIn = path.join(REPO_ROOT, inRel);
  const absGolden = path.join(REPO_ROOT, goldenRel);

  const input = readUtf8(absIn);
  const out = importDataToCanvas(absIn, input);

  assertValidCanvas(out);

  const outSerialized = JSON.stringify(out, null, 2) + '\n';
  const goldenSerialized = readUtf8(absGolden);
  assert.equal(outSerialized, goldenSerialized);
}

test('import (json) matches generated golden', () => {
  assertImportMatchesGolden({
    inRel: path.join('test-files', 'importing', 'structured-json-2-single-array.json'),
    goldenRel: path.join('test-files', 'goldens', 'import-structured-json-2-single-array.canvas'),
  });
});

test('import (pure.json) matches generated golden', () => {
  assertImportMatchesGolden({
    inRel: path.join('test-files', 'importing', 'user-canvas-3.pure.json'),
    goldenRel: path.join('test-files', 'goldens', 'import-user-canvas-3.pure.json.canvas'),
  });
});

test('import (jsonl) matches generated golden', () => {
  assertImportMatchesGolden({
    inRel: path.join('test-files', 'importing', 'sample-pages.jsonl'),
    goldenRel: path.join('test-files', 'goldens', 'import-sample-pages.jsonl.canvas'),
  });
});

test('import (jsonl) fails fast on invalid line', () => {
  const bad = '{"a":1}\n{nope}\n{"b":2}\n';
  assert.throws(
    () => importDataToCanvas('C:\\fake\\file.jsonl', bad),
    /Invalid JSON on line 2:/,
  );
});

