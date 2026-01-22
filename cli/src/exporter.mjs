import { normalizedId } from './shared.mjs';

/**
 * Strip Canvas metadata from compiled structure to produce pure data artifact.
 * Removes spatial (x, y, width, height), visual (color), and rendering metadata.
 * Preserves semantic content: id, text, file, url, label for nodes; id, fromNode, toNode, label for edges.
 * Preserves explicit hex colors (e.g. "#ff00aa") for nodes/edges when present.
 * Optionally strips edges when flow-sorted (topology compiled into sequence order).
 * Embeds labeled edges directly into connected nodes via "from" and "to" properties.
 */
export function stripCanvasMetadata(input, settings) {
  const inputEdges = Array.isArray(input?.edges) ? input.edges : [];
  
  // Separate labeled and unlabeled edges
  const labeledEdges = inputEdges.filter(edge => 'label' in edge && edge.label !== undefined);
  const unlabeledEdges = inputEdges.filter(edge => !('label' in edge) || edge.label === undefined);
  
  // Process labeled edges: embed them into nodes
  const nodeFromEdges = processLabeledEdges(labeledEdges, 'from');
  const nodeToEdges = processLabeledEdges(labeledEdges, 'to');

  // Strip nodes: preserve only semantic content
  const nodes = Array.isArray(input?.nodes) ? input.nodes.map(node => {
    const stripped = { id: node.id, type: node.type };

    // Preserve content fields
    if ('text' in node && node.text !== undefined) stripped.text = node.text;   
    if ('file' in node && node.file !== undefined) stripped.file = node.file;   
    if ('url' in node && node.url !== undefined) stripped.url = node.url;       
    if ('label' in node && node.label !== undefined) stripped.label = node.label;

    // Preserve custom colors; drop default palette indices like "1", "2", etc.
    if ('color' in node && isCustomColor(node.color)) stripped.color = node.color;

    // Embed directional edges if any labeled edges connect to this node        
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
  const shouldStripEdges = settings?.flowSort || settings?.stripEdgesWhenFlowSorted;

  // Only process unlabeled edges (labeled edges are now embedded in nodes)
  const edges = shouldStripEdges ? [] : unlabeledEdges.map(edge => {
    const stripped = {
      id: edge.id,
      fromNode: edge.fromNode,
      toNode: edge.toNode,
    };

    if ('color' in edge && isCustomColor(edge.color)) stripped.color = edge.color;

    return stripped;
  });

  return { nodes, edges };
}

/**
 * Process labeled edges and create node ID to edges mapping.
 * Direction can be 'from' (incoming) or 'to' (outgoing).
 */
function processLabeledEdges(labeledEdges, direction) {
  const nodeEdgesMap = new Map();

  for (const edge of labeledEdges) {
    const fromId = normalizedId(edge.fromNode);
    const toId = normalizedId(edge.toNode);
    const color = isCustomColor(edge.color) ? edge.color : undefined;

    if (direction === 'to') {
      // Outgoing edges: fromNode -> toNode
      if (!nodeEdgesMap.has(fromId)) {
        nodeEdgesMap.set(fromId, []);
      }
      const out = {
        node: toId,
        label: edge.label,
      };
      if (color) out.color = color;
      nodeEdgesMap.get(fromId).push(out);
    } else if (direction === 'from') {
      // Incoming edges: fromNode <- toNode
      if (!nodeEdgesMap.has(toId)) {
        nodeEdgesMap.set(toId, []);
      }
      const out = {
        node: fromId,
        label: edge.label,
      };
      if (color) out.color = color;
      nodeEdgesMap.get(toId).push(out);
    }
  }

  return nodeEdgesMap;
}

function isCustomColor(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;
  return !/^\d+$/.test(v);
}
