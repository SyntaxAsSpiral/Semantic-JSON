import { Notice, Plugin, TFile } from 'obsidian';
import { compileCanvasAll, stripCanvasMetadata, importDataToCanvas } from './compile';
import type { CanvasData, CanvasEdge, CanvasNode } from './compile';
import {
  DEFAULT_SETTINGS,
  SemanticJsonModernSettingTab,
  SemanticJsonModernSettings,
} from './settings';
import { LLMService, SemanticAnalysisRequest } from './llm-service';
import type { SemanticAnalysisResponse } from './llm-service';

export default class SemanticJsonModernPlugin extends Plugin {
  settings: SemanticJsonModernSettings = { ...DEFAULT_SETTINGS };
  private isCompiling = false;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SemanticJsonModernSettingTab(this.app, this));

    this.addCommand({
      id: 'compile-active-canvas',
      name: 'Compile active canvas',
      callback: () => void this.compileActive(),
    });

    this.addCommand({
      id: 'export-as-pure-json',
      name: 'Export as pure JSON',
      callback: () => void this.exportAsPureJson(),
    });

    this.addCommand({
      id: 'import-to-canvas',
      name: 'Import to canvas',
      callback: () => void this.importToCanvas(),
    });

    this.addCommand({
      id: 'import-json-to-canvas',
      name: 'Import JSON to canvas',
      callback: () => void this.importJsonToCanvas(),
    });

    this.addCommand({
      id: 'import-jsonl-to-canvas',
      name: 'Import data to canvas',
      callback: () => void this.importJsonlToCanvas(),
    });

    this.addCommand({
      id: 'assign-semantic-ids',
      name: 'Assign semantic ID values',
      callback: () => void this.assignSemanticIds(),
    });

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (!this.settings.autoCompile) return;
        if (!(file instanceof TFile) || file.extension !== 'canvas') return;
        void this.compileFile(file, false);
      })
    );
  }

  async loadSettings() {
    const loaded = (await this.loadData()) as unknown;
    const data = isRecord(loaded) ? (loaded as Partial<SemanticJsonModernSettings>) : {};
    this.settings = { ...DEFAULT_SETTINGS, ...data };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async compileActive() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'canvas') {
      new Notice('No active canvas file');
      return;
    }
    await this.compileFile(file, true);
  }

  async exportAsPureJson() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'canvas') {
      new Notice('No active canvas file');
      return;
    }

    try {
      const raw = await this.app.vault.read(file);
      const parsed = parseCanvasData(raw);

      // Compile first to get semantic ordering
      const compiled = compileCanvasAll({
        input: parsed,
        settings: {
          colorSortNodes: this.settings.colorSortNodes,
          colorSortEdges: this.settings.colorSortEdges,
          flowSortNodes: this.settings.flowSortNodes,
          semanticSortOrphans: this.settings.semanticSortOrphans,
        },
      });

      // Strip Canvas metadata
      const stripped = stripCanvasMetadata(compiled, {
        flowSort: this.settings.flowSortNodes,
        stripEdgesWhenFlowSorted: this.settings.stripEdgesWhenFlowSorted,
      });
      const serialized = JSON.stringify(stripped, null, 2) + '\n';

      // Create .pure.json filename
      const jsonPath = file.path.replace(/\.canvas$/, '.pure.json');

      // Check if file exists
      const existingFile = this.app.vault.getAbstractFileByPath(jsonPath);
      if (existingFile instanceof TFile) {
        await this.app.vault.modify(existingFile, serialized);
      } else {
        await this.app.vault.create(jsonPath, serialized);
      }

      new Notice(`Exported to ${jsonPath}`);
    } catch (error) {
      console.error(error);
      new Notice(
        `Export failed${error instanceof Error ? `: ${error.message}` : ''}`
      );
    }
  }

  async importToCanvas() {
    const file = this.app.workspace.getActiveFile();
    if (!file || (file.extension !== 'json' && file.extension !== 'jsonl')) {
      new Notice('No active data file');
      return;
    }

    try {
      const raw = await this.app.vault.read(file);
      
      // Use unified import with auto-detection
      const canvas = importDataToCanvas(file.path, raw);
      const serialized = JSON.stringify(canvas, null, 2) + '\n';

      // Create .canvas filename
      const canvasPath = file.path.replace(/\.(json|jsonl)$/, '.canvas');

      // Check if file exists
      const existingFile = this.app.vault.getAbstractFileByPath(canvasPath);
      if (existingFile instanceof TFile) {
        await this.app.vault.modify(existingFile, serialized);
      } else {
        await this.app.vault.create(canvasPath, serialized);
      }

      new Notice(`Imported to ${canvasPath}`);
    } catch (error) {
      console.error(error);
      new Notice(
        `Import failed${error instanceof Error ? `: ${error.message}` : ''}`
      );
    }
  }

  async importJsonToCanvas() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'json') {
      new Notice('No active JSON file');
      return;
    }

    try {
      const raw = await this.app.vault.read(file);

      // Import JSON to Canvas structure (CLI parity)
      const canvas = importDataToCanvas(file.path, raw);
      const serialized = JSON.stringify(canvas, null, 2) + '\n';

      // Create .canvas filename
      const canvasPath = file.path.replace(/\.json$/, '.canvas');

      // Check if file exists
      const existingFile = this.app.vault.getAbstractFileByPath(canvasPath);
      if (existingFile instanceof TFile) {
        await this.app.vault.modify(existingFile, serialized);
      } else {
        await this.app.vault.create(canvasPath, serialized);
      }

      new Notice(`Imported to ${canvasPath}`);
    } catch (error) {
      console.error(error);
      new Notice(
        `Import failed${error instanceof Error ? `: ${error.message}` : ''}`
      );
    }
  }

  async importJsonlToCanvas() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'jsonl') {
      new Notice('No active data file');
      return;
    }

    try {
      const raw = await this.app.vault.read(file);
      const recordCount = raw.trim().split('\n').filter((line) => line.trim()).length;

      // Import JSONL to Canvas structure (CLI parity)
      const canvas = importDataToCanvas(file.path, raw);
      const serialized = JSON.stringify(canvas, null, 2) + '\n';

      // Create .canvas filename
      const canvasPath = file.path.replace(/\.jsonl$/, '.canvas');

      // Check if file exists
      const existingFile = this.app.vault.getAbstractFileByPath(canvasPath);
      if (existingFile instanceof TFile) {
        await this.app.vault.modify(existingFile, serialized);
      } else {
        await this.app.vault.create(canvasPath, serialized);
      }

      new Notice(`Imported ${recordCount} records to ${canvasPath}`);
    } catch (error) {
      console.error(error);
      new Notice(
        `JSONL import failed${error instanceof Error ? `: ${error.message}` : ''}`
      );
    }
  }

  async assignSemanticIds() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'canvas') {
      new Notice('No active canvas file');
      return;
    }

    if (!this.settings.llm.enabled) {
      new Notice('Llm features are disabled. Enable them in settings first.');
      return;
    }

    try {
      new Notice('Analyzing canvas content...');
      
      const raw = await this.app.vault.read(file);
      const parsed = parseCanvasData(raw);

      // Extract node and edge data for LLM analysis
      const nodes = parsed.nodes ?? [];
      const edges = parsed.edges ?? [];

      const analysisRequest: SemanticAnalysisRequest = {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          text: typeof node.text === 'string' ? node.text : undefined,
          file: typeof node.file === 'string' ? node.file : undefined,
          url: typeof node.url === 'string' ? node.url : undefined,
          label: typeof node.label === 'string' ? node.label : undefined,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          fromNode: edge.fromNode,
          toNode: edge.toNode,
          label: typeof edge.label === 'string' ? edge.label : undefined,
        })),
      };

      // Call LLM service
      const llmService = new LLMService(this.settings.llm);
      const analysisResponse = await llmService.analyzeCanvas(analysisRequest);

      // Apply semantic IDs to canvas
      const updatedCanvas = this.applySemanticIds(parsed, analysisResponse);
      
      // Add taxonomy metadata if provided
      if (analysisResponse.taxonomy) {
        updatedCanvas._taxonomy = analysisResponse.taxonomy;
      }

      const serialized = JSON.stringify(updatedCanvas, null, 2) + '\n';
      await this.app.vault.modify(file, serialized);

      const nodeCount = Object.keys(analysisResponse.node_assignments).length;
      const taxonomyInfo = analysisResponse.taxonomy 
        ? ` with ${Object.keys(analysisResponse.taxonomy).length} taxonomy types`
        : ' with generic IDs';
      
      new Notice(`Assigned semantic IDs to ${nodeCount} nodes${taxonomyInfo}`);
    } catch (error) {
      console.error('Semantic ID assignment failed:', error);
      new Notice(
        `Semantic ID assignment failed${error instanceof Error ? `: ${error.message}` : ''}`
      );
    }
  }

  private applySemanticIds(canvas: CanvasData, response: SemanticAnalysisResponse): CanvasData {
    const updatedCanvas: CanvasData = { ...canvas };
    
    // Create mapping for validation
    const nodeIdMapping = new Map<string, string>();
    for (const [originalId, assignment] of Object.entries(response.node_assignments)) {
      nodeIdMapping.set(originalId, assignment.id);
    }

    // Update node IDs and colors
    if (updatedCanvas.nodes && Array.isArray(updatedCanvas.nodes)) {
      updatedCanvas.nodes = updatedCanvas.nodes.map((node) => {
        const assignment = response.node_assignments[node.id];
        if (assignment) {
          const updatedNode: CanvasNode = { ...node, id: assignment.id };
          if (assignment.color) {
            updatedNode.color = assignment.color;
          }
          return updatedNode;
        }
        return node;
      });
    }

    // Update edge IDs and references with validation
    if (updatedCanvas.edges && Array.isArray(updatedCanvas.edges)) {
      updatedCanvas.edges = updatedCanvas.edges.map((edge) => {
        const updatedEdge = { ...edge };
        
        // Update edge ID if provided
        const edgeAssignment = response.edge_assignments?.[edge.id];
        if (edgeAssignment) {
          updatedEdge.id = edgeAssignment.id;
          if (edgeAssignment.color) {
            updatedEdge.color = edgeAssignment.color;
          }
        }
        
        // Update fromNode reference
        const assignment = response.node_assignments[edge.fromNode];
        if (assignment) {
          updatedEdge.fromNode = assignment.id;
        } else if (!nodeIdMapping.has(edge.fromNode)) {
          console.warn(`Edge ${edge.id} references unknown fromNode: ${edge.fromNode}`);
        }
        
        // Update toNode reference
        const toAssignment = response.node_assignments[edge.toNode];
        if (toAssignment) {
          updatedEdge.toNode = toAssignment.id;
        } else if (!nodeIdMapping.has(edge.toNode)) {
          console.warn(`Edge ${edge.id} references unknown toNode: ${edge.toNode}`);
        }
        
        return updatedEdge;
      });
    }

    // Validate graph connectivity after ID updates
    this.validateGraphConnectivity(updatedCanvas);

    return updatedCanvas;
  }

  private validateGraphConnectivity(canvas: CanvasData): void {
    if (!canvas.nodes || !canvas.edges) return;

    const nodeIds = new Set(canvas.nodes.map((node) => node.id));
    const invalidEdges: string[] = [];

    for (const edge of canvas.edges) {
      if (!nodeIds.has(edge.fromNode)) {
        invalidEdges.push(`${edge.id} -> invalid fromNode: ${edge.fromNode}`);
      }
      if (!nodeIds.has(edge.toNode)) {
        invalidEdges.push(`${edge.id} -> invalid toNode: ${edge.toNode}`);
      }
    }

    if (invalidEdges.length > 0) {
      console.error('Graph connectivity validation failed:', invalidEdges);
      throw new Error(`Graph connectivity broken: ${invalidEdges.length} invalid edge references`);
    }
  }

  private async compileFile(file: TFile, showNotice: boolean) {
    if (this.isCompiling) return;
    this.isCompiling = true;

    try {
      const raw = await this.app.vault.read(file);
      const parsed = parseCanvasData(raw);
      const output = compileCanvasAll({
        input: parsed,
        settings: {
          colorSortNodes: this.settings.colorSortNodes,
          colorSortEdges: this.settings.colorSortEdges,
          flowSortNodes: this.settings.flowSortNodes,
          semanticSortOrphans: this.settings.semanticSortOrphans,
        },
      });
      const serialized = JSON.stringify(output, null, 2) + '\n';

      if (serialized === raw) {
        if (showNotice) {
          new Notice('Canvas already compiled');
        }
        return;
      }

      await this.app.vault.modify(file, serialized);

      if (showNotice) {
        new Notice('Canvas compiled');
      }
    } catch (error) {
      console.error(error);
      if (showNotice) {
        new Notice(
          `Canvas compilation failed${error instanceof Error ? `: ${error.message}` : ''}`
        );
      }
    } finally {
      this.isCompiling = false;
    }
  }
}

function parseCanvasData(raw: string): CanvasData {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error('Invalid canvas JSON');
  }

  const nodesRaw = parsed.nodes;
  const edgesRaw = parsed.edges;

  const nodes = Array.isArray(nodesRaw) ? nodesRaw.map(toCanvasNode).filter(isNonNull) : [];
  const edges = Array.isArray(edgesRaw) ? edgesRaw.map(toCanvasEdge).filter(isNonNull) : [];

  return { ...parsed, nodes, edges };
}

function toCanvasNode(value: unknown): CanvasNode | null {
  if (!isRecord(value)) return null;
  const id = value.id;
  const type = value.type;
  if (typeof id !== 'string' || typeof type !== 'string') return null;
  return value as CanvasNode;
}

function toCanvasEdge(value: unknown): CanvasEdge | null {
  if (!isRecord(value)) return null;
  const id = value.id;
  const fromNode = value.fromNode;
  const toNode = value.toNode;
  if (typeof id !== 'string' || typeof fromNode !== 'string' || typeof toNode !== 'string') return null;
  return value as CanvasEdge;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}
