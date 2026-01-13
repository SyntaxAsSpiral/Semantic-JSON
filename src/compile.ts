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
  const nodeToFlowGroup = new Map<string, FlowGroup>();

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
 * Removes spatial (x, y, width, height) and rendering metadata.
 * Preserves semantic content: id, type, text, file, url, label, color for nodes; id, fromNode, toNode, label, color for edges.
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
    
    // Preserve color for taxonomy visualization
    if ('color' in node && node.color !== undefined) stripped.color = node.color;
    
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

    // Preserve color for taxonomy visualization
    if ('color' in edge && edge.color !== undefined) stripped.color = edge.color;

    return stripped;
  });

  return { nodes, edges };
}

/**
 * Import JSON data to Canvas structure.
 * Enhanced with rainbow coloring for top-level items and hierarchical coloring for nested content.
 * Creates visual scaffolding from pure JSON: objects to groups, arrays to groups, primitives to text nodes.
 */
export function importJsonToCanvas(data: unknown): CanvasData {
  return importJsonToCanvasEnhanced(data);
}

/**
 * Enhanced JSON import with rainbow coloring for top-level items and hierarchical coloring for nested content.
 * Creates visual scaffolding from pure JSON: objects to groups, arrays to groups, primitives to text nodes.
 */
function importJsonToCanvasEnhanced(data: unknown): CanvasData {
  const nodes: CanvasNode[] = [];
  let idCounter = 0;
  const generateId = () => `imported-${(idCounter++).toString(16).padStart(16, '0')}`;

  interface LayoutContext {
    x: number;
    y: number;
  }

  // Check if this is a top-level object with multiple properties or a top-level array
  const isTopLevelObject = typeof data === 'object' && data !== null && !Array.isArray(data);
  const isTopLevelArray = Array.isArray(data);
  
  if (isTopLevelObject) {
    // For top-level objects, treat each property as a separate rainbow-colored section
    const entries = Object.entries(data as Record<string, unknown>);
    const rainbowColors = generateRainbowGradient(entries.length);
    
    let currentY = 50;
    
    entries.forEach(([key, value], index) => {
      const baseColor = rainbowColors[index];
      const hierarchicalColors = generateHierarchicalColors(baseColor, 6);
      const context: LayoutContext = { x: 50, y: currentY };
      
      // Traverse this property with its own color scheme
      traverseWithColors(value, key, context, 0, hierarchicalColors);
      currentY = context.y + 50; // Add spacing between top-level sections
    });
    
  } else if (isTopLevelArray) {
    // For top-level arrays, treat each item as a separate rainbow-colored section
    const rainbowColors = generateRainbowGradient(data.length);
    
    let currentY = 50;
    
    data.forEach((item, index) => {
      const baseColor = rainbowColors[index];
      const hierarchicalColors = generateHierarchicalColors(baseColor, 6);
      const context: LayoutContext = { x: 50, y: currentY };
      
      // Traverse this array item with its own color scheme
      traverseWithColors(item, `[${index}]`, context, 0, hierarchicalColors);
      currentY = context.y + 50; // Add spacing between top-level sections
    });
    
  } else {
    // For primitive top-level values, use single hierarchical coloring
    const baseColor = '#89b4fa'; // Catppuccin blue as base
    const hierarchicalColors = generateHierarchicalColors(baseColor, 6);
    const context: LayoutContext = { x: 50, y: 50 };
    
    traverseWithColors(data, null, context, 0, hierarchicalColors);
  }

  // Enhanced traverse function with hierarchical coloring
  function traverseWithColors(value: unknown, key: string | number | null, context: LayoutContext, depth: number, hierarchicalColors: string[]): void {
    const colorIndex = Math.min(depth, hierarchicalColors.length - 1);
    const currentColor = hierarchicalColors[colorIndex];
    
    if (value === null || value === undefined) {
      const displayValue = value === null ? 'null' : 'undefined';
      nodes.push({
        id: generateId(),
        type: 'text',
        text: key !== null ? `**${String(key)}**: ${displayValue}` : displayValue,
        x: context.x,
        y: context.y,
        width: 250,
        height: 60,
        color: currentColor,
      });
      context.y += 80;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Object to Group
      const groupId = generateId();
      const groupStartY = context.y;
      const label = key !== null ? String(key) : 'Object';
      context.y += 40; // Space for group header
      
      const entries = Object.entries(value as Record<string, unknown>);
      entries.forEach(([k, v]) => {
        traverseWithColors(v, k, context, depth + 1, hierarchicalColors);
      });
      
      const groupHeight = Math.max(context.y - groupStartY + 20, 100);
      nodes.push({
        id: groupId,
        type: 'group',
        label,
        x: context.x - 10,
        y: groupStartY,
        width: Math.max(600, 300 + depth * 50), // Wider groups for deeper nesting
        height: groupHeight,
        color: currentColor,
      });
      
      context.y += 20; // Space after group
    } else if (Array.isArray(value)) {
      // Array to Group
      const groupId = generateId();
      const groupStartY = context.y;
      const label = key !== null ? `${String(key)} [${value.length}]` : `Array [${value.length}]`;
      context.y += 40; // Space for group header
      
      value.forEach((item, index) => {
        traverseWithColors(item, `[${index}]`, context, depth + 1, hierarchicalColors);
      });
      
      const groupHeight = Math.max(context.y - groupStartY + 20, 100);
      nodes.push({
        id: groupId,
        type: 'group',
        label,
        x: context.x - 10,
        y: groupStartY,
        width: Math.max(600, 300 + depth * 50),
        height: groupHeight,
        color: currentColor,
      });
      
      context.y += 20; // Space after group
    } else {
      // Primitive to Text node
      const valueStr = typeof value === 'string' ? `"${value}"` : 
                      typeof value === 'number' || typeof value === 'boolean' ? String(value) :
                      typeof value === 'object' ? JSON.stringify(value) : 'unknown';
      const displayText = key !== null ? `**${String(key)}**: ${valueStr}` : valueStr;
      
      nodes.push({
        id: generateId(),
        type: 'text',
        text: displayText,
        x: context.x,
        y: context.y,
        width: Math.max(250, Math.min(500, displayText.length * 8 + 50)),
        height: Math.max(60, Math.ceil(displayText.length / 40) * 20 + 40),
        color: currentColor,
      });
      context.y += Math.max(80, Math.ceil(displayText.length / 40) * 20 + 60);
    }
  }

  return { nodes, edges: [] };
}

/**
 * Color manipulation utilities for palette mutations
 */
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: number, s: number;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (c: number): string => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mutateColor(hex: string, hueShift: number, satMult: number, lightMult: number): string {
  let [h, s, l] = hexToHsl(hex);
  
  h = (h + hueShift) % 360;
  if (h < 0) h += 360;
  
  s = Math.max(0, Math.min(100, s * satMult));
  l = Math.max(0, Math.min(100, l * lightMult));
  
  return hslToHex(h, s, l);
}

/**
 * Generate rainbow gradient colors for grid layout
 */
function generateRainbowGradient(count: number): string[] {
  const colors: string[] = [];
  const baseHues = [0, 30, 60, 120, 180, 240, 300]; // Red, Orange, Yellow, Green, Cyan, Blue, Purple
  
  for (let i = 0; i < count; i++) {
    // Cycle through base hues, then interpolate between them
    const hueIndex = i % baseHues.length;
    const cyclePosition = Math.floor(i / baseHues.length);
    
    // Add slight variation for multiple cycles
    const hueVariation = cyclePosition * 15; // 15 degree shift per cycle
    const baseHue = baseHues[hueIndex];
    const finalHue = (baseHue + hueVariation) % 360;
    
    // Vary saturation and lightness for visual interest
    const saturation = 65 + (i % 3) * 10; // 65-85%
    const lightness = 70 + (i % 4) * 5;   // 70-85%
    
    colors.push(hslToHex(finalHue, saturation, lightness));
  }
  
  return colors;
}

/**
 * Generate hierarchical color mutations for nested content
 */
function generateHierarchicalColors(baseColor: string, depth: number): string[] {
  const colors: string[] = [baseColor];
  
  for (let i = 1; i <= depth; i++) {
    // Each level gets progressively more muted and shifted
    const hueShift = i * 25; // Shift hue by 25 degrees per level
    const satReduction = 0.85 - (i * 0.1); // Reduce saturation
    const lightIncrease = 1.1 + (i * 0.05); // Increase lightness slightly
    
    const mutatedColor = mutateColor(baseColor, hueShift, satReduction, lightIncrease);
    colors.push(mutatedColor);
  }
  
  return colors;
}

/**
 * Import JSONL data to Canvas structure.
 * Enhanced with rainbow gradient coloring and grid layout.
 * Creates visual scaffolding for multiple JSON objects: each object to group, arranged in a grid.
 * Objects/arrays to groups, primitives to text nodes within each object group.
 */
export function importJsonlToCanvas(jsonObjects: unknown[]): CanvasData {
  return importJsonlToCanvasEnhanced(jsonObjects);
}

/**
 * Import JSONL data to Canvas structure (original simple algorithm).
 * Creates visual scaffolding for multiple JSON objects: each object → group, arranged in a grid.
 * Objects/arrays → groups, primitives → text nodes within each object group.
 */
function importJsonlToCanvasSimple(jsonObjects: unknown[]): CanvasData {
  const nodes: CanvasNode[] = [];
  let idCounter = 0;
  const generateId = () => `imported-${(idCounter++).toString(16).padStart(16, '0')}`;
  
  interface LayoutContext {
    x: number;
    y: number;
  }

  // Grid layout configuration
  const recordWidth = 700;  // Width of each record group (including padding)
  const recordSpacing = 50; // Spacing between records
  const totalRecordWidth = recordWidth + recordSpacing;

  // Calculate grid dimensions - max 4 columns for optimal document scanning
  const maxCols = 4;
  const recordCount = jsonObjects.length;
  
  let cols = Math.min(recordCount, maxCols);
  let rows = Math.ceil(recordCount / cols);

  console.log(`Arranging ${recordCount} records in ${cols}x${rows} grid (max ${maxCols} columns for document scanning)`);

  // Generate rainbow gradient colors for main records
  const rainbowColors = generateRainbowGradient(recordCount);

  // Layout each JSON object in grid position
  for (let i = 0; i < jsonObjects.length; i++) {
    const obj = jsonObjects[i];
    const objectGroupId = generateId();
    const baseColor = rainbowColors[i];
    
    // Generate hierarchical colors for this record's nested content
    const hierarchicalColors = generateHierarchicalColors(baseColor, 5);
    
    // Calculate grid position
    const col = i % cols;
    const row = Math.floor(i / cols);
    const gridX = col * totalRecordWidth;
    const gridY = row * 3500; // Vertical spacing between rows (enough for most records)
    
    const objectContext: LayoutContext = { x: gridX + 20, y: gridY + 80 };
    
    // Enhanced traverse function with hierarchical coloring
    function traverseWithColors(value: unknown, key: string | null, context: LayoutContext, depth = 0): void {
      const colorIndex = Math.min(depth, hierarchicalColors.length - 1);
      const currentColor = hierarchicalColors[colorIndex];
      
      if (value === null || value === undefined) {
        nodes.push({
          id: generateId(),
          type: 'text',
          text: `**${key || 'null'}**: ${value}`,
          x: context.x,
          y: context.y,
          width: 200,
          height: 60,
          color: currentColor,
        });
        context.y += 80;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Object → Group
        const groupId = generateId();
        const groupStartY = context.y;
        context.y += 40; // Space for group header
        
        const entries = Object.entries(value as Record<string, unknown>);
        entries.forEach(([k, v]) => {
          traverseWithColors(v, k, context, depth + 1);
        });
        
        const groupHeight = Math.max(context.y - groupStartY + 20, 100);
        nodes.push({
          id: groupId,
          type: 'group',
          label: key || 'Object',
          x: context.x - 10,
          y: groupStartY,
          width: 300,
          height: groupHeight,
          color: currentColor,
        });
        
        context.y += 20; // Space after group
      } else if (Array.isArray(value)) {
        // Array → Group
        const groupId = generateId();
        const groupStartY = context.y;
        context.y += 40; // Space for group header
        
        value.forEach((item, index) => {
          traverseWithColors(item, `[${index}]`, context, depth + 1);
        });
        
        const groupHeight = Math.max(context.y - groupStartY + 20, 100);
        nodes.push({
          id: groupId,
          type: 'group',
          label: key ? `${key} [${value.length}]` : `Array [${value.length}]`,
          x: context.x - 10,
          y: groupStartY,
          width: 300,
          height: groupHeight,
          color: currentColor,
        });
        
        context.y += 20; // Space after group
      } else {
        // Primitive → Text node
        const displayValue = typeof value === 'string' ? `"${value}"` : String(value);
        nodes.push({
          id: generateId(),
          type: 'text',
          text: key ? `**${key}**: ${displayValue}` : displayValue,
          x: context.x,
          y: context.y,
          width: 250,
          height: Math.max(60, Math.ceil(displayValue.length / 30) * 20 + 40),
          color: currentColor,
        });
        context.y += Math.max(80, Math.ceil(displayValue.length / 30) * 20 + 60);
      }
    }
    
    // Traverse the object content with hierarchical coloring
    traverseWithColors(obj, null, objectContext);
    
    // Create wrapper group for this JSONL object with rainbow color
    const objectHeight = Math.max(objectContext.y - gridY + 20, 100);
    nodes.push({
      id: objectGroupId,
      type: 'group',
      label: `Record ${i + 1}`,
      x: gridX,
      y: gridY,
      width: recordWidth,
      height: objectHeight,
      color: baseColor,
    });
  }

  return { nodes, edges: [] };
}

/**
 * Enhanced JSONL import with rainbow gradient coloring and grid layout.
 * Creates visual scaffolding for multiple JSON objects: each object to group, arranged in a grid.
 * Uses proper node-first placement with groups calculated from actual node positions.
 */
function importJsonlToCanvasEnhanced(jsonObjects: unknown[]): CanvasData {
  const groupNodes: CanvasNode[] = []; // Groups go first (bottom layer)
  const contentNodes: CanvasNode[] = []; // Content goes on top
  let idCounter = 0;
  const generateId = () => `imported-${(idCounter++).toString(16).padStart(16, '0')}`;

  // Grid layout configuration
  const recordWidth = 420;  // Width for each record column
  const recordSpacing = 30; // Spacing between records
  const totalRecordWidth = recordWidth + recordSpacing;
  const columnWidth = 180; // Width of each text column within a group
  const columnSpacing = 20; // Space between columns
  const groupPadding = 20; // Breathing room inside groups
  const nodeHeight = 60; // Standard node height
  const nodeSpacing = 10; // Spacing between nodes
  const sectionSpacing = 50; // Extra spacing between logical sections
  const groupSpacing = 25; // Extra spacing after each group
  
  // Calculate grid dimensions - max 4 columns for optimal document scanning
  const maxCols = 4;
  const recordCount = jsonObjects.length;
  
  let cols = Math.min(recordCount, maxCols);
  let rows = Math.ceil(recordCount / cols);

  // eslint-disable-next-line no-console
  console.log(`Arranging ${recordCount} records in ${cols}x${rows} grid (max ${maxCols} columns for document scanning)`);

  // Generate rainbow gradient colors for main records
  const rainbowColors = generateRainbowGradient(recordCount);

  // Track row heights for proper grid spacing
  const rowHeights: number[] = [];
  const recordHeights: number[] = [];

  // First pass: calculate all record heights
  for (let i = 0; i < jsonObjects.length; i++) {
    const obj = jsonObjects[i];
    let recordHeight = 100; // Minimum height
    
    if (typeof obj === 'object' && obj !== null && '_section' in obj && '_index' in obj) {
      const record = obj as Record<string, unknown>;
      const dataEntries = Object.entries(record).filter(([key]) => !key.startsWith('_'));
      
      // Estimate height based on content
      let estimatedNodes = 0;
      for (const [, value] of dataEntries) {
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            estimatedNodes += value.length;
          } else {
            const subEntries = Object.entries(value as Record<string, unknown>);
            for (const [, subValue] of subEntries) {
              if (Array.isArray(subValue)) {
                estimatedNodes += subValue.length;
              } else {
                estimatedNodes += 1;
              }
            }
          }
        } else {
          estimatedNodes += 1;
        }
      }
      
      // Calculate height: base + nodes in 2-column layout + spacing
      const nodeRows = Math.ceil(estimatedNodes / 2);
      recordHeight = 50 + (nodeRows * (nodeHeight + nodeSpacing)) + (dataEntries.length * sectionSpacing) + 100;
    }
    
    recordHeights.push(recordHeight);
    
    // Track max height per row
    const row = Math.floor(i / cols);
    if (!rowHeights[row]) {
      rowHeights[row] = 0;
    }
    rowHeights[row] = Math.max(rowHeights[row], recordHeight);
  }

  // Calculate cumulative row positions
  const rowPositions: number[] = [0];
  for (let row = 1; row < rows; row++) {
    rowPositions[row] = rowPositions[row - 1] + rowHeights[row - 1] + 100; // 100px spacing between rows
  }

  // Process each JSON object
  for (let i = 0; i < jsonObjects.length; i++) {
    const obj = jsonObjects[i];
    const baseColor = rainbowColors[i];
    const hierarchicalColors = generateHierarchicalColors(baseColor, 6);
    
    // Calculate grid position
    const col = i % cols;
    const row = Math.floor(i / cols);
    const gridX = col * totalRecordWidth;
    const gridY = rowPositions[row]; // Use calculated row position
    
    // STEP 1: Place all nodes first in proper 2-column layout
    interface NodePlacement {
      id: string;
      type: 'text';
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      groupPath: string[]; // Path to determine which groups this node belongs to
    }
    
    const nodePlacements: NodePlacement[] = [];
    let currentY = gridY + 50; // Space for parent group label
    
    // Process the flattened record structure
    if (typeof obj === 'object' && obj !== null && '_section' in obj && '_index' in obj) {
      // This is a flattened record from our JSON processing
      const record = obj as Record<string, unknown>;
      const sectionName = String(record._section);
      const recordIndex = Number(record._index);
      const parentGroupLabel = `${sectionName} ${recordIndex}`;
      
      // Place all the actual data nodes (skip _section and _index)
      const dataEntries = Object.entries(record).filter(([key]) => !key.startsWith('_'));
      let currentColumn = 0;
      
      // First pass: place simple properties in "Object" group
      const simpleEntries = dataEntries.filter(([, value]) => 
        typeof value !== 'object' || value === null
      );
      
      if (simpleEntries.length > 0) {
        // Add extra spacing before Object section
        currentY += sectionSpacing;
        
        for (const [key, value] of simpleEntries) {
          const columnX = gridX + groupPadding + (currentColumn * (columnWidth + columnSpacing));
          
          nodePlacements.push({
            id: generateId(),
            type: 'text',
            text: `**${key}**: ${value === null ? 'null' : typeof value === 'string' ? `"${value}"` : String(value)}`,
            x: columnX,
            y: currentY,
            width: columnWidth,
            height: nodeHeight,
            color: hierarchicalColors[1] || hierarchicalColors[hierarchicalColors.length - 1],
            groupPath: [parentGroupLabel, 'Object'],
          });
          
          currentColumn = (currentColumn + 1) % 2;
          if (currentColumn === 0) {
            currentY += nodeHeight + nodeSpacing;
          }
        }
        
        // Ensure we end on a new row
        if (currentColumn !== 0) {
          currentY += nodeHeight + nodeSpacing;
          currentColumn = 0;
        }
      }
      
      // Second pass: place complex objects
      const complexEntries = dataEntries.filter(([, value]) => 
        typeof value === 'object' && value !== null
      );
      
      for (const [key, value] of complexEntries) {
        // Add extra spacing before each complex section
        currentY += sectionSpacing;
        
        if (Array.isArray(value)) {
          // Handle arrays directly at top level
          const arrayLabel = `${key} [${value.length}]`;
          
          value.forEach((item, index) => {
            const columnX = gridX + groupPadding + (currentColumn * (columnWidth + columnSpacing));
            
            nodePlacements.push({
              id: generateId(),
              type: 'text',
              text: `**[${index}]**: ${item === null ? 'null' : typeof item === 'string' ? `"${item}"` : String(item)}`,
              x: columnX,
              y: currentY,
              width: columnWidth,
              height: nodeHeight,
              color: hierarchicalColors[2] || hierarchicalColors[hierarchicalColors.length - 1],
              groupPath: [parentGroupLabel, arrayLabel],
            });
            
            currentColumn = (currentColumn + 1) % 2;
            if (currentColumn === 0) {
              currentY += nodeHeight + nodeSpacing;
            }
          });
          
          // Ensure we end on a new row
          if (currentColumn !== 0) {
            currentY += nodeHeight + nodeSpacing;
            currentColumn = 0;
          }
          
          // Add extra spacing after arrays
          currentY += groupSpacing;
          
        } else {
          // Handle nested objects
          const objectEntries = Object.entries(value as Record<string, unknown>);
          
          for (const [childKey, childValue] of objectEntries) {
            if (Array.isArray(childValue)) {
              // Array within nested object
              const arrayLabel = `${childKey} [${childValue.length}]`;
              
              childValue.forEach((item, index) => {
                const columnX = gridX + groupPadding + (currentColumn * (columnWidth + columnSpacing));
                
                nodePlacements.push({
                  id: generateId(),
                  type: 'text',
                  text: `**[${index}]**: ${item === null ? 'null' : typeof item === 'string' ? `"${item}"` : String(item)}`,
                  x: columnX,
                  y: currentY,
                  width: columnWidth,
                  height: nodeHeight,
                  color: hierarchicalColors[3] || hierarchicalColors[hierarchicalColors.length - 1],
                  groupPath: [parentGroupLabel, key, arrayLabel],
                });
                
                currentColumn = (currentColumn + 1) % 2;
                if (currentColumn === 0) {
                  currentY += nodeHeight + nodeSpacing;
                }
              });
              
              // Ensure we end on a new row after array
              if (currentColumn !== 0) {
                currentY += nodeHeight + nodeSpacing;
                currentColumn = 0;
              }
              
              // Add extra spacing after nested arrays
              currentY += groupSpacing;
              
            } else {
              // Regular property in nested object
              const columnX = gridX + groupPadding + (currentColumn * (columnWidth + columnSpacing));
              
              nodePlacements.push({
                id: generateId(),
                type: 'text',
                text: `**${childKey}**: ${childValue === null ? 'null' : typeof childValue === 'string' ? `"${childValue}"` : String(childValue)}`,
                x: columnX,
                y: currentY,
                width: columnWidth,
                height: nodeHeight,
                color: hierarchicalColors[2] || hierarchicalColors[hierarchicalColors.length - 1],
                groupPath: [parentGroupLabel, key],
              });
              
              currentColumn = (currentColumn + 1) % 2;
              if (currentColumn === 0) {
                currentY += nodeHeight + nodeSpacing;
              }
            }
          }
          
          // Ensure we end on a new row after nested object
          if (currentColumn !== 0) {
            currentY += nodeHeight + nodeSpacing;
            currentColumn = 0;
          }
          
          // Add extra spacing after complex sections
          currentY += groupSpacing;
        }
      }
      
      // STEP 2: Calculate group boundaries based on actual node positions
      const groupBoundaries = new Map<string, {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
        nodes: NodePlacement[];
        color: string;
        depth: number;
      }>();
      
      // Group nodes by their group paths
      for (const node of nodePlacements) {
        for (let depth = 0; depth < node.groupPath.length; depth++) {
          const groupKey = node.groupPath.slice(0, depth + 1).join(' > ');
          
          if (!groupBoundaries.has(groupKey)) {
            groupBoundaries.set(groupKey, {
              minX: node.x,
              minY: node.y,
              maxX: node.x + node.width,
              maxY: node.y + node.height,
              nodes: [],
              color: hierarchicalColors[depth] || hierarchicalColors[hierarchicalColors.length - 1],
              depth,
            });
          }
          
          const boundary = groupBoundaries.get(groupKey)!;
          boundary.minX = Math.min(boundary.minX, node.x);
          boundary.minY = Math.min(boundary.minY, node.y);
          boundary.maxX = Math.max(boundary.maxX, node.x + node.width);
          boundary.maxY = Math.max(boundary.maxY, node.y + node.height);
          boundary.nodes.push(node);
        }
      }
      
      // STEP 3: Create groups with proper boundaries and same width
      for (const [groupKey, boundary] of groupBoundaries.entries()) {
        const groupPath = groupKey.split(' > ');
        const groupLabel = groupPath[groupPath.length - 1];
        const isParent = groupPath.length === 1;
        
        // Calculate group dimensions
        const groupX = gridX;
        let groupY = boundary.minY - 30; // Space for group label
        const groupWidth = recordWidth;
        let groupHeight: number;
        
        if (isParent) {
          // Parent group spans entire record
          groupY = gridY;
          groupHeight = currentY - gridY + 20;
        } else {
          // Child group only as tall as needed
          groupHeight = boundary.maxY - boundary.minY + 60; // Extra space for label and padding
        }
        
        groupNodes.push({
          id: generateId(),
          type: 'group',
          label: groupLabel,
          x: groupX,
          y: groupY,
          width: groupWidth,
          height: groupHeight,
          color: boundary.color,
        });
      }
      
      // STEP 4: Add all content nodes
      for (const node of nodePlacements) {
        contentNodes.push({
          id: node.id,
          type: node.type,
          text: node.text,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          color: node.color,
        });
      }
    }
  }

  // Solitaire-style layering: groups first (bottom), then content (top)
  const nodes: CanvasNode[] = [...groupNodes, ...contentNodes];
  
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

      // Sort subgroups spatially (not semantically)
      stableSortByXY(childGroups, { ...settings, colorSortNodes: false }, allEdges, nodePositions, false);

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


/**
 * Unified import function that detects input type by file extension and content.
 * Supports .json, .jsonl files with automatic type detection and enhanced visual features.
 */
export function importDataToCanvas(filePath: string, fileContent: string): CanvasData {
  const extension = filePath.toLowerCase().split('.').pop();
  
  try {
    if (extension === 'jsonl') {
      // JSONL: Parse each line as separate JSON object
      const lines = fileContent.trim().split('\n').filter(line => line.trim());
      const jsonObjects = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          throw new Error(`Invalid JSON on line: ${line.substring(0, 50)}... Error: ${error instanceof Error ? error.message : 'Parse failed'}`);
        }
      });
      
      if (jsonObjects.length === 0) {
        throw new Error('No valid JSON objects found in JSONL file');
      }
      
      return importJsonlToCanvasEnhanced(jsonObjects);
      
    } else if (extension === 'json') {
      // JSON: Parse as single object/array and use grid layout by default
      const data = JSON.parse(fileContent);
      
      // For Canvas exports, extract the nodes array
      if (typeof data === 'object' && data !== null && 'nodes' in data) {
        const canvasData = data as { nodes?: unknown[] };
        if (Array.isArray(canvasData.nodes)) {
          return importJsonlToCanvasEnhanced(canvasData.nodes);
        }
      }
      
      // For structured data objects with arrays, flatten to records for grid layout
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const records: unknown[] = [];
        const obj = data as Record<string, unknown>;
        
        // Extract all array items as individual records
        for (const [key, value] of Object.entries(obj)) {
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              records.push({
                _section: key,
                _index: index,
                ...((typeof item === 'object' && item !== null) ? item as Record<string, unknown> : { value: item })
              });
            });
          }
        }
        
        if (records.length > 0) {
          return importJsonlToCanvasEnhanced(records);
        }
      }
      
      // For top-level arrays, treat each item as a record
      if (Array.isArray(data)) {
        return importJsonlToCanvasEnhanced(data);
      }
      
      // Fallback to hierarchical only for simple objects without arrays
      return importJsonToCanvasEnhanced(data);
      
    } else {
      // Auto-detect based on content structure
      const trimmedContent = fileContent.trim();
      
      // Check if it looks like JSONL (multiple lines with JSON objects)
      const lines = trimmedContent.split('\n').filter(line => line.trim());
      if (lines.length > 1) {
        // Try parsing as JSONL first
        try {
          const jsonObjects = lines.map(line => JSON.parse(line));
          return importJsonlToCanvasEnhanced(jsonObjects);
        } catch {
          // Fall through to JSON parsing
        }
      }
      
      // Try parsing as regular JSON
      try {
        const data = JSON.parse(trimmedContent);
        return importJsonToCanvasEnhanced(data);
      } catch (error) {
        throw new Error(`Unable to parse file as JSON or JSONL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convenience function for importing from file system (Node.js environments)
 */
export async function importFileToCanvas(filePath: string): Promise<CanvasData> {
  try {
    // Dynamic import for Node.js fs module (only available in Node environments)
    const fs = await import('fs');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return importDataToCanvas(filePath, fileContent);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot resolve module')) {
      throw new Error('File system access not available in this environment. Use importDataToCanvas with file content instead.');
    }
    throw error;
  }
}