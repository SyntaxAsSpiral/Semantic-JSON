import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './shared.mjs';
import { compileCanvasAll } from './compiler.mjs';
import { stripCanvasMetadata } from './exporter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function readUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

function assertValidPureExport(out) {
  assert.ok(out && typeof out === 'object');
  assert.ok(Array.isArray(out.nodes));
  assert.ok(Array.isArray(out.edges));

  const nodeIds = new Set();
  for (const n of out.nodes) {
    assert.equal(typeof n.id, 'string');
    assert.ok(n.id.length > 0);
    assert.equal(typeof n.type, 'string');

    // No Canvas positional metadata in "pure" output.
    assert.ok(!('x' in n));
    assert.ok(!('y' in n));
    assert.ok(!('width' in n));
    assert.ok(!('height' in n));

    if ('color' in n) assert.equal(typeof n.color, 'string');
    if ('label' in n && n.label !== undefined) assert.equal(typeof n.label, 'string');
    if ('text' in n && n.text !== undefined) assert.equal(typeof n.text, 'string');
    if ('file' in n && n.file !== undefined) assert.equal(typeof n.file, 'string');
    if ('url' in n && n.url !== undefined) assert.equal(typeof n.url, 'string');

    if ('from' in n) assert.ok(Array.isArray(n.from));
    if ('to' in n) assert.ok(Array.isArray(n.to));

    assert.ok(!nodeIds.has(n.id), `duplicate node id: ${n.id}`);
    nodeIds.add(n.id);
  }

  for (const e of out.edges) {
    // Currently stripped by default; keep this check for when settings change.
    assert.equal(typeof e.id, 'string');
    assert.equal(typeof e.fromNode, 'string');
    assert.equal(typeof e.toNode, 'string');
    assert.ok(nodeIds.has(e.fromNode));
    assert.ok(nodeIds.has(e.toNode));
  }
}

test('export (strip-metadata) matches generated golden and preserves custom hex colors', () => {
  const inPath = path.join(REPO_ROOT, 'test-files', 'raw-user-canvas-3.canvas');
  const expectedPath = path.join(REPO_ROOT, 'test-files', 'goldens', 'export-raw-user-canvas-3.pure.json');

  const input = readJson(inPath);
  const compiled = compileCanvasAll({
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

  const out = stripCanvasMetadata(compiled, { flowSort: false, stripEdgesWhenFlowSorted: true });
  assertValidPureExport(out);

  const serialized = JSON.stringify(out, null, 2) + '\n';
  assert.equal(serialized, readUtf8(expectedPath));

  // Guardrail: ensure we are actually testing custom color preservation.
  assert.ok(out.nodes.some((n) => typeof n.color === 'string' && n.color.startsWith('#')));

  // Guardrail: ensure labeled edges were embedded into nodes.
  assert.ok(out.nodes.some((n) => Array.isArray(n.from) || Array.isArray(n.to)));
});

