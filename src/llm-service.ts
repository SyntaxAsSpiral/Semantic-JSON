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
    const llmResponse = await this.callLLM(prompt);
    return this.parseAnalysisResponse(llmResponse, request);
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
1. Analyze the content and relationships to infer a coherent taxonomy that fits THIS canvas domain
2. Assign semantic IDs in the format: type::variant::hash (e.g., "concept::machine-learning::a1b2", "process::data-analysis::c3d4")
3. Assign colors to nodes based on their taxonomy type using Canvas color values (1, 2, 3, 4, 5, 6)
4. Ensure all IDs are unique and follow kebab-case naming

DOMAIN FIT REQUIREMENT:
- The taxonomy must reflect the actual content and structure in this canvas.
- Avoid defaulting to generic buckets like "concept/process/resource" unless they are clearly the best fit.
- If the canvas is a website map (nodes are HTML pages, edges are links), your taxonomy should use types like "page", "section", "link", "nav", "hub", "external", etc.
- If the canvas is a species catalog, your taxonomy should use types like "species", "overview", "habitat", "conservation", "reference", etc.

COLOR PALETTE (Canvas color index -> meaning):
6 - purple
5 - cyan
4 - green
3 - yellow
2 - orange
1 - red

Assign colors semantically based on the meanings above. Use a variety of colors when multiple taxonomy types exist, and avoid defaulting all nodes to a single color.
Avoid assigning the same color to every taxonomy type; reserve red (1) for warnings/alerts or negative/critical concepts unless the canvas is explicitly about danger or errors.

RESPONSE FORMAT (JSON only, no explanation):
{
  "taxonomy": {
    "{{type_name}}": {
      "description": "{{type_description}}",
      "color": "{{color_index}}"
    }
  },
  "node_assignments": {
    "{{original_node_id}}": {
      "id": "{{semantic_node_id}}",
      "color": "{{color_index}}"
    }
  },
  "edge_assignments": {
    "{{original_edge_id}}": {
      "id": "{{semantic_edge_id}}",
      "color": "{{color_index}}"
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
    const isOpenAiCompatible = this.settings.provider === 'ollama' || this.settings.provider === 'lmstudio';
    const url = isOpenAiCompatible
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
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!isRecord(parsed)) {
      throw new Error('Invalid JSON object in LLM response');
    }
    
    const nodeAssignments = parseNodeAssignments(parsed);
    if (!nodeAssignments) {
      throw new Error('Invalid node assignments in LLM response');
    }

    const originalNodeIds = new Set(request.nodes.map((n) => n.id));
    const mappedNodeIds = new Set(Object.keys(nodeAssignments));
    
    for (const originalId of originalNodeIds) {
      if (!mappedNodeIds.has(originalId)) {
        throw new Error(`Missing semantic ID assignment for node: ${originalId}`);
      }
    }

    const semanticIds = new Set<string>();
    for (const [originalId, assignment] of Object.entries(nodeAssignments)) {
      if (typeof assignment.id !== 'string' || !this.isValidSemanticId(assignment.id)) {
        throw new Error(`Invalid semantic ID for node: ${originalId}`);
      }
      if (semanticIds.has(assignment.id)) {
        throw new Error(`Duplicate semantic ID detected: ${assignment.id}`);
      }
      semanticIds.add(assignment.id);
    }

    const edgeAssignments = parseEdgeAssignments(parsed);

    return {
      taxonomy: parseTaxonomy(parsed.taxonomy),
      node_assignments: nodeAssignments,
      edge_assignments: edgeAssignments
    };
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
