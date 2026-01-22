import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './shared.mjs';
import { compileCanvasAll } from './compiler.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function readUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

function assertValidCanvas(canvas) {
  assert.ok(canvas && typeof canvas === 'object');
  assert.ok(Array.isArray(canvas.nodes));
  assert.ok(Array.isArray(canvas.edges));

  const nodeIds = new Set();
  for (const n of canvas.nodes) {
    assert.equal(typeof n.id, 'string');
    assert.ok(n.id.length > 0);
    assert.equal(typeof n.type, 'string');
    assert.ok(Number.isFinite(n.x));
    assert.ok(Number.isFinite(n.y));
    assert.ok(Number.isFinite(n.width));
    assert.ok(Number.isFinite(n.height));

    assert.ok(!nodeIds.has(n.id), `duplicate node id: ${n.id}`);
    nodeIds.add(n.id);
  }

  const edgeIds = new Set();
  for (const e of canvas.edges) {
    assert.equal(typeof e.id, 'string');
    assert.ok(e.id.length > 0);
    assert.equal(typeof e.fromNode, 'string');
    assert.equal(typeof e.toNode, 'string');
    assert.ok(nodeIds.has(e.fromNode), `edge ${e.id} missing fromNode: ${e.fromNode}`);
    assert.ok(nodeIds.has(e.toNode), `edge ${e.id} missing toNode: ${e.toNode}`);

    assert.ok(!edgeIds.has(e.id), `duplicate edge id: ${e.id}`);
    edgeIds.add(e.id);
  }
}

test('compile conformance matches generated golden (ordering + color grouping overrides)', () => {
  const inPath = path.join(REPO_ROOT, 'test-files', 'goldens', 'compliation-conformance-test-card.canvas');
  const expectedPath = path.join(
    REPO_ROOT,
    'test-files',
    'goldens',
    'compile-compliation-conformance-test-card.json',
  );

  const input = readJson(inPath);
  const out = compileCanvasAll({
    input,
    settings: {
      colorSortNodes: true,
      colorSortEdges: true,
      flowSortNodes: false,
      flowSort: false,
      stripEdgesWhenFlowSorted: true,
      semanticSortOrphans: false,
    },
  });

  assertValidCanvas(out);
  assert.equal(JSON.stringify(out, null, 2) + '\n', readUtf8(expectedPath));
});

test('compile fails fast on duplicate node ids', () => {
  assert.throws(
    () =>
      compileCanvasAll({
        input: {
          nodes: [
            { id: 'dup', type: 'text', text: 'a', x: 0, y: 0, width: 100, height: 60 },
            { id: 'dup', type: 'text', text: 'b', x: 0, y: 80, width: 100, height: 60 },
          ],
          edges: [],
        },
        settings: {},
      }),
    /duplicate node id:/,
  );
});

