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

export interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
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
  taxonomy?: Record<string, string>;  // Optional: type_name -> description
  node_ids: Record<string, string>;   // original_id -> semantic_id
  edge_ids?: Record<string, string>;  // original_id -> semantic_id (optional)
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

    return `You are analyzing a Canvas diagram to assign semantic IDs and infer a taxonomy. 

CANVAS CONTENT:

NODES:
${nodeDescriptions}

EDGES:
${edgeDescriptions}

TASK:
1. Analyze the content and relationships to infer a coherent taxonomy (optional)
2. Assign semantic IDs in the format: type::variant::hash (e.g., "concept::machine-learning::a1b2", "process::data-analysis::c3d4")
3. Ensure all IDs are unique and follow kebab-case naming

RESPONSE FORMAT (JSON only, no explanation):
{
  "taxonomy": {
    "concept": "Core ideas and knowledge",
    "process": "Actions and workflows",
    "resource": "Files and references"
  },
  "node_ids": {
    "original-id-1": "concept::machine-learning::a1b2",
    "original-id-2": "process::data-analysis::c3d4"
  },
  "edge_ids": {
    "edge-id-1": "relation::depends-on::e5f6"
  }
}

If you cannot infer a meaningful taxonomy, omit the "taxonomy" field and use generic semantic IDs like "node::content-summary::hash".

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
      
      const data = response.json;
      if (data.content && data.content[0] && data.content[0].text) {
        return data.content[0].text;
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

    const data: LLMResponse = response.json;
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid LLM response format');
    }

    return data.choices[0].message.content;
  }

  private parseAnalysisResponse(llmResponse: string, request: SemanticAnalysisRequest): SemanticAnalysisResponse {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.node_ids || typeof parsed.node_ids !== 'object') {
        throw new Error('Invalid node_ids in LLM response');
      }

      // Ensure all original node IDs are mapped
      const originalNodeIds = new Set(request.nodes.map(n => n.id));
      const mappedNodeIds = new Set(Object.keys(parsed.node_ids));
      
      for (const originalId of originalNodeIds) {
        if (!mappedNodeIds.has(originalId)) {
          // Generate fallback ID for missing mappings
          parsed.node_ids[originalId] = this.generateFallbackId(originalId);
        }
      }

      // Validate semantic ID format and uniqueness
      const semanticIds = new Set<string>();
      for (const [originalId, semanticId] of Object.entries(parsed.node_ids)) {
        if (typeof semanticId !== 'string' || !this.isValidSemanticId(semanticId)) {
          // Replace invalid IDs with fallback
          parsed.node_ids[originalId] = this.generateFallbackId(originalId);
        } else if (semanticIds.has(semanticId)) {
          // Handle duplicate IDs
          parsed.node_ids[originalId] = this.generateFallbackId(originalId);
        } else {
          semanticIds.add(semanticId);
        }
      }

      return {
        taxonomy: parsed.taxonomy,
        node_ids: parsed.node_ids,
        edge_ids: parsed.edge_ids || {}
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return this.generateFallbackResponse(request);
    }
  }

  private generateFallbackResponse(request: SemanticAnalysisRequest): SemanticAnalysisResponse {
    const node_ids: Record<string, string> = {};
    
    // Generate sequential kebab-case IDs
    request.nodes.forEach((node, index) => {
      const paddedIndex = (index + 1).toString().padStart(3, '0');
      node_ids[node.id] = `node-${paddedIndex}`;
    });

    const edge_ids: Record<string, string> = {};
    request.edges.forEach((edge, index) => {
      const paddedIndex = (index + 1).toString().padStart(3, '0');
      edge_ids[edge.id] = `edge-${paddedIndex}`;
    });

    return {
      node_ids,
      edge_ids
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