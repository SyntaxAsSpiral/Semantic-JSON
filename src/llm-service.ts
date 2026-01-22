import { requestUrl } from 'obsidian';
import { LLMSettings } from './settings';

export interface LLMRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

export interface SemanticAnalysisRequest {
  nodes: Array<{
    id: string;
    type: string;
    text?: string;
    file?: string;
    url?: string;
    label?: string;
  }>;
  edges: Array<{
    id: string;
    fromNode: string;
    toNode: string;
    label?: string;
  }>;
}

export interface SemanticAnalysisResponse {
  taxonomy?: Record<string, {
    description: string;
    color: string;
  }>;
  node_assignments: Record<string, {
    id: string;
    color: string;
  }>;
  edge_assignments?: Record<string, {
    id: string;
    color?: string;
  }>;
}

export class LLMService {
  constructor(private settings: LLMSettings) {}

  async analyzeCanvas(request: SemanticAnalysisRequest): Promise<SemanticAnalysisResponse> {
    if (!this.settings.enabled) {
      throw new Error('LLM features are disabled');
    }

    const prompt = this.buildAnalysisPrompt(request);
    
    try {
      const llmResponse = await this.callLLM(prompt);
      return this.parseAnalysisResponse(llmResponse, request);
    } catch (error) {
      console.error('LLM analysis failed:', error);
      // Fallback to generic kebab-case IDs
      return this.generateFallbackResponse(request);
    }
  }

  private buildAnalysisPrompt(request: SemanticAnalysisRequest): string {
    const nodeDescriptions = request.nodes.map(node => {
      let content = `ID: ${node.id}, Type: ${node.type}`;
      if (node.text) content += `, Text: "${node.text}"`;
      if (node.file) content += `, File: "${node.file}"`;
      if (node.url) content += `, URL: "${node.url}"`;
      if (node.label) content += `, Label: "${node.label}"`;
      return content;
    }).join('\n');

    const edgeDescriptions = request.edges.map(edge => {
      let content = `ID: ${edge.id}, From: ${edge.fromNode}, To: ${edge.toNode}`;
      if (edge.label) content += `, Label: "${edge.label}"`;
      return content;
    }).join('\n');

    return `You are analyzing a Canvas diagram to assign semantic IDs, infer a taxonomy, and assign colors based on types.

CANVAS CONTENT:

NODES:
${nodeDescriptions}

EDGES:
${edgeDescriptions}

TASK:
1. Analyze the content and relationships to infer a coherent taxonomy
2. Assign semantic IDs in the format: type::variant::hash (e.g., "concept::machine-learning::a1b2", "process::data-analysis::c3d4")
3. Assign colors to nodes based on their taxonomy type using Canvas color values (1, 2, 3, 4, 5, 6)
4. Ensure all IDs are unique and follow kebab-case naming

RESPONSE FORMAT (JSON only, no explanation):
{
  "taxonomy": {
    "concept": {
      "description": "Core ideas and knowledge",
      "color": "1"
    },
    "process": {
      "description": "Actions and workflows", 
      "color": "2"
    },
    "resource": {
      "description": "Files and references",
      "color": "3"
    }
  },
  "node_assignments": {
    "original-id-1": {
      "id": "concept::machine-learning::a1b2",
      "color": "1"
    },
    "original-id-2": {
      "id": "process::data-analysis::c3d4", 
      "color": "2"
    }
  },
  "edge_assignments": {
    "edge-id-1": {
      "id": "relation::depends-on::e5f6",
      "color": "4"
    }
  }
}

Use colors 1-6 consistently for taxonomy types. If you cannot infer a meaningful taxonomy, omit the "taxonomy" field and use generic semantic IDs with default colors.

Respond with valid JSON only:`;
  }

  private async callLLM(prompt: string): Promise<string> {
    const requestBody: LLMRequest = {
      model: this.settings.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent output
    };

    // Add max_tokens for providers that support it (not Anthropic)
    if (this.settings.provider !== 'anthropic') {
      requestBody.max_tokens = 4000;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication headers for cloud providers
    if (this.settings.provider === 'openai') {
      headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
    } else if (this.settings.provider === 'anthropic') {
      headers['x-api-key'] = this.settings.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      // Anthropic uses different request format
      const anthropicRequest = {
        model: this.settings.model,
        max_tokens: 4000,
        messages: requestBody.messages
      };
      const response = await requestUrl({
        url: `${this.settings.baseUrl}/v1/messages`,
        method: 'POST',
        headers,
        body: JSON.stringify(anthropicRequest),
      });

      const data = response.json as unknown;
      const content = extractAnthropicContent(data);
      if (content) {
        return content;
      }
      throw new Error('Invalid Anthropic response format');
    } else if (this.settings.provider === 'openrouter') {
      headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
      headers['HTTP-Referer'] = 'https://obsidian.md';
      headers['X-Title'] = 'Semantic JSON Canvas Plugin';
    }

    // Standard OpenAI-compatible request for most providers
    const url = this.settings.provider === 'ollama' 
      ? `${this.settings.baseUrl}/v1/chat/completions`
      : `${this.settings.baseUrl}/chat/completions`;

    const response = await requestUrl({
      url,
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const data = response.json as unknown;
    const content = extractOpenAiContent(data);
    if (!content) {
      throw new Error('Invalid LLM response format');
    }

    return content;
  }

  private parseAnalysisResponse(llmResponse: string, request: SemanticAnalysisRequest): SemanticAnalysisResponse {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      if (!isRecord(parsed)) {
        throw new Error('Invalid JSON object in LLM response');
      }
      
      // Handle both new format (node_assignments) and legacy format (node_ids)
      const nodeAssignments = parseNodeAssignments(parsed);
      if (!nodeAssignments) {
        throw new Error('Invalid node assignments in LLM response');
      }

      // Ensure all original node IDs are mapped
      const originalNodeIds = new Set(request.nodes.map(n => n.id));
      const mappedNodeIds = new Set(Object.keys(nodeAssignments));
      
      for (const originalId of originalNodeIds) {
        if (!mappedNodeIds.has(originalId)) {
          // Generate fallback assignment for missing mappings
          nodeAssignments[originalId] = {
            id: this.generateFallbackId(originalId),
            color: '1'
          };
        }
      }

      // Validate semantic ID format and uniqueness
      const semanticIds = new Set<string>();
      for (const [originalId, assignment] of Object.entries(nodeAssignments)) {
        if (typeof assignment.id !== 'string' || !this.isValidSemanticId(assignment.id)) {
          // Replace invalid IDs with fallback
          nodeAssignments[originalId] = {
            id: this.generateFallbackId(originalId),
            color: assignment.color || '1'
          };
        } else if (semanticIds.has(assignment.id)) {
          // Handle duplicate IDs
          nodeAssignments[originalId] = {
            id: this.generateFallbackId(originalId),
            color: assignment.color || '1'
          };
        } else {
          semanticIds.add(assignment.id);
        }
      }

      // Handle edge assignments
      const edgeAssignments = parseEdgeAssignments(parsed);

      return {
        taxonomy: parseTaxonomy(parsed.taxonomy),
        node_assignments: nodeAssignments,
        edge_assignments: edgeAssignments
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return this.generateFallbackResponse(request);
    }
  }

  private generateFallbackResponse(request: SemanticAnalysisRequest): SemanticAnalysisResponse {
    const node_assignments: Record<string, { id: string; color: string }> = {};
    
    // Generate sequential kebab-case IDs with default colors
    request.nodes.forEach((node, index) => {
      const paddedIndex = (index + 1).toString().padStart(3, '0');
      node_assignments[node.id] = {
        id: `node-${paddedIndex}`,
        color: '1' // Default color
      };
    });

    const edge_assignments: Record<string, { id: string; color?: string }> = {};
    request.edges.forEach((edge, index) => {
      const paddedIndex = (index + 1).toString().padStart(3, '0');
      edge_assignments[edge.id] = {
        id: `edge-${paddedIndex}`
      };
    });

    return {
      node_assignments,
      edge_assignments
    };
  }

  private generateFallbackId(originalId: string): string {
    // Create a simple hash from the original ID
    let hash = 0;
    for (let i = 0; i < originalId.length; i++) {
      const char = originalId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    const hashStr = Math.abs(hash).toString(16).substring(0, 4);
    return `node-${hashStr}`;
  }

  private isValidSemanticId(id: string): boolean {
    // Check if ID follows semantic format (type::variant::hash or simple kebab-case)
    const semanticPattern = /^[a-z][a-z0-9-]*(::[a-z][a-z0-9-]*)*$/;
    return semanticPattern.test(id);
  }
}

function extractOpenAiContent(data: unknown): string | null {
  if (!isRecord(data)) return null;
  const choices = data.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const list = choices as unknown[];
  const firstChoice = list[0];
  if (!isRecord(firstChoice)) return null;
  const message = firstChoice.message;
  if (!isRecord(message)) return null;
  const content = message.content;
  return typeof content === 'string' ? content : null;
}

function extractAnthropicContent(data: unknown): string | null {
  if (!isRecord(data)) return null;
  const content = data.content;
  if (!Array.isArray(content) || content.length === 0) return null;
  const list = content as unknown[];
  const first = list[0];
  if (!isRecord(first)) return null;
  const text = first.text;
  return typeof text === 'string' ? text : null;
}

function parseNodeAssignments(parsed: Record<string, unknown>): Record<string, { id: string; color: string }> | null {
  const assignments: Record<string, { id: string; color: string }> = {};

  const nodeAssignments = parsed.node_assignments;
  if (isRecord(nodeAssignments)) {
    for (const [originalId, assignmentValue] of Object.entries(nodeAssignments)) {
      if (!isRecord(assignmentValue)) continue;
      const id = getString(assignmentValue.id);
      if (!id) continue;
      const color = getString(assignmentValue.color) ?? '1';
      assignments[originalId] = { id, color };
    }
    if (Object.keys(assignments).length > 0) {
      return assignments;
    }
  }

  const nodeIds = parsed.node_ids;
  if (isRecord(nodeIds)) {
    for (const [originalId, semanticId] of Object.entries(nodeIds)) {
      const id = getString(semanticId);
      if (!id) continue;
      assignments[originalId] = { id, color: '1' };
    }
  }

  return Object.keys(assignments).length > 0 ? assignments : null;
}

function parseEdgeAssignments(parsed: Record<string, unknown>): Record<string, { id: string; color?: string }> | undefined {
  const assignments: Record<string, { id: string; color?: string }> = {};

  const edgeAssignments = parsed.edge_assignments;
  if (isRecord(edgeAssignments)) {
    for (const [originalId, assignmentValue] of Object.entries(edgeAssignments)) {
      if (!isRecord(assignmentValue)) continue;
      const id = getString(assignmentValue.id);
      if (!id) continue;
      const color = getString(assignmentValue.color) ?? undefined;
      assignments[originalId] = color ? { id, color } : { id };
    }
    if (Object.keys(assignments).length > 0) {
      return assignments;
    }
  }

  const edgeIds = parsed.edge_ids;
  if (isRecord(edgeIds)) {
    for (const [originalId, semanticId] of Object.entries(edgeIds)) {
      const id = getString(semanticId);
      if (!id) continue;
      assignments[originalId] = { id };
    }
  }

  return Object.keys(assignments).length > 0 ? assignments : undefined;
}

function parseTaxonomy(value: unknown): SemanticAnalysisResponse['taxonomy'] | undefined {
  if (!isRecord(value)) return undefined;
  const taxonomy: NonNullable<SemanticAnalysisResponse['taxonomy']> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const description = getString(entry.description);
    const color = getString(entry.color);
    if (!description || !color) continue;
    taxonomy[key] = { description, color };
  }

  return Object.keys(taxonomy).length > 0 ? taxonomy : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
