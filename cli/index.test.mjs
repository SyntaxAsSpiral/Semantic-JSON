import { test } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');

function runCLI(args) {
  const result = spawnSync('node', ['cli/index.mjs', ...args], {
    encoding: 'utf8',
    cwd: REPO_ROOT,
  });
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status ?? 0,
  };
}

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-json-cli-'));
}

function rmTempDir(tempDir) {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');    
}

function normalizePureCanvasExport(doc, { stripColors } = {}) {
  const nodes = Array.isArray(doc?.nodes) ? doc.nodes.map((n) => ({ ...n })) : [];
  const edges = Array.isArray(doc?.edges) ? doc.edges.map((e) => ({ ...e })) : [];

  for (const node of nodes) {
    if (stripColors) delete node.color;
    if (Array.isArray(node.from)) {
      node.from = [...node.from].map((e) => {
        const out = { ...e };
        if (stripColors) delete out.color;
        return out;
      }).sort((a, b) =>
        `${a?.node ?? ''}${a?.label ?? ''}`.localeCompare(
          `${b?.node ?? ''}${b?.label ?? ''}`,
        ),
      );
    }
    if (Array.isArray(node.to)) {
      node.to = [...node.to].map((e) => {
        const out = { ...e };
        if (stripColors) delete out.color;
        return out;
      }).sort((a, b) =>
        `${a?.node ?? ''}${a?.label ?? ''}`.localeCompare(
          `${b?.node ?? ''}${b?.label ?? ''}`,
        ),
      );
    }
  }

  nodes.sort((a, b) => String(a?.id ?? '').localeCompare(String(b?.id ?? '')));
  edges.sort((a, b) => String(a?.id ?? '').localeCompare(String(b?.id ?? '')));

  return { nodes, edges };
}

test('CLI: --help prints usage', () => {
  const res = runCLI(['--help']);
  assert.strictEqual(res.exitCode, 0);
  assert.ok((res.stderr + res.stdout).includes('Usage'));
});

test('CLI: compile Canvas file', () => {
  const tempDir = mkTempDir();
  const inCanvas = path.join(tempDir, 'in.canvas');
  const outJson = path.join(tempDir, 'out.json');

  try {
    writeJson(inCanvas, {
      nodes: [
        { id: 'n1', type: 'text', text: 'A', x: 0, y: 0, width: 200, height: 80 },
        { id: 'n2', type: 'text', text: 'B', x: 0, y: 200, width: 200, height: 80 },
      ],
      edges: [{ id: 'e1', fromNode: 'n1', toNode: 'n2' }],
    });

    const res = runCLI(['--in', inCanvas, '--out', outJson]);
    assert.strictEqual(res.exitCode, 0, res.stderr);
    assert.ok(fs.existsSync(outJson));

    const summary = JSON.parse(res.stdout);
    assert.ok(typeof summary.inPath === 'string');
    assert.ok(typeof summary.outPath === 'string');
    assert.strictEqual(summary.nodesOut, 2);
    assert.strictEqual(summary.edgesOut, 1);

    const compiled = JSON.parse(fs.readFileSync(outJson, 'utf8'));
    assert.ok(Array.isArray(compiled.nodes));
    assert.ok(Array.isArray(compiled.edges));
  } finally {
    rmTempDir(tempDir);
  }
});

test('CLI: import JSON to Canvas (--from-json)', () => {
  const tempDir = mkTempDir();
  const inJson = path.join(tempDir, 'in.json');
  const outCanvas = path.join(tempDir, 'out.canvas');

  try {
    writeJson(inJson, [{ a: 1 }, { a: 2 }]);

    const res = runCLI(['--from-json', inJson, '--out', outCanvas]);
    assert.strictEqual(res.exitCode, 0, res.stderr);
    assert.ok(fs.existsSync(outCanvas));

    const canvas = JSON.parse(fs.readFileSync(outCanvas, 'utf8'));
    assert.ok(Array.isArray(canvas.nodes));
    assert.ok(Array.isArray(canvas.edges));
    assert.ok(canvas.nodes.length > 0);
  } finally {
    rmTempDir(tempDir);
  }
});

test('CLI: unified import detects JSON (--import)', () => {
  const tempDir = mkTempDir();
  const inJson = path.join(tempDir, 'in.json');
  const outCanvas = path.join(tempDir, 'out.canvas');

  try {
    writeJson(inJson, { hello: ['world'] });

    const res = runCLI(['--import', inJson, '--out', outCanvas]);
    assert.strictEqual(res.exitCode, 0, res.stderr);
    assert.ok(fs.existsSync(outCanvas));

    const canvas = JSON.parse(fs.readFileSync(outCanvas, 'utf8'));
    assert.ok(Array.isArray(canvas.nodes));
    assert.ok(Array.isArray(canvas.edges));
    assert.ok(canvas.nodes.length > 0);
  } finally {
    rmTempDir(tempDir);
  }
});

test('CLI: export as pure JSON embeds labeled edges into nodes', () => {
  const tempDir = mkTempDir();
  const outJson = path.join(tempDir, 'out.pure.json');

  try {
    const inCanvas = path.join(REPO_ROOT, 'test-files', 'raw-user-canvas-3.canvas');
    const expectedPath = path.join(REPO_ROOT, 'test-files', 'user-canvas-3.pure.json');
    const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));

    const res = runCLI(['--in', inCanvas, '--out', outJson, '--strip-metadata']);
    assert.strictEqual(res.exitCode, 0, res.stderr);
    assert.ok(fs.existsSync(outJson));

    const actual = JSON.parse(fs.readFileSync(outJson, 'utf8'));

    assert.ok(Array.isArray(actual.nodes));
    assert.ok(Array.isArray(actual.edges));
    assert.strictEqual(actual.edges.length, 0);
    assert.ok(actual.nodes.some((n) => Array.isArray(n.from) || Array.isArray(n.to)));

    assert.deepStrictEqual(
      normalizePureCanvasExport(actual, { stripColors: true }),
      normalizePureCanvasExport(expected, { stripColors: true }),
    );
  } finally {
    rmTempDir(tempDir);
  }
});

test('CLI: export preserves hex colors (drops palette indices)', () => {
  const tempDir = mkTempDir();
  const inCanvas = path.join(tempDir, 'in.canvas');
  const outJson = path.join(tempDir, 'out.pure.json');

  try {
    writeJson(inCanvas, {
      nodes: [
        { id: 'n1', type: 'text', text: 'A', x: 0, y: 0, width: 200, height: 80, color: 'rgb(255, 0, 170)' },
        { id: 'n2', type: 'text', text: 'B', x: 0, y: 200, width: 200, height: 80, color: '3' },
      ],
      edges: [
        { id: 'e1', fromNode: 'n1', toNode: 'n2', label: 'go', color: 'hsl(120 100% 50%)' },
      ],
    });

    const res = runCLI(['--in', inCanvas, '--out', outJson, '--strip-metadata']);
    assert.strictEqual(res.exitCode, 0, res.stderr);

    const out = JSON.parse(fs.readFileSync(outJson, 'utf8'));
    const n1 = out.nodes.find((n) => n.id === 'n1');
    const n2 = out.nodes.find((n) => n.id === 'n2');

    assert.strictEqual(n1.color, 'rgb(255, 0, 170)');
    assert.ok(!('color' in n2), 'palette index colors should not be preserved');

    // Labeled edge should be embedded and preserve hex edge color.
    assert.ok(Array.isArray(n1.to));
    assert.deepStrictEqual(n1.to, [{ node: 'n2', label: 'go', color: 'hsl(120 100% 50%)' }]);
    assert.strictEqual(out.edges.length, 0);
  } finally {
    rmTempDir(tempDir);
  }
});

test('CLI: usage errors exit 2', () => {
  const unknown = runCLI(['--unknown-flag']);
  assert.strictEqual(unknown.exitCode, 2);
  assert.ok((unknown.stderr + unknown.stdout).includes('Usage'));

  const missingInValue = runCLI(['--in']);
  assert.strictEqual(missingInValue.exitCode, 2);
  assert.ok((missingInValue.stderr + missingInValue.stdout).includes('Usage'));

  const missingRequired = runCLI([]);
  assert.strictEqual(missingRequired.exitCode, 2);
  assert.ok((missingRequired.stderr + missingRequired.stdout).includes('Usage'));
});

test('CLI: contradictory flags do not crash (last flag wins)', () => {
  const tempDir = mkTempDir();
  const inCanvas = path.join(tempDir, 'in.canvas');
  const outJson1 = path.join(tempDir, 'out1.json');
  const outJson2 = path.join(tempDir, 'out2.json');

  try {
    writeJson(inCanvas, {
      nodes: [{ id: 'n1', type: 'text', text: 'A', x: 0, y: 0, width: 200, height: 80 }],
      edges: [],
    });

    const a = runCLI(['--in', inCanvas, '--out', outJson1, '--color-nodes', '--no-color-nodes']);
    const b = runCLI(['--in', inCanvas, '--out', outJson2, '--no-color-nodes']);
    assert.strictEqual(a.exitCode, 0, a.stderr);
    assert.strictEqual(b.exitCode, 0, b.stderr);

    const outA = fs.readFileSync(outJson1, 'utf8');
    const outB = fs.readFileSync(outJson2, 'utf8');
    assert.strictEqual(outA, outB);
  } finally {
    rmTempDir(tempDir);
  }
});

test('CLI: performance on large JSON import', () => {
  const tempDir = mkTempDir();
  const inJson = path.join(tempDir, 'large.json');
  const outCanvas = path.join(tempDir, 'large.canvas');

  try {
    const largeData = {
      users: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        metadata: { tags: [`tag-${i % 3}`, `tag-${i % 7}`] },
      })),
    };
    writeJson(inJson, largeData);

    const startTime = Date.now();
    const res = runCLI(['--from-json', inJson, '--out', outCanvas]);
    const duration = Date.now() - startTime;

    assert.strictEqual(res.exitCode, 0, res.stderr);
    assert.ok(duration < 30000, `Import took ${duration}ms`);
    assert.ok(fs.existsSync(outCanvas));

    const canvas = JSON.parse(fs.readFileSync(outCanvas, 'utf8'));
    assert.ok(Array.isArray(canvas.nodes));
    assert.ok(canvas.nodes.length > 0);

    const summary = JSON.parse(res.stdout);
    assert.ok(summary.nodesOut > 100);
  } finally {
    rmTempDir(tempDir);
  }
});

test('CLI: semantic interoperability (compile -> import preserves semantic fields)', () => {
  const tempDir = mkTempDir();
  const tempCanvasFile = path.join(tempDir, 'semantic.canvas');
  const tempCompiledFile = path.join(tempDir, 'semantic-compiled.json');
  const tempReimportedFile = path.join(tempDir, 'semantic-reimported.canvas');

  try {
    const originalCanvas = {
      nodes: [
        {
          id: 'test-node-1',
          type: 'text',
          text: '**id**: \"semantic-id-1\"\\n**type**: \"group\"\\n**label**: \"Test Group\"\\nSome additional content',
          x: 100,
          y: 100,
          width: 300,
          height: 150,
        },
        {
          id: 'test-node-2',
          type: 'text',
          text: '**id**: \"semantic-id-2\"\\n**text**: \"This is semantic text content\"',
          x: 100,
          y: 300,
          width: 300,
          height: 100,
        },
      ],
      edges: [],
    };

    writeJson(tempCanvasFile, originalCanvas);

    const compileResult = runCLI(['--in', tempCanvasFile, '--out', tempCompiledFile, '--strip-metadata']);
    assert.strictEqual(compileResult.exitCode, 0, compileResult.stderr);

    const reimportResult = runCLI(['--import', tempCompiledFile, '--out', tempReimportedFile]);
    assert.strictEqual(reimportResult.exitCode, 0, reimportResult.stderr);

    const compiledData = JSON.parse(fs.readFileSync(tempCompiledFile, 'utf8'));
    const reimportedCanvas = JSON.parse(fs.readFileSync(tempReimportedFile, 'utf8'));

    const compiledNodes = compiledData.nodes;
    assert.ok(Array.isArray(compiledNodes));
    assert.ok(compiledNodes.length >= 2);

    const semanticNode1 = compiledNodes.find((n) => n.id === 'semantic-id-1');
    const semanticNode2 = compiledNodes.find((n) => n.id === 'semantic-id-2');

    if (semanticNode1) {
      assert.strictEqual(semanticNode1.type, 'group');
      assert.strictEqual(semanticNode1.label, 'Test Group');
    }

    if (semanticNode2) {
      assert.strictEqual(semanticNode2.text, 'This is semantic text content');
    }

    assert.ok(Array.isArray(reimportedCanvas.nodes));
    assert.ok(reimportedCanvas.nodes.length > 0);

    let foundSemanticReassignment = false;
    for (const node of reimportedCanvas.nodes) {
      if (node.id === 'semantic-id-1' && node.type === 'group' && node.label === 'Test Group') {
        foundSemanticReassignment = true;
        break;
      }
      if (node.id === 'semantic-id-2' && node.text === 'This is semantic text content') {
        foundSemanticReassignment = true;
        break;
      }
    }

    assert.ok(foundSemanticReassignment);
  } finally {
    rmTempDir(tempDir);
  }
});
