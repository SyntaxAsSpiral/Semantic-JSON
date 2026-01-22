import fs from 'node:fs';
import path from 'node:path';
import { generateRainbowGradient, generateHierarchicalColors } from './shared.mjs';

// ============================================================================
// CONFIGURATION
// ============================================================================

const LAYOUT = {
  cols: 6,              // Number of columns for solitaire stacking
  colSpacing: 480,      // Horizontal spacing between columns
  cardWidth: 440,       // Width of each card/group
  nodeWidth: 400,       // Width of text nodes inside cards
  nodeHeight: 60,       // Base height of text nodes
  cardGap: 100,         // Vertical gap between cards in same column
  groupPadding: 20,     // Padding inside groups
  headerHeight: 80,     // Space for group label
};

// ============================================================================
// CARD STRUCTURE
// ============================================================================

/**
 * Create a card (intermediate representation before layout)
 * @param {string} label - Card title
 * @param {Array<{key?: string, value: string}>} fields - Key-value pairs or text content
 * @param {number} [estimatedHeight] - Override height estimation
 */
function createCard(label, fields, estimatedHeight = null) {
  const height = estimatedHeight ?? estimateCardHeight(fields);
  return { label, fields, height };
}

/**
 * Convert value to string for height estimation
 */
function stringifyForHeight(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/**
 * Estimate height for a single text node based on content
 * Accounts for markdown rendering: headers, images, code blocks take extra space
 * Obsidian Canvas renders markdown with generous line-height and spacing
 */
function estimateNodeHeight(text) {
  const lines = text.split('\n');
  let height = 50; // Base padding (top + bottom)

  for (const line of lines) {
    // Headers take significant vertical space with margins
    if (line.startsWith('# ')) height += 60;
    else if (line.startsWith('## ')) height += 50;
    else if (line.startsWith('### ') || line.startsWith('#### ')) height += 45;
    // Images render at full size - generous estimate
    else if (line.includes('![')) height += 120;
    // Code fences have padding and different font
    else if (line.startsWith('```')) height += 25;
    // Blockquotes have left border and padding
    else if (line.startsWith('>')) height += 40;
    // List items have bullet/number + content
    else if (line.match(/^[-*+]|\d+\./)) height += 35;
    // Empty lines create paragraph spacing
    else if (line.trim() === '') height += 20;
    // Regular lines - markdown renders at ~35-40px effective height
    else height += 38;
  }

  // Minimum height
  return Math.max(LAYOUT.nodeHeight, height);
}

/**
 * Estimate card height - will be recalculated during layout based on actual nodes
 */
function estimateCardHeight(fields) {
  if (!fields || fields.length === 0) return 150;

  let totalHeight = LAYOUT.headerHeight + LAYOUT.groupPadding * 2;

  for (const field of fields) {
    const text = formatFieldForHeight(field);
    totalHeight += estimateNodeHeight(text) + 10;
  }

  return totalHeight;
}

/**
 * Format a field for height estimation (matches formatValue but for estimation)
 */
function formatFieldForHeight(field) {
  const text = field.key
    ? `**${field.key}**: ${stringifyForHeight(field.value)}`
    : stringifyForHeight(field.value);
  return text;
}

// ============================================================================
// SOLITAIRE LAYOUT
// ============================================================================

/**
 * Apply solitaire-style layout: round-robin into columns, stack vertically
 * @param {Array<{label: string, fields: Array, height: number}>} cards
 * @param {string[]} rainbowColors - Pre-generated rainbow gradient
 * @returns {{nodes: Array, edges: Array}}
 */
function solitaireLayout(cards, rainbowColors) {
  const nodes = [];
  let idCounter = 0;
  const generateId = () => `imported-${(idCounter++).toString(16).padStart(16, '0')}`;

  // Track bottom Y position of each column
  const columnBottoms = Array(LAYOUT.cols).fill(0);

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const col = i % LAYOUT.cols;
    const x = col * LAYOUT.colSpacing;
    const y = columnBottoms[col];

    // Get colors for this card
    const baseColor = rainbowColors[i % rainbowColors.length];
    const hierarchicalColors = generateHierarchicalColors(baseColor, 3);

    // First pass: calculate actual node heights and positions
    const childNodes = [];
    let nodeY = y + LAYOUT.headerHeight;

    for (const field of card.fields) {
      const text = field.key
        ? `**${field.key}**: ${formatValue(field.value)}`
        : formatValue(field.value);

      const nodeHeight = estimateNodeHeight(text);

      childNodes.push({
        id: generateId(),
        type: 'text',
        text,
        x: x + LAYOUT.groupPadding,
        y: nodeY,
        width: LAYOUT.nodeWidth,
        height: nodeHeight,
        color: hierarchicalColors[1],
      });

      nodeY += nodeHeight + 10;
    }

    // Calculate group height to encompass all children with padding
    const groupHeight = (nodeY - y) + LAYOUT.groupPadding;

    // Create parent group with calculated height
    const groupId = generateId();
    nodes.push({
      id: groupId,
      type: 'group',
      label: card.label,
      x,
      y,
      width: LAYOUT.cardWidth,
      height: groupHeight,
      color: baseColor,
    });

    // Add child nodes
    nodes.push(...childNodes);

    // Update column bottom based on actual group height
    columnBottoms[col] = y + groupHeight + LAYOUT.cardGap;
  }

  return { nodes, edges: [] };
}

/**
 * Format a value for display
 * Objects get empty code fence for syntax hint, then JSON as plain text below
 */
function formatValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value.includes('\n') ? value : `"${value}"`;
  if (typeof value === 'object') return '```json\n\n```\n' + JSON.stringify(value, null, 2);
  return String(value);
}

// ============================================================================
// PARSERS: Each type produces cards
// ============================================================================

/**
 * Parse JSONL: each line is a card
 */
function parseJsonl(content) {
  const lines = content.trim().split('\n').filter(line => line.trim());
  const cards = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const obj = JSON.parse(lines[i]);
      const fields = objectToFields(obj);
      cards.push(createCard(`Record ${i + 1}`, fields));
    } catch (err) {
      throw new Error(`Invalid JSON on line ${i + 1}: ${err.message}`);
    }
  }

  return cards;
}

/**
 * Parse structured JSON: objects with named arrays become sections
 */
function parseStructuredJson(data) {
  const cards = [];

  if (Array.isArray(data)) {
    // Top-level array: each item is a card
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const label = extractLabel(item, i);
      const fields = objectToFields(item);
      cards.push(createCard(label, fields));
    }
  } else if (typeof data === 'object' && data !== null) {
    // Top-level object: check for array properties (sections)
    const entries = Object.entries(data);
    const hasArrays = entries.some(([, v]) => Array.isArray(v));

    if (hasArrays) {
      // Structured with sections: each array item becomes a card
      for (const [sectionName, sectionData] of entries) {
        if (Array.isArray(sectionData)) {
          for (let i = 0; i < sectionData.length; i++) {
            const item = sectionData[i];
            const label = extractLabel(item, i, sectionName);
            const fields = objectToFields(item);
            cards.push(createCard(label, fields));
          }
        } else {
          // Non-array property: single card
          const fields = [{ key: sectionName, value: sectionData }];
          cards.push(createCard(sectionName, fields));
        }
      }
    } else {
      // Simple object: one card with all properties
      const fields = objectToFields(data);
      cards.push(createCard('Object', fields));
    }
  } else {
    // Primitive: single card
    cards.push(createCard('Value', [{ value: data }]));
  }

  return cards;
}

/**
 * Parse pure Canvas JSON: nodes become cards
 */
function parsePureCanvas(data) {
  const sourceNodes = Array.isArray(data.nodes) ? data.nodes : [];
  const cards = [];

  for (let i = 0; i < sourceNodes.length; i++) {
    const node = sourceNodes[i];
    const label = node.label || node.id || `Node ${i + 1}`;
    const fields = [];

    // Extract semantic fields from node
    if (node.id) fields.push({ key: 'id', value: node.id });
    if (node.type) fields.push({ key: 'type', value: node.type });
    if (node.label) fields.push({ key: 'label', value: node.label });
    if (node.text) fields.push({ key: 'text', value: node.text });

    // Add any other properties
    for (const [key, value] of Object.entries(node)) {
      if (!['id', 'type', 'label', 'text', 'x', 'y', 'width', 'height', 'color'].includes(key)) {
        fields.push({ key, value });
      }
    }

    cards.push(createCard(label, fields));
  }

  return cards;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert object to fields array
 */
function objectToFields(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return [{ value: obj }];
  }

  const fields = [];
  for (const [key, value] of Object.entries(obj)) {
    fields.push({ key, value });
  }
  return fields;
}

/**
 * Extract a meaningful label from an object
 */
function extractLabel(obj, index, sectionName = null) {
  if (typeof obj !== 'object' || obj === null) {
    return sectionName ? `${sectionName} ${index + 1}` : `Item ${index + 1}`;
  }

  // Try common label fields
  const labelFields = ['name', 'title', 'label', 'id', 'Name', 'Title', 'Label', 'ID'];
  for (const field of labelFields) {
    if (obj[field] && typeof obj[field] === 'string') {
      return sectionName ? `${sectionName}: ${obj[field]}` : obj[field];
    }
  }

  // Try indexed fields like "Zone Number", "Mesh Number"
  for (const [key, value] of Object.entries(obj)) {
    if (key.toLowerCase().includes('number') || key.toLowerCase().includes('index')) {
      return sectionName ? `${sectionName} ${value}` : `${key}: ${value}`;
    }
  }

  return sectionName ? `${sectionName} ${index + 1}` : `Record ${index + 1}`;
}

/**
 * Detect if data is a Canvas export
 */
function isPureCanvasExport(data) {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray(data.nodes) &&
    data.nodes.length > 0 &&
    typeof data.nodes[0] === 'object' &&
    'id' in data.nodes[0] &&
    'type' in data.nodes[0]
  );
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Import any JSON/JSONL file to Canvas with solitaire layout
 */
export function importDataToCanvas(filePath, fileContent) {
  const fileName = filePath.toLowerCase();
  const isPureCanvas = fileName.includes('.pure.json');

  let cards;

  if (fileName.endsWith('.jsonl')) {
    cards = parseJsonl(fileContent);
  } else {
    const data = JSON.parse(fileContent);

    if (isPureCanvas || isPureCanvasExport(data)) {
      cards = parsePureCanvas(data);
    } else {
      cards = parseStructuredJson(data);
    }
  }

  if (cards.length === 0) {
    return { nodes: [], edges: [] };
  }

  const rainbowColors = generateRainbowGradient(cards.length);
  return solitaireLayout(cards, rainbowColors);
}

/**
 * Main import function with file I/O
 */
export function importFile({ inPath, outPath }) {
  const absIn = path.resolve(String(inPath ?? '').trim());
  const fileContent = fs.readFileSync(absIn, 'utf8');

  const canvas = importDataToCanvas(absIn, fileContent);

  const stem = path.basename(absIn).replace(/\.(json|jsonl)$/i, '');
  const absOut = String(outPath ?? '').trim() || path.resolve(path.dirname(absIn), `${stem}.canvas`);

  const serialized = JSON.stringify(canvas, null, 2) + '\n';
  fs.writeFileSync(absOut, serialized, 'utf8');

  return {
    inPath: absIn,
    outPath: absOut,
    cardsProcessed: canvas.nodes.filter(n => n.type === 'group').length,
    nodesOut: canvas.nodes.length,
    edgesOut: canvas.edges.length,
  };
}

// Keep legacy exports for backwards compatibility
export const importJsonToCanvasEnhanced = (data) => {
  const cards = parseStructuredJson(data);
  const rainbowColors = generateRainbowGradient(cards.length);
  return solitaireLayout(cards, rainbowColors);
};

export const importJsonlToCanvasEnhanced = (jsonObjects) => {
  const cards = jsonObjects.map((obj, i) => {
    const label = extractLabel(obj, i);
    const fields = objectToFields(obj);
    return createCard(label, fields);
  });
  const rainbowColors = generateRainbowGradient(cards.length);
  return solitaireLayout(cards, rainbowColors);
};

export const importPureCanvasDataCLI = (data) => {
  const cards = parsePureCanvas(data);
  const rainbowColors = generateRainbowGradient(cards.length);
  return solitaireLayout(cards, rainbowColors);
};

// Legacy file-specific imports (delegate to main function)
export const importJsonFile = importFile;
export const importJsonlFile = importFile;
