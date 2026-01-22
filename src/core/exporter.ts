import type { CanvasData, CanvasEdge, CanvasNode, CompileSettings } from './types';
import { normalizedId } from './shared';

type StripSettings = CompileSettings & { stripEdgesWhenFlowSorted?: boolean; flowSort?: boolean };

export function stripCanvasMetadata(input: CanvasData, settings?: StripSettings): CanvasData {
  const inputEdges = Array.isArray(input?.edges) ? input.edges : [];

  const labeledEdges = inputEdges.filter((edge) => 'label' in edge && edge.label !== undefined);
  const unlabeledEdges = inputEdges.filter((edge) => !('label' in edge) || edge.label === undefined);

  const nodeFromEdges = processLabeledEdges(labeledEdges, 'from');
  const nodeToEdges = processLabeledEdges(labeledEdges, 'to');

  const nodes = Array.isArray(input?.nodes)
    ? input.nodes.map((node) => {
        const stripped: CanvasNode = { id: node.id, type: node.type };

        if ('text' in node && node.text !== undefined) stripped.text = node.text;
        if ('file' in node && node.file !== undefined) stripped.file = node.file;
        if ('url' in node && node.url !== undefined) stripped.url = node.url;
        if ('label' in node && node.label !== undefined) stripped.label = node.label;

        if ('color' in node && isCustomColor(node.color)) stripped.color = node.color;

        const nodeId = normalizedId(node.id);
        if (nodeFromEdges.has(nodeId)) {
          stripped.from = nodeFromEdges.get(nodeId);
        }
        if (nodeToEdges.has(nodeId)) {
          stripped.to = nodeToEdges.get(nodeId);
        }

        return stripped;
      })
    : [];

  const shouldStripEdges = settings?.flowSort || settings?.stripEdgesWhenFlowSorted;

  const edges = shouldStripEdges
    ? []
    : unlabeledEdges.map((edge) => {
        const stripped: CanvasEdge = {
          id: edge.id,
          fromNode: edge.fromNode,
          toNode: edge.toNode,
        };

        if ('color' in edge && isCustomColor(edge.color)) stripped.color = edge.color;

        return stripped;
      });

  return { nodes, edges };
}

function processLabeledEdges(
  labeledEdges: CanvasEdge[],
  direction: 'from' | 'to',
): Map<string, Array<{ node: string; label: unknown; color?: string }>> {
  const nodeEdgesMap = new Map<string, Array<{ node: string; label: unknown; color?: string }>>();

  for (const edge of labeledEdges) {
    const fromId = normalizedId(edge.fromNode);
    const toId = normalizedId(edge.toNode);
    const color = isCustomColor(edge.color) ? edge.color : undefined;

    if (direction === 'to') {
      if (!nodeEdgesMap.has(fromId)) {
        nodeEdgesMap.set(fromId, []);
      }
      const out: { node: string; label: unknown; color?: string } = {
        node: toId,
        label: edge.label,
      };
      if (color) out.color = color;
      nodeEdgesMap.get(fromId)?.push(out);
    } else if (direction === 'from') {
      if (!nodeEdgesMap.has(toId)) {
        nodeEdgesMap.set(toId, []);
      }
      const out: { node: string; label: unknown; color?: string } = {
        node: fromId,
        label: edge.label,
      };
      if (color) out.color = color;
      nodeEdgesMap.get(toId)?.push(out);
    }
  }

  return nodeEdgesMap;
}

function isCustomColor(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;
  return !/^\d+$/.test(v);
}
