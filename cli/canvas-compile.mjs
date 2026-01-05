import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

function usage(message) {
  if (message) process.stderr.write(`${message}\n\n`);
  process.stderr.write(
    [
      'Usage:',
      '  node .scripts/canvas-compile.mjs --in <path-to-.canvas> [--out <path-to-.json>]',
      '',
      'Behavior:',
      '  - Reads a JSON Canvas 1.0 file (.canvas)',
      '  - Preserves ALL nodes and edges',
      '  - Compiles to semantic JSON (stable ordering for LLM ingestion)',
      '  - Outputs to both default path and <stem>.json in current directory',
      '',
      'Compilation ordering:',
      '  - Ungrouped nodes first (text/file/link, sorted by y, x, id)',
      '  - Then group nodes (sorted by y, x, id)',
      '  - Edges sorted by topology (fromNode y,x then toNode y,x)',
      '',
      'Defaults:',
      '  --out defaults to: <workshop-root>/data/canvases/<input-stem>.json',
    ].join('\n') + '\n',
  );
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') {
      args.in = argv[++i];
      continue;
    }
    if (a === '--out') {
      args.out = argv[++i];
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

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nodeLayerRootDir() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..');
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function stableSortByXY(nodes) {
  nodes.sort((a, b) => {
    const ay = isFiniteNumber(a?.y) ? a.y : 0;
    const by = isFiniteNumber(b?.y) ? b.y : 0;
    if (ay !== by) return ay - by;
    const ax = isFiniteNumber(a?.x) ? a.x : 0;
    const bx = isFiniteNumber(b?.x) ? b.x : 0;
    if (ax !== bx) return ax - bx;
    const aid = String(a?.id ?? '');
    const bid = String(b?.id ?? '');
    return aid.localeCompare(bid);
  });
  return nodes;
}

function stableEdgeSortByTopology(edges, nodePositions) {
  edges.sort((a, b) => {
    // Get fromNode positions
    const aFrom = nodePositions.get(String(a?.fromNode ?? '').trim());
    const bFrom = nodePositions.get(String(b?.fromNode ?? '').trim());

    // Sort by fromNode y position
    const afy = isFiniteNumber(aFrom?.y) ? aFrom.y : 0;
    const bfy = isFiniteNumber(bFrom?.y) ? bFrom.y : 0;
    if (afy !== bfy) return afy - bfy;

    // Sort by fromNode x position
    const afx = isFiniteNumber(aFrom?.x) ? aFrom.x : 0;
    const bfx = isFiniteNumber(bFrom?.x) ? bFrom.x : 0;
    if (afx !== bfx) return afx - bfx;

    // Get toNode positions
    const aTo = nodePositions.get(String(a?.toNode ?? '').trim());
    const bTo = nodePositions.get(String(b?.toNode ?? '').trim());

    // Sort by toNode y position
    const aty = isFiniteNumber(aTo?.y) ? aTo.y : 0;
    const bty = isFiniteNumber(bTo?.y) ? bTo.y : 0;
    if (aty !== bty) return aty - bty;

    // Sort by toNode x position
    const atx = isFiniteNumber(aTo?.x) ? aTo.x : 0;
    const btx = isFiniteNumber(bTo?.x) ? bTo.x : 0;
    if (atx !== btx) return atx - btx;

    // Fallback to ID for deterministic ordering
    const aid = String(a?.id ?? '').trim();
    const bid = String(b?.id ?? '').trim();
    return aid.localeCompare(bid);
  });
  return edges;
}

function isContainedBy(node, group) {
  const nx = isFiniteNumber(node?.x) ? node.x : 0;
  const ny = isFiniteNumber(node?.y) ? node.y : 0;
  const nw = isFiniteNumber(node?.width) ? node.width : 0;
  const nh = isFiniteNumber(node?.height) ? node.height : 0;

  const gx = isFiniteNumber(group?.x) ? group.x : 0;
  const gy = isFiniteNumber(group?.y) ? group.y : 0;
  const gw = isFiniteNumber(group?.width) ? group.width : 0;
  const gh = isFiniteNumber(group?.height) ? group.height : 0;

  // Node is contained if its bounding box is within group's bounding box
  return nx >= gx && ny >= gy && nx + nw <= gx + gw && ny + nh <= gy + gh;
}

function buildHierarchy(nodes) {
  const groups = nodes.filter((n) => n?.type === 'group');
  const nonGroups = nodes.filter((n) => n?.type !== 'group');

  // Map node ID to its immediate parent group
  const parentMap = new Map();

  for (const node of nonGroups) {
    // Find the smallest group that contains this node (innermost parent)
    let parent = null;
    let minArea = Infinity;

    for (const group of groups) {
      if (isContainedBy(node, group)) {
        const area = (group.width || 0) * (group.height || 0);
        if (area < minArea) {
          minArea = area;
          parent = group;
        }
      }
    }

    if (parent) {
      const parentId = String(parent.id ?? '').trim();
      if (!parentMap.has(parentId)) {
        parentMap.set(parentId, []);
      }
      parentMap.get(parentId).push(node);
    }
  }

  // Also detect nested groups
  for (const childGroup of groups) {
    let parent = null;
    let minArea = Infinity;

    for (const parentGroup of groups) {
      if (childGroup.id === parentGroup.id) continue;
      if (isContainedBy(childGroup, parentGroup)) {
        const area = (parentGroup.width || 0) * (parentGroup.height || 0);
        if (area < minArea) {
          minArea = area;
          parent = parentGroup;
        }
      }
    }

    if (parent) {
      const parentId = String(parent.id ?? '').trim();
      if (!parentMap.has(parentId)) {
        parentMap.set(parentId, []);
      }
      parentMap.get(parentId).push(childGroup);
    }
  }

  return parentMap;
}

function flattenHierarchical(nodes, parentMap) {
  const groups = nodes.filter((n) => n?.type === 'group');
  const nonGroups = nodes.filter((n) => n?.type !== 'group');
  const result = [];
  const processed = new Set();

  function addNodeAndChildren(node) {
    const nodeId = String(node.id ?? '').trim();
    if (processed.has(nodeId)) return;
    processed.add(nodeId);

    result.push(node);

    // If this node is a group, add its children
    if (node.type === 'group' && parentMap.has(nodeId)) {
      const children = parentMap.get(nodeId);
      stableSortByXY(children);

      // Separate children into groups and non-groups
      const childGroups = children.filter((c) => c?.type === 'group');
      const childNonGroups = children.filter((c) => c?.type !== 'group');

      // Add non-groups first, then groups (recursively)
      for (const child of childNonGroups) {
        addNodeAndChildren(child);
      }
      for (const child of childGroups) {
        addNodeAndChildren(child);
      }
    }
  }

  // Find root nodes (not contained by any group)
  const rootNodes = nonGroups.filter((n) => {
    const nodeId = String(n.id ?? '').trim();
    for (const [parentId, children] of parentMap.entries()) {
      if (children.some((c) => String(c.id ?? '').trim() === nodeId)) {
        return false;
      }
    }
    return true;
  });

  const rootGroups = groups.filter((g) => {
    const groupId = String(g.id ?? '').trim();
    for (const [parentId, children] of parentMap.entries()) {
      if (children.some((c) => String(c.id ?? '').trim() === groupId)) {
        return false;
      }
    }
    return true;
  });

  // Sort and add root nodes
  stableSortByXY(rootNodes);
  stableSortByXY(rootGroups);

  for (const node of rootNodes) {
    addNodeAndChildren(node);
  }
  for (const group of rootGroups) {
    addNodeAndChildren(group);
  }

  return result;
}

export function compileCanvasAll({ input }) {
  const nodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const edges = Array.isArray(input?.edges) ? input.edges : [];

  const nodeIds = new Set();
  const nodePositions = new Map();
  for (const n of nodes) {
    const id = String(n?.id ?? '').trim();
    if (!id) throw new Error('node missing id');
    if (nodeIds.has(id)) throw new Error(`duplicate node id: ${id}`);
    nodeIds.add(id);
    nodePositions.set(id, { x: n?.x, y: n?.y });
  }

  const edgeIds = new Set();
  for (const e of edges) {
    const id = String(e?.id ?? '').trim();
    if (!id) throw new Error('edge missing id');
    if (edgeIds.has(id)) throw new Error(`duplicate edge id: ${id}`);
    edgeIds.add(id);
    const fromNode = String(e?.fromNode ?? '').trim();
    const toNode = String(e?.toNode ?? '').trim();
    if (!fromNode || !toNode) throw new Error(`edge ${id} missing fromNode/toNode`);
    if (!nodeIds.has(fromNode)) throw new Error(`edge ${id} references missing fromNode: ${fromNode}`);
    if (!nodeIds.has(toNode)) throw new Error(`edge ${id} references missing toNode: ${toNode}`);
  }

  const parentMap = buildHierarchy(nodes);
  const outNodes = flattenHierarchical(nodes, parentMap);
  const outEdges = edges.slice();
  stableEdgeSortByTopology(outEdges, nodePositions);

  return { nodes: outNodes, edges: outEdges };
}

export function compileCanvasFile({ inPath, outPath }) {
  const absIn = path.resolve(String(inPath ?? '').trim());
  const input = readJson(absIn);
  const stem = path.basename(absIn).replace(/\.(canvas|json)$/i, '');
  const absOut =
    String(outPath ?? '').trim() ||
    path.resolve(nodeLayerRootDir(), 'data', 'canvases', `${stem}.json`);

  const out = compileCanvasAll({ input });
  const serialized = JSON.stringify(out, null, 2) + '\n';

  ensureDir(path.dirname(absOut));
  fs.writeFileSync(absOut, serialized, 'utf8');

  // Also write to root directory
  const rootOut = path.resolve(process.cwd(), `${stem}.json`);
  fs.writeFileSync(rootOut, serialized, 'utf8');

  return {
    inPath: absIn,
    outPath: absOut,
    rootPath: rootOut,
    nodesIn: Array.isArray(input?.nodes) ? input.nodes.length : 0,
    edgesIn: Array.isArray(input?.edges) ? input.edges.length : 0,
    nodesOut: out.nodes.length,
    edgesOut: out.edges.length,
  };
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

  const inPath = String(args.in ?? '').trim();
  if (!inPath) {
    usage('missing required --in');
    process.exit(2);
    return;
  }

  const res = compileCanvasFile({ inPath, outPath: args.out });
  process.stdout.write(JSON.stringify(res, null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main().catch((e) => {
    process.stderr.write(`${e?.message ?? String(e)}\n`);
    process.exit(1);
  });
}
