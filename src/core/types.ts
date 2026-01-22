export interface CanvasNode {
  id: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  [key: string]: unknown;
}

export interface CanvasData {
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  [key: string]: unknown;
}

export interface NodePosition {
  x?: number;
  y?: number;
}

export interface CompileSettings {
  colorSortNodes?: boolean;
  colorSortEdges?: boolean;
  flowSortNodes?: boolean;
  semanticSortOrphans?: boolean;
  stripEdgesWhenFlowSorted?: boolean;
  flowSort?: boolean;
  stripMetadata?: boolean;
}
