import { test } from 'node:test';
import assert from 'node:assert/strict';
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

function readUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

test('CLI: --help prints usage', () => {
  const res = runCLI(['--help']);
  assert.equal(res.exitCode, 0);
  assert.ok((res.stderr + res.stdout).includes('Usage:'));
});

test('CLI: --import JSON matches golden', () => {
  const tempDir = mkTempDir();
  const outPath = path.join(tempDir, 'out.canvas');

  try {
    const inPath = path.join(REPO_ROOT, 'test-files', 'importing', 'structured-json-2-single-array.json');
    const goldenPath = path.join(REPO_ROOT, 'test-files', 'goldens', 'import-structured-json-2-single-array.canvas');

    const res = runCLI(['--import', inPath, '--out', outPath]);
    assert.equal(res.exitCode, 0, res.stderr);
    assert.equal(readUtf8(outPath), readUtf8(goldenPath));
  } finally {
    rmTempDir(tempDir);
  }
});

test('CLI: --import pure.json matches golden', () => {
  const tempDir = mkTempDir();
  const outPath = path.join(tempDir, 'out.canvas');

  try {
    const inPath = path.join(REPO_ROOT, 'test-files', 'importing', 'user-canvas-3.pure.json');
    const goldenPath = path.join(REPO_ROOT, 'test-files', 'goldens', 'import-user-canvas-3.pure.json.canvas');

    const res = runCLI(['--import', inPath, '--out', outPath]);
    assert.equal(res.exitCode, 0, res.stderr);
    assert.equal(readUtf8(outPath), readUtf8(goldenPath));
  } finally {
    rmTempDir(tempDir);
  }
});

test('CLI: --import JSONL matches golden', () => {
  const tempDir = mkTempDir();
  const outPath = path.join(tempDir, 'out.canvas');

  try {
    const inPath = path.join(REPO_ROOT, 'test-files', 'importing', 'sample-pages.jsonl');
    const goldenPath = path.join(REPO_ROOT, 'test-files', 'goldens', 'import-sample-pages.jsonl.canvas');

    const res = runCLI(['--import', inPath, '--out', outPath]);
    assert.equal(res.exitCode, 0, res.stderr);
    assert.equal(readUtf8(outPath), readUtf8(goldenPath));
  } finally {
    rmTempDir(tempDir);
  }
});

test('CLI: compile conformance matches golden', () => {
  const tempDir = mkTempDir();
  const outPath = path.join(tempDir, 'out.json');

  try {
    const inPath = path.join(REPO_ROOT, 'test-files', 'goldens', 'compliation-conformance-test-card.canvas');
    const goldenPath = path.join(
      REPO_ROOT,
      'test-files',
      'goldens',
      'compile-compliation-conformance-test-card.json',
    );

    const res = runCLI(['--in', inPath, '--out', outPath]);
    assert.equal(res.exitCode, 0, res.stderr);
    assert.equal(readUtf8(outPath), readUtf8(goldenPath));
  } finally {
    rmTempDir(tempDir);
  }
});

test('CLI: export (strip-metadata) matches golden', () => {
  const tempDir = mkTempDir();
  const outPath = path.join(tempDir, 'out.pure.json');

  try {
    const inPath = path.join(REPO_ROOT, 'test-files', 'raw-user-canvas-3.canvas');
    const goldenPath = path.join(REPO_ROOT, 'test-files', 'goldens', 'export-raw-user-canvas-3.pure.json');

    const res = runCLI(['--in', inPath, '--strip-metadata', '--out', outPath]);
    assert.equal(res.exitCode, 0, res.stderr);
    assert.equal(readUtf8(outPath), readUtf8(goldenPath));
  } finally {
    rmTempDir(tempDir);
  }
});

