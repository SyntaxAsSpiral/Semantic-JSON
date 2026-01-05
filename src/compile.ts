interface CanvasNode {
  id: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  [key: string]: unknown;
}

interface CanvasData {
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
}

interface NodePosition {
  x?: number;
  y?: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizedId(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function stableSortByXY(nodes: CanvasNode[]): CanvasNode[] {
  nodes.sort((a, b) => {
    const ay = isFiniteNumber(a?.y) ? a.y : 0;
    const by = isFiniteNumber(b?.y) ? b.y : 0;
    if (ay !== by) return ay - by;

    const ax = isFiniteNumber(a?.x) ? a.x : 0;
    const bx = isFiniteNumber(b?.x) ? b.x : 0;
    if (ax !== bx) return ax - bx;

    return normalizedId(a?.id).localeCompare(normalizedId(b?.id));
  });
  return nodes;
}

function stableEdgeSortByTopology(
  edges: CanvasEdge[],
  nodePositions: Map<string, NodePosition>
): CanvasEdge[] {
  edges.sort((a, b) => {
    // Get fromNode positions
    const aFrom = nodePositions.get(normalizedId(a?.fromNode));
    const bFrom = nodePositions.get(normalizedId(b?.fromNode));

    // Sort by fromNode y position
    const afy = isFiniteNumber(aFrom?.y) ? aFrom.y : 0;
    const bfy = isFiniteNumber(bFrom?.y) ? bFrom.y : 0;
    if (afy !== bfy) return afy - bfy;

    // Sort by fromNode x position
    const afx = isFiniteNumber(aFrom?.x) ? aFrom.x : 0;
    const bfx = isFiniteNumber(bFrom?.x) ? bFrom.x : 0;
    if (afx !== bfx) return afx - bfx;

    // Get toNode positions
    const aTo = nodePositions.get(normalizedId(a?.toNode));
    const bTo = nodePositions.get(normalizedId(b?.toNode));

    // Sort by toNode y position
    const aty = isFiniteNumber(aTo?.y) ? aTo.y : 0;
    const bty = isFiniteNumber(bTo?.y) ? bTo.y : 0;
    if (aty !== bty) return aty - bty;

    // Sort by toNode x position
    const atx = isFiniteNumber(aTo?.x) ? aTo.x : 0;
    const btx = isFiniteNumber(bTo?.x) ? bTo.x : 0;
    if (atx !== btx) return atx - btx;

    // Fallback to ID for deterministic ordering
    const aid = normalizedId(a?.id);
    const bid = normalizedId(b?.id);
    return aid.localeCompare(bid);
  });
  return edges;
}

export function compileCanvasAll({ input }: { input: CanvasData }): CanvasData {
  const nodes = Array.isArray(input?.nodes) ? [...input.nodes] : [];
  const edges = Array.isArray(input?.edges) ? [...input.edges] : [];

  const nodeIds = new Set<string>();
  const nodePositions = new Map<string, NodePosition>();

  for (const node of nodes) {
    const id = normalizedId(node?.id);
    if (!id) {
      throw new Error('node missing id');
    }
    if (nodeIds.has(id)) {
      throw new Error(`duplicate node id: ${id}`);
    }
    nodeIds.add(id);
    nodePositions.set(id, { x: node?.x, y: node?.y });
  }

  const edgeIds = new Set<string>();
  for (const edge of edges) {
    const id = normalizedId(edge?.id);
    if (!id) {
      throw new Error('edge missing id');
    }
    if (edgeIds.has(id)) {
      throw new Error(`duplicate edge id: ${id}`);
    }
    edgeIds.add(id);

    const fromNode = normalizedId(edge?.fromNode);
    const toNode = normalizedId(edge?.toNode);
    if (!fromNode || !toNode) {
      throw new Error(`edge ${id} missing fromNode/toNode`);
    }
    if (!nodeIds.has(fromNode)) {
      throw new Error(`edge ${id} references missing fromNode: ${fromNode}`);
    }
    if (!nodeIds.has(toNode)) {
      throw new Error(`edge ${id} references missing toNode: ${toNode}`);
    }
  }

  const parentMap = buildHierarchy(nodes);
  const outNodes = flattenHierarchical(nodes, parentMap);
  const outEdges = [...edges];
  stableEdgeSortByTopology(outEdges, nodePositions);

  return { nodes: outNodes, edges: outEdges };
}

function isContainedBy(node: CanvasNode, group: CanvasNode): boolean {
  const nx = isFiniteNumber(node?.x) ? node.x : 0;
  const ny = isFiniteNumber(node?.y) ? node.y : 0;
  const nw = isFiniteNumber(node?.width) ? node.width : 0;
  const nh = isFiniteNumber(node?.height) ? node.height : 0;

  const gx = isFiniteNumber(group?.x) ? group.x : 0;
  const gy = isFiniteNumber(group?.y) ? group.y : 0;
  const gw = isFiniteNumber(group?.width) ? group.width : 0;
  const gh = isFiniteNumber(group?.height) ? group.height : 0;

  return nx >= gx && ny >= gy && nx + nw <= gx + gw && ny + nh <= gy + gh;
}

function buildHierarchy(nodes: CanvasNode[]): Map<string, CanvasNode[]> {
  const groups = nodes.filter((n) => n?.type === 'group');
  const nonGroups = nodes.filter((n) => n?.type !== 'group');
  const parentMap = new Map<string, CanvasNode[]>();

  for (const node of nonGroups) {
    let parent: CanvasNode | null = null;
    let minArea = Infinity;

    for (const group of groups) {
      if (isContainedBy(node, group)) {
        const area = ((group.width as number) || 0) * ((group.height as number) || 0);
        if (area < minArea) {
          minArea = area;
          parent = group;
        }
      }
    }

    if (parent) {
      const parentId = normalizedId(parent.id);
      if (!parentMap.has(parentId)) {
        parentMap.set(parentId, []);
      }
      parentMap.get(parentId)!.push(node);
    }
  }

  for (const childGroup of groups) {
    let parent: CanvasNode | null = null;
    let minArea = Infinity;

    for (const parentGroup of groups) {
      if (childGroup.id === parentGroup.id) continue;
      if (isContainedBy(childGroup, parentGroup)) {
        const area = ((parentGroup.width as number) || 0) * ((parentGroup.height as number) || 0);
        if (area < minArea) {
          minArea = area;
          parent = parentGroup;
        }
      }
    }

    if (parent) {
      const parentId = normalizedId(parent.id);
      if (!parentMap.has(parentId)) {
        parentMap.set(parentId, []);
      }
      parentMap.get(parentId)!.push(childGroup);
    }
  }

  return parentMap;
}

function flattenHierarchical(nodes: CanvasNode[], parentMap: Map<string, CanvasNode[]>): CanvasNode[] {
  const groups = nodes.filter((n) => n?.type === 'group');
  const nonGroups = nodes.filter((n) => n?.type !== 'group');
  const result: CanvasNode[] = [];
  const processed = new Set<string>();

  function addNodeAndChildren(node: CanvasNode) {
    const nodeId = normalizedId(node.id);
    if (processed.has(nodeId)) return;
    processed.add(nodeId);

    result.push(node);

    if (node.type === 'group' && parentMap.has(nodeId)) {
      const children = parentMap.get(nodeId)!;
      stableSortByXY(children);

      const childGroups = children.filter((c) => c?.type === 'group');
      const childNonGroups = children.filter((c) => c?.type !== 'group');

      for (const child of childNonGroups) {
        addNodeAndChildren(child);
      }
      for (const child of childGroups) {
        addNodeAndChildren(child);
      }
    }
  }

  const rootNodes = nonGroups.filter((n) => {
    const nodeId = normalizedId(n.id);
    for (const [, children] of parentMap.entries()) {
      if (children.some((c) => normalizedId(c.id) === nodeId)) {
        return false;
      }
    }
    return true;
  });

  const rootGroups = groups.filter((g) => {
    const groupId = normalizedId(g.id);
    for (const [, children] of parentMap.entries()) {
      if (children.some((c) => normalizedId(c.id) === groupId)) {
        return false;
      }
    }
    return true;
  });

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
