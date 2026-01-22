import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { compileCanvasFile } from './src/compiler.mjs';
import { importFile, importJsonFile, importJsonlFile } from './src/importer.mjs';

function usage(message) {
  if (message) process.stderr.write(`${message}\n\n`);
  process.stderr.write(
    [
      'Usage:',
      '  node cli/index.mjs --in <path-to-.canvas> [--out <path-to-.json>] [options]',
      '  node cli/index.mjs --from-json <path-to-.json> [--out <path-to-.canvas>]',
      '  node cli/index.mjs --from-jsonl <path-to-.jsonl> [--out <path-to-.canvas>]',
      '  node cli/index.mjs --import <path-to-file> [--out <path-to-.canvas>]',
      '',
      'Options:',
      '  --import              Auto-detect and import JSON/JSONL to Canvas (unified command)',
      '  --from-json           Import JSON to Canvas (create visual scaffolding)',
      '  --from-jsonl          Import JSONL to Canvas (each line becomes a record group)',
      '  --color-nodes         Enable color-based node sorting (default: true)',
      '  --no-color-nodes      Disable color-based node sorting',
      '  --color-edges         Enable color-based edge sorting (default: true)',
      '  --no-color-edges      Disable color-based edge sorting',
      '  --flow-sort           Enable directional flow topology sorting (default: false)',
      '  --no-flow-sort        Disable flow topology sorting',
      '  --strip-metadata      Strip Canvas metadata to export pure data structure',
      '  --strip-edges-when-flow-sorted    Strip edges from pure JSON when flow-sorted (default: true)',
      '  --no-strip-edges-when-flow-sorted Preserve edges even when flow-sorted',
      '  --group-orphan-nodes              Group orphan nodes at top and sort semantically (default: false)',
      '  --no-group-orphan-nodes           Sort orphan nodes spatially (default behavior)',
      '',
      'Behavior:',
      '  - Reads a JSON Canvas 1.0 file (.canvas), JSON file (.json), or JSONL file (.jsonl)',
      '  - With --import: auto-detects file type and creates Canvas with enhanced coloring',
      '  - With --from-json: creates Canvas scaffolding (objects/arrays → groups, primitives → text nodes)',
      '  - With --from-jsonl: creates Canvas scaffolding with each JSONL record as a separate group',
      '  - Without import flags: compiles to semantic JSON via visuospatial encoding',
      '  - Encodes 4 visual dimensions: position, containment, color, directionality',
      '  - Outputs to specified path or <input-stem>.json/.canvas in same directory',
      '  - With --strip-metadata: removes spatial/visual fields, exports pure data artifact',
      '  - With --flow-sort + --strip-edges-when-flow-sorted: edges compiled into sequence order and stripped',
      '',
      'Enhanced Features:',
      '  - Rainbow gradient coloring for JSONL grid layouts',
      '  - Hierarchical color mutations for nested structures',
      '  - Automatic grid arrangement with optimal aspect ratios',
      '  - Unified import with intelligent file type detection',
      '',
      'Visuospatial encoding:',
      '  - Position (x, y) → Linear reading sequence',
      '  - Containment (bounding boxes) → Hierarchical structure',
      '  - Color (node/edge colors) → Semantic taxonomy',
      '  - Directionality (arrow endpoints) → Information flow topology',
    ].join('\n') + '\n',
  );
}

function parseArgs(argv) {
  const args = {
    colorNodes: true,
    colorEdges: true,
    flowSort: false,
    stripMetadata: false,
    stripEdgesWhenFlowSorted: true,
    groupOrphanNodes: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') {
      args.in = argv[++i];
      continue;
    }
    if (a === '--from-json') {
      args.fromJson = argv[++i];
      continue;
    }
    if (a === '--from-jsonl') {
      args.fromJsonl = argv[++i];
      continue;
    }
    if (a === '--import') {
      args.import = argv[++i];
      continue;
    }
    if (a === '--out') {
      args.out = argv[++i];
      continue;
    }
    if (a === '--color-nodes') {
      args.colorNodes = true;
      continue;
    }
    if (a === '--no-color-nodes') {
      args.colorNodes = false;
      continue;
    }
    if (a === '--color-edges') {
      args.colorEdges = true;
      continue;
    }
    if (a === '--no-color-edges') {
      args.colorEdges = false;
      continue;
    }
    if (a === '--flow-sort') {
      args.flowSort = true;
      continue;
    }
    if (a === '--no-flow-sort') {
      args.flowSort = false;
      continue;
    }
    if (a === '--strip-metadata') {
      args.stripMetadata = true;
      continue;
    }
    if (a === '--strip-edges-when-flow-sorted') {
      args.stripEdgesWhenFlowSorted = true;
      continue;
    }
    if (a === '--no-strip-edges-when-flow-sorted') {
      args.stripEdgesWhenFlowSorted = false;
      continue;
    }
    if (a === '--group-orphan-nodes') {
      args.groupOrphanNodes = true;
      continue;
    }
    if (a === '--no-group-orphan-nodes') {
      args.groupOrphanNodes = false;
      continue;
    }
    if (a === '--help' || a === '-h') {
      args.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${a}`);
  }
  return args;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    usage(e.message);
    process.exit(2);
    return;
  }
  if (args.help) {
    usage();
    return;
  }

  // Unified import mode: --import (auto-detect file type)
  if (args.import) {
    const importPath = String(args.import).trim();
    if (!importPath) {
      usage('missing value for --import');
      process.exit(2);
      return;
    }
    try {
      const res = importFile({ inPath: importPath, outPath: args.out });
      process.stdout.write(JSON.stringify(res, null, 2) + '\n');
      return;
    } catch (error) {
      process.stderr.write(`Import failed: ${error.message}\n`);
      process.exit(1);
      return;
    }
  }

  // Import mode: --from-json
  if (args.fromJson) {
    const fromJsonPath = String(args.fromJson).trim();
    if (!fromJsonPath) {
      usage('missing value for --from-json');
      process.exit(2);
      return;
    }
    try {
      const res = importJsonFile({ inPath: fromJsonPath, outPath: args.out });
      process.stdout.write(JSON.stringify(res, null, 2) + '\n');
      return;
    } catch (error) {
      process.stderr.write(`JSON import failed: ${error.message}\n`);
      process.exit(1);
      return;
    }
  }

  // Import mode: --from-jsonl
  if (args.fromJsonl) {
    const fromJsonlPath = String(args.fromJsonl).trim();
    if (!fromJsonlPath) {
      usage('missing value for --from-jsonl');
      process.exit(2);
      return;
    }
    try {
      const res = importJsonlFile({ inPath: fromJsonlPath, outPath: args.out });
      process.stdout.write(JSON.stringify(res, null, 2) + '\n');
      return;
    } catch (error) {
      process.stderr.write(`JSONL import failed: ${error.message}\n`);
      process.exit(1);
      return;
    }
  }

  // Compile mode: --in
  const inPath = String(args.in ?? '').trim();
  if (!inPath) {
    usage('missing required --in, --from-json, --from-jsonl, or --import');
    process.exit(2);
    return;
  }

  const settings = {
    colorSortNodes: args.colorNodes,
    colorSortEdges: args.colorEdges,
    flowSortNodes: args.flowSort,
    stripMetadata: args.stripMetadata,
    flowSort: args.flowSort,
    stripEdgesWhenFlowSorted: args.stripEdgesWhenFlowSorted,
    semanticSortOrphans: args.groupOrphanNodes,
  };

  try {
    const res = compileCanvasFile({ inPath, outPath: args.out, settings });
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(`Compilation failed: ${error.message}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main().catch((e) => {
    process.stderr.write(`${e?.message ?? String(e)}\n`);
    process.exit(1);
  });
}
