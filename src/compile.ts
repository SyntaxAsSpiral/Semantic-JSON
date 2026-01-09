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

interface CompileSettings {
  colorSortNodes?: boolean;
  colorSortEdges?: boolean;
  flowSortNodes?: boolean;
  semanticSortOrphans?: boolean;
}

interface FlowGroup {
  nodes: Set<string>; // node IDs in this flow group
  minY: number;       // top-left position for group sorting
  minX: number;
  flowOrder: Map<string, number>; // node ID -> depth in flow
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

function getNodeSortKey(node: CanvasNode): string {
  const type = node?.type;

  // Text nodes: sort by text content
  if (type === 'text' && typeof node.text === 'string') {
    return node.text.toLowerCase().trim();
  }

  // File nodes: sort by filename (basename)
  if (type === 'file' && typeof node.file === 'string') {
    const filename = node.file.split("/").pop() || node.file;
    return filename.toLowerCase().trim();
  }

  // Link nodes: sort by raw URL (keeps protocol, clusters by http/https)
  if (type === 'link' && typeof node.url === 'string') {
    return node.url.toLowerCase().trim();
  }

  // Group nodes: sort by label
  if (type === 'group' && typeof node.label === 'string') {
    return node.label.toLowerCase().trim();
  }

  // Fallback to node id
  return normalizedId(node?.id).toLowerCase();
}

function getNodeTypePriority(node: CanvasNode): number {
  const type = node?.type;
  // Link nodes go to bottom (highest priority number)
  if (type === 'link') return 1;
  // All other types (text, file, group) sort first
  return 0;
}

function getNodeColor(node: CanvasNode): string {
  const color = node?.color;
  if (typeof color === 'string') {
    return color.toLowerCase();
  }
  // No color = empty string (sorts first)
  return '';
}

function getEdgeColor(edge: CanvasEdge): string {
  const color = edge?.color;
  if (typeof color === 'string') {
    return color.toLowerCase();
  }
  // No color = empty string (sorts first)
  return '';
}

function isDirectionalEdge(edge: CanvasEdge): boolean {
  const fromEnd = edge?.fromEnd;
  const toEnd = edge?.toEnd;
  // Default: fromEnd=none, toEnd=arrow (directional forward)
  // Non-directional: both are none
  if (fromEnd === 'arrow' || toEnd === 'arrow') return true;
  if (toEnd === undefined && fromEnd !== 'arrow') return true; // default arrow at toEnd
  return false;
}

function buildFlowGroups(
  nodes: CanvasNode[],
  allEdges: CanvasEdge[],
  nodePositions: Map<string, NodePosition>
): FlowGroup[] {
  // Build node ID set for this scope
  const nodeIdSet = new Set(nodes.map(n => normalizedId(n.id)));

  // Filter edges to only those within this scope
  const scopedEdges = allEdges.filter(e => {
    const from = normalizedId(e?.fromNode);
    const to = normalizedId(e?.toNode);
    return nodeIdSet.has(from) && nodeIdSet.has(to);
  });

  // Build adjacency graph (undirected for component detection)
  const adjacency = new Map<string, Set<string>>();

  // Build directed graph for flow order
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  for (const node of nodes) {
    const id = normalizedId(node.id);
    adjacency.set(id, new Set());
    outgoing.set(id, new Set());
    incoming.set(id, new Set());
  }

  for (const edge of scopedEdges) {
    if (!isDirectionalEdge(edge)) continue;

    const from = normalizedId(edge.fromNode);
    const to = normalizedId(edge.toNode);

    // Add to component graph (undirected)
    adjacency.get(from)?.add(to);
    adjacency.get(to)?.add(from);

    // Determine direction
    const fromEnd = edge?.fromEnd;
    const toEnd = edge?.toEnd ?? 'arrow'; // default

    if (fromEnd === 'arrow' && toEnd === 'arrow') {
      // Bidirectional: just connect, don't add flow direction
      // Direction inherited from neighbors later
    } else if (fromEnd === 'arrow') {
      // Reverse direction: to -> from
      outgoing.get(to)?.add(from);
      incoming.get(from)?.add(to);
    } else {
      // Forward direction: from -> to (default)
      outgoing.get(from)?.add(to);
      incoming.get(to)?.add(from);
    }
  }

  // Find connected components
  const visited = new Set<string>();
  const components: Set<string>[] = [];

  for (const [nodeId] of adjacency) {
    if (visited.has(nodeId)) continue;

    const component = new Set<string>();
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      component.add(current);

      for (const neighbor of adjacency.get(current) || []) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    if (component.size > 1) {
      // Only include multi-node components (actual flow groups)
      components.push(component);
    }
  }

  // For each component, calculate topological order and min position
  const flowGroups: FlowGroup[] = [];

  for (const component of components) {
    // Calculate min position
    let minY = Infinity;
    let minX = Infinity;

    for (const nodeId of component) {
      const pos = nodePositions.get(nodeId);
      const y = isFiniteNumber(pos?.y) ? pos.y : 0;
      const x = isFiniteNumber(pos?.x) ? pos.x : 0;
      if (y < minY || (y === minY && x < minX)) {
        minY = y;
        minX = x;
      }
    }

    // Topological sort (BFS-based level assignment)
    const flowOrder = new Map<string, number>();
    const inDegree = new Map<string, number>();

    for (const nodeId of component) {
      let degree = 0;
      for (const source of incoming.get(nodeId) || []) {
        if (component.has(source)) degree++;
      }
      inDegree.set(nodeId, degree);
    }

    const queue: string[] = [];
    for (const nodeId of component) {
      if (inDegree.get(nodeId) === 0) {
        queue.push(nodeId);
        flowOrder.set(nodeId, 0);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDepth = flowOrder.get(current) || 0;

      for (const next of outgoing.get(current) || []) {
        if (!component.has(next)) continue;

        const degree = inDegree.get(next)! - 1;
        inDegree.set(next, degree);

        // Update depth to max of incoming depths + 1
        const nextDepth = Math.max(flowOrder.get(next) || 0, currentDepth + 1);
        flowOrder.set(next, nextDepth);

        if (degree === 0) {
          queue.push(next);
        }
      }
    }

    // Handle cycles: nodes without depth get max depth + 1
    for (const nodeId of component) {
      if (!flowOrder.has(nodeId)) {
        const maxDepth = Math.max(...Array.from(flowOrder.values()), 0);
        flowOrder.set(nodeId, maxDepth + 1);
      }
    }

    flowGroups.push({
      nodes: component,
      minY,
      minX,
      flowOrder,
    });
  }

  return flowGroups;
}

function stableSortByXY(
  nodes: CanvasNode[],
  settings?: CompileSettings,
  allEdges?: CanvasEdge[],
  nodePositions?: Map<string, NodePosition>,
  isWithinGroup?: boolean
): CanvasNode[] {
  // Build flow groups if flow sorting is enabled
  let flowGroups: FlowGroup[] = [];
  const nodeToFlowGroup = new Map<string, FlowGroup>();

  if (settings?.flowSortNodes && allEdges && nodePositions) {
    flowGroups = buildFlowGroups(nodes, allEdges, nodePositions);

    // Map nodes to their flow groups
    for (const group of flowGroups) {
      for (const nodeId of group.nodes) {
        nodeToFlowGroup.set(nodeId, group);
      }
    }
  }

  nodes.sort((a, b) => {
    const aId = normalizedId(a?.id);
    const bId = normalizedId(b?.id);

    // Flow-based sorting
    if (settings?.flowSortNodes) {
      const aGroup = nodeToFlowGroup.get(aId);
      const bGroup = nodeToFlowGroup.get(bId);

      // If both in flow groups
      if (aGroup && bGroup) {
        // Same group: sort by flow depth (overrides type priority!)
        if (aGroup === bGroup) {
          const aDepth = aGroup.flowOrder.get(aId) || 0;
          const bDepth = bGroup.flowOrder.get(bId) || 0;
          if (aDepth !== bDepth) return aDepth - bDepth;

          // Same depth: sort by spatial position, then color, then content
          const ay = isFiniteNumber(a?.y) ? a.y : 0;
          const by = isFiniteNumber(b?.y) ? b.y : 0;
          if (ay !== by) return ay - by;

          const ax = isFiniteNumber(a?.x) ? a.x : 0;
          const bx = isFiniteNumber(b?.x) ? b.x : 0;
          if (ax !== bx) return ax - bx;

          // Color sorting (optional)
          if (settings?.colorSortNodes !== false) {
            const aColor = getNodeColor(a);
            const bColor = getNodeColor(b);
            if (aColor !== bColor) return aColor.localeCompare(bColor);
          }

          // Content sorting
          return getNodeSortKey(a).localeCompare(getNodeSortKey(b));
        } else {
          // Different groups: sort by group's top-left position
          if (aGroup.minY !== bGroup.minY) return aGroup.minY - bGroup.minY;
          if (aGroup.minX !== bGroup.minX) return aGroup.minX - bGroup.minX;
          // Groups at same position: shouldn't happen, but fall through
        }
      } else if (aGroup && !bGroup) {
        // A in flow group, B isolated: compare A's group position to B's position
        const by = isFiniteNumber(b?.y) ? b.y : 0;
        const bx = isFiniteNumber(b?.x) ? b.x : 0;
        if (aGroup.minY !== by) return aGroup.minY - by;
        if (aGroup.minX !== bx) return aGroup.minX - bx;
        // If positions equal, flow group comes first
        return -1;
      } else if (!aGroup && bGroup) {
        // A isolated, B in flow group
        const ay = isFiniteNumber(a?.y) ? a.y : 0;
        const ax = isFiniteNumber(a?.x) ? a.x : 0;
        if (ay !== bGroup.minY) return ay - bGroup.minY;
        if (ax !== bGroup.minX) return ax - bGroup.minX;
        // If positions equal, flow group comes first
        return 1;
      }
      // Both isolated: fall through to standard sorting
    }

    // Within groups: always use semantic sorting
    if (isWithinGroup) {
      // Sort by type priority (content nodes before link nodes)
      const aPriority = getNodeTypePriority(a);
      const bPriority = getNodeTypePriority(b);
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Sort by color (groups same-colored nodes together) - optional
      if (settings?.colorSortNodes !== false) {
        const aColor = getNodeColor(a);
        const bColor = getNodeColor(b);
        if (aColor !== bColor) return aColor.localeCompare(bColor);
      }

      // Sort by content (semantic)
      return getNodeSortKey(a).localeCompare(getNodeSortKey(b));
    }

    // Spatial sorting (for orphans and groups themselves)
    const ay = isFiniteNumber(a?.y) ? a.y : 0;
    const by = isFiniteNumber(b?.y) ? b.y : 0;
    if (ay !== by) return ay - by;

    const ax = isFiniteNumber(a?.x) ? a.x : 0;
    const bx = isFiniteNumber(b?.x) ? b.x : 0;
    if (ax !== bx) return ax - bx;

    // Sort by type priority (content nodes before link nodes) - only for non-flow nodes
    const aPriority = getNodeTypePriority(a);
    const bPriority = getNodeTypePriority(b);
    if (aPriority !== bPriority) return aPriority - bPriority;

    // Sort by color (groups same-colored nodes together) - optional
    if (settings?.colorSortNodes !== false) {
      const aColor = getNodeColor(a);
      const bColor = getNodeColor(b);
      if (aColor !== bColor) return aColor.localeCompare(bColor);
    }

    // Then by content
    return getNodeSortKey(a).localeCompare(getNodeSortKey(b));
  });
  return nodes;
}

function stableEdgeSortByTopology(
  edges: CanvasEdge[],
  nodePositions: Map<string, NodePosition>,
  settings?: CompileSettings,
  nodes?: CanvasNode[]
): CanvasEdge[] {
  // Build flow groups if flow sorting is enabled
  let nodeToFlowGroup = new Map<string, FlowGroup>();

  if (settings?.flowSortNodes && nodes) {
    const flowGroups = buildFlowGroups(nodes, edges, nodePositions);
    for (const group of flowGroups) {
      for (const nodeId of group.nodes) {
        nodeToFlowGroup.set(nodeId, group);
      }
    }
  }

  edges.sort((a, b) => {
    const aFromId = normalizedId(a?.fromNode);
    const bFromId = normalizedId(b?.fromNode);
    const aToId = normalizedId(a?.toNode);
    const bToId = normalizedId(b?.toNode);

    // Flow-based sorting (if enabled)
    if (settings?.flowSortNodes && nodeToFlowGroup.size > 0) {
      const aFromGroup = nodeToFlowGroup.get(aFromId);
      const bFromGroup = nodeToFlowGroup.get(bFromId);

      // Sort by fromNode flow depth if both in flow groups
      if (aFromGroup && bFromGroup) {
        const aFromDepth = aFromGroup.flowOrder.get(aFromId) ?? Infinity;
        const bFromDepth = bFromGroup.flowOrder.get(bFromId) ?? Infinity;
        if (aFromDepth !== bFromDepth) return aFromDepth - bFromDepth;
      }

      const aToGroup = nodeToFlowGroup.get(aToId);
      const bToGroup = nodeToFlowGroup.get(bToId);

      // Sort by toNode flow depth if both in flow groups
      if (aToGroup && bToGroup) {
        const aToDepth = aToGroup.flowOrder.get(aToId) ?? Infinity;
        const bToDepth = bToGroup.flowOrder.get(bToId) ?? Infinity;
        if (aToDepth !== bToDepth) return aToDepth - bToDepth;
      }
    }

    // Spatial sorting (fallback or primary when flow disabled)
    // Get fromNode positions
    const aFrom = nodePositions.get(aFromId);
    const bFrom = nodePositions.get(bFromId);

    // Sort by fromNode y position
    const afy = isFiniteNumber(aFrom?.y) ? aFrom.y : 0;
    const bfy = isFiniteNumber(bFrom?.y) ? bFrom.y : 0;
    if (afy !== bfy) return afy - bfy;

    // Sort by fromNode x position
    const afx = isFiniteNumber(aFrom?.x) ? aFrom.x : 0;
    const bfx = isFiniteNumber(bFrom?.x) ? bFrom.x : 0;
    if (afx !== bfx) return afx - bfx;

    // Get toNode positions
    const aTo = nodePositions.get(aToId);
    const bTo = nodePositions.get(bToId);

    // Sort by toNode y position
    const aty = isFiniteNumber(aTo?.y) ? aTo.y : 0;
    const bty = isFiniteNumber(bTo?.y) ? bTo.y : 0;
    if (aty !== bty) return aty - bty;

    // Sort by toNode x position
    const atx = isFiniteNumber(aTo?.x) ? aTo.x : 0;
    const btx = isFiniteNumber(bTo?.x) ? bTo.x : 0;
    if (atx !== btx) return atx - btx;

    // Sort by color (groups same-colored edges together) - optional
    if (settings?.colorSortEdges !== false) {
      const aColor = getEdgeColor(a);
      const bColor = getEdgeColor(b);
      if (aColor !== bColor) return aColor.localeCompare(bColor);
    }

    // Fallback to ID for deterministic ordering
    const aid = normalizedId(a?.id);
    const bid = normalizedId(b?.id);
    return aid.localeCompare(bid);
  });
  return edges;
}

export function compileCanvasAll({ input, settings }: { input: CanvasData; settings?: CompileSettings }): CanvasData {
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
  const outNodes = flattenHierarchical(nodes, parentMap, settings, edges, nodePositions);
  const outEdges = [...edges];
  stableEdgeSortByTopology(outEdges, nodePositions, settings, nodes);

  return { nodes: outNodes, edges: outEdges };
}

/**
 * Strip Canvas metadata from compiled structure to produce pure data artifact.
 * Removes spatial (x, y, width, height), visual (color), and rendering metadata.
 * Preserves semantic content: id, text, file, url, label for nodes; id, fromNode, toNode, label for edges.
 * Optionally strips edges when flow-sorted (topology compiled into sequence order).
 * Embeds labeled edges directly into connected nodes via "via" property.
 */
export function stripCanvasMetadata(input: CanvasData, settings?: CompileSettings & { stripEdgesWhenFlowSorted?: boolean }): CanvasData {
  const inputEdges = Array.isArray(input?.edges) ? input.edges : [];
  
  // Separate labeled and unlabeled edges
  const labeledEdges = inputEdges.filter(edge => 'label' in edge && edge.label !== undefined);
  const unlabeledEdges = inputEdges.filter(edge => !('label' in edge) || edge.label === undefined);
  
  // Create node ID to directional edges mapping
  const nodeFromEdges = new Map<string, Array<{ node: string; label: unknown }>>();
  const nodeToEdges = new Map<string, Array<{ node: string; label: unknown }>>();
  
  for (const edge of labeledEdges) {
    const fromId = normalizedId(edge.fromNode);
    const toId = normalizedId(edge.toNode);
    
    // Add to fromNode's "to" array (outgoing)
    if (!nodeToEdges.has(fromId)) {
      nodeToEdges.set(fromId, []);
    }
    nodeToEdges.get(fromId)!.push({
      node: toId,
      label: edge.label
    });
    
    // Add to toNode's "from" array (incoming)
    if (!nodeFromEdges.has(toId)) {
      nodeFromEdges.set(toId, []);
    }
    nodeFromEdges.get(toId)!.push({
      node: fromId,
      label: edge.label
    });
  }

  const nodes = Array.isArray(input?.nodes) ? input.nodes.map(node => {
    const stripped: CanvasNode = { id: node.id, type: node.type };

    // Preserve content fields
    if ('text' in node && node.text !== undefined) stripped.text = node.text;
    if ('file' in node && node.file !== undefined) stripped.file = node.file;
    if ('url' in node && node.url !== undefined) stripped.url = node.url;
    if ('label' in node && node.label !== undefined) stripped.label = node.label;
    
    // Add directional edges if any labeled edges connect to this node
    const nodeId = normalizedId(node.id);
    if (nodeFromEdges.has(nodeId)) {
      stripped.from = nodeFromEdges.get(nodeId);
    }
    if (nodeToEdges.has(nodeId)) {
      stripped.to = nodeToEdges.get(nodeId);
    }

    return stripped;
  }) : [];

  // Strip edges when flow topology is compiled into node sequence order OR when explicitly requested
  const shouldStripEdges = settings?.flowSortNodes || settings?.stripEdgesWhenFlowSorted;

  // Only process unlabeled edges (labeled edges are now embedded in nodes)
  const edges = shouldStripEdges ? [] : unlabeledEdges.map(edge => {
    const stripped: CanvasEdge = {
      id: edge.id,
      fromNode: edge.fromNode,
      toNode: edge.toNode,
    };

    return stripped;
  });

  return { nodes, edges };
}

/**
 * Import JSON data to Canvas structure.
 * Creates visual scaffolding: objects/arrays → groups, primitives → text nodes.
 * Simple vertical layout, zero edges (no implied causality).
 */
export function importJsonToCanvas(data: unknown): CanvasData {
  const nodes: CanvasNode[] = [];
  let idCounter = 0;
  const generateId = () => `imported-${(idCounter++).toString(16).padStart(16, '0')}`;

  interface LayoutContext {
    x: number;
    y: number;
  }

  function traverse(value: unknown, key: string | number | null, context: LayoutContext): void {
    const nodeId = generateId();
    const nodeX = context.x;
    const nodeY = context.y;

    if (value === null || value === undefined) {
      // Null/undefined → text node
      const label = key !== null ? `${String(key)}: null` : 'null';
      nodes.push({
        id: nodeId,
        type: 'text',
        text: label,
        x: nodeX,
        y: nodeY,
        width: 250,
        height: 60,
      });
      context.y += 80;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Object → group
      const label = key !== null ? String(key) : 'root';
      const groupId = nodeId;
      const childContext: LayoutContext = { x: nodeX + 20, y: nodeY + 80 };

      // Traverse children
      const entries = Object.entries(value);
      for (const [k, v] of entries) {
        traverse(v, k, childContext);
      }

      // Create group wrapping children
      const groupHeight = Math.max(childContext.y - nodeY + 20, 100);
      nodes.push({
        id: groupId,
        type: 'group',
        label,
        x: nodeX,
        y: nodeY,
        width: 600,
        height: groupHeight,
      });

      context.y = childContext.y;
    } else if (Array.isArray(value)) {
      // Array → group
      const label = key !== null ? String(key) : 'array';
      const groupId = nodeId;
      const childContext: LayoutContext = { x: nodeX + 20, y: nodeY + 80 };

      // Traverse array items
      for (let i = 0; i < value.length; i++) {
        traverse(value[i], i, childContext);
      }

      // Create group wrapping children
      const groupHeight = Math.max(childContext.y - nodeY + 20, 100);
      nodes.push({
        id: groupId,
        type: 'group',
        label,
        x: nodeX,
        y: nodeY,
        width: 600,
        height: groupHeight,
      });

      context.y = childContext.y;
    } else {
      // Primitive → text node
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      const label = key !== null ? `${String(key)}: ${valueStr}` : valueStr;
      nodes.push({
        id: nodeId,
        type: 'text',
        text: label,
        x: nodeX,
        y: nodeY,
        width: 250,
        height: 60,
      });
      context.y += 80;
    }
  }

  const rootContext: LayoutContext = { x: 0, y: 0 };
  traverse(data, null, rootContext);

  return { nodes, edges: [] };
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

function flattenHierarchical(
  nodes: CanvasNode[],
  parentMap: Map<string, CanvasNode[]>,
  settings?: CompileSettings,
  allEdges?: CanvasEdge[],
  nodePositions?: Map<string, NodePosition>
): CanvasNode[] {
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
      stableSortByXY(children, settings, allEdges, nodePositions, true);

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

  // Sort and add root nodes
  stableSortByXY(rootNodes, settings, allEdges, nodePositions, settings?.semanticSortOrphans);
  stableSortByXY(rootGroups, settings, allEdges, nodePositions);

  for (const node of rootNodes) {
    addNodeAndChildren(node);
  }
  for (const group of rootGroups) {
    addNodeAndChildren(group);
  }

  return result;
}
