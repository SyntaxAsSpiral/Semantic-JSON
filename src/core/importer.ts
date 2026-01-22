import type { CanvasData, CanvasNode, CanvasEdge } from './types';
import { generateRainbowGradient, generateHierarchicalColors } from './shared';

const LAYOUT = {
  cols: 6,
  colSpacing: 480,
  cardWidth: 440,
  nodeWidth: 400,
  nodeHeight: 60,
  cardGap: 100,
  groupPadding: 20,
  headerHeight: 80,
};

interface CardField {
  key?: string;
  value: unknown;
}

interface Card {
  label: string;
  fields: CardField[];
  height: number;
}

function createCard(label: string, fields: CardField[], estimatedHeight: number | null = null): Card {
  const height = estimatedHeight ?? estimateCardHeight(fields);
  return { label, fields, height };
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '[Unserializable]';
  }
}

function stringifyScalar(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'symbol') {
    return value.description ? `Symbol(${value.description})` : 'Symbol';
  }
  if (typeof value === 'function') {
    return value.name ? `[Function: ${value.name}]` : '[Function]';
  }
  return safeJsonStringify(value);
}

function stringifyForHeight(value: unknown): string {
  if (typeof value === 'object' && value !== null) return safeJsonStringify(value);
  return stringifyScalar(value);
}

function estimateNodeHeight(text: string): number {
  const lines = text.split('\n');
  let height = 50;

  for (const line of lines) {
    if (line.startsWith('# ')) height += 60;
    else if (line.startsWith('## ')) height += 50;
    else if (line.startsWith('### ') || line.startsWith('#### ')) height += 45;
    else if (line.includes('![')) height += 120;
    else if (line.startsWith('```')) height += 25;
    else if (line.startsWith('>')) height += 40;
    else if (line.match(/^[-*+]|\d+\./)) height += 35;
    else if (line.trim() === '') height += 20;
    else height += 38;
  }

  return Math.max(LAYOUT.nodeHeight, height);
}

function estimateCardHeight(fields: CardField[]): number {
  if (!fields || fields.length === 0) return 150;

  let totalHeight = LAYOUT.headerHeight + LAYOUT.groupPadding * 2;

  for (const field of fields) {
    const text = formatFieldForHeight(field);
    totalHeight += estimateNodeHeight(text) + 10;
  }

  return totalHeight;
}

function formatFieldForHeight(field: CardField): string {
  const text = field.key
    ? `**${field.key}**: ${stringifyForHeight(field.value)}`
    : stringifyForHeight(field.value);
  return text;
}

function solitaireLayout(cards: Card[], rainbowColors: string[]): CanvasData {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  let idCounter = 0;
  const generateId = () => `imported-${(idCounter++).toString(16).padStart(16, '0')}`;

  const columnBottoms = Array.from({ length: LAYOUT.cols }, () => 0);

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (!card) continue;
    const col = i % LAYOUT.cols;
    const x = col * LAYOUT.colSpacing;
    const y = columnBottoms[col] ?? 0;

    const baseColor = rainbowColors[i % rainbowColors.length] ?? '#ffffff';
    const hierarchicalColors = generateHierarchicalColors(baseColor, 3);

    const childNodes: CanvasNode[] = [];
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

    const groupHeight = nodeY - y + LAYOUT.groupPadding;

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

    nodes.push(...childNodes);

    columnBottoms[col] = y + groupHeight + LAYOUT.cardGap;
  }

  return { nodes, edges };
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return stringifyScalar(value);
  if (typeof value === 'string') return value.includes('\n') ? value : `"${value}"`;
  if (typeof value === 'object') return `\`\`\`json\n\n\`\`\`\n${safeJsonStringify(value)}`;
  return stringifyScalar(value);
}

function parseJsonl(content: string): Card[] {
  const lines = content.trim().split('\n').filter((line) => line.trim());
  const cards: Card[] = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const line = lines[i];
      if (line === undefined) continue;
      const obj = parseJson(line);
      const fields = objectToFields(obj);
      cards.push(createCard(`Record ${i + 1}`, fields));
    } catch (err) {
      throw new Error(`Invalid JSON on line ${i + 1}: ${(err as Error).message}`);
    }
  }

  return cards;
}

function parseStructuredJson(data: unknown): Card[] {
  const cards: Card[] = [];

  if (Array.isArray(data)) {
    const list = data as unknown[];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const label = extractLabel(item, i);
      const fields = objectToFields(item);
      cards.push(createCard(label, fields));
    }
  } else if (typeof data === 'object' && data !== null) {
    const entries = Object.entries(data as Record<string, unknown>);
    const hasArrays = entries.some(([, v]) => Array.isArray(v));

    if (hasArrays) {
      for (const [sectionName, sectionData] of entries) {
        if (Array.isArray(sectionData)) {
          const list = sectionData as unknown[];
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const label = extractLabel(item, i, sectionName);
            const fields = objectToFields(item);
            cards.push(createCard(label, fields));
          }
        } else {
          const fields = [{ key: sectionName, value: sectionData }];
          cards.push(createCard(sectionName, fields));
        }
      }
    } else {
      const fields = objectToFields(data);
      cards.push(createCard('Object', fields));
    }
  } else {
    cards.push(createCard('Value', [{ value: data }]));
  }

  return cards;
}

function parsePureCanvas(data: unknown): Card[] {
  const sourceNodes = Array.isArray((data as { nodes?: unknown[] })?.nodes)
    ? ((data as { nodes?: unknown[] }).nodes as Array<Record<string, unknown>>)
    : [];
  const cards: Card[] = [];

  for (let i = 0; i < sourceNodes.length; i++) {
    const node = sourceNodes[i] as Record<string, unknown>;
    const label =
      (typeof node.label === 'string' && node.label) ||
      (node.id !== undefined ? stringifyScalar(node.id) : `Node ${i + 1}`);
    const fields: CardField[] = [];

    if (node.id !== undefined) fields.push({ key: 'id', value: node.id });
    if (node.type !== undefined) fields.push({ key: 'type', value: node.type });
    if (node.label !== undefined) fields.push({ key: 'label', value: node.label });
    if (node.text !== undefined) fields.push({ key: 'text', value: node.text });

    for (const [key, value] of Object.entries(node)) {
      if (!['id', 'type', 'label', 'text', 'x', 'y', 'width', 'height', 'color'].includes(key)) {
        fields.push({ key, value });
      }
    }

    cards.push(createCard(label, fields));
  }

  return cards;
}

function objectToFields(obj: unknown): CardField[] {
  if (typeof obj !== 'object' || obj === null) {
    return [{ value: obj }];
  }

  const fields: CardField[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    fields.push({ key, value });
  }
  return fields;
}

function extractLabel(obj: unknown, index: number, sectionName: string | null = null): string {
  if (typeof obj !== 'object' || obj === null) {
    return sectionName ? `${sectionName} ${index + 1}` : `Item ${index + 1}`;
  }

  const labelFields = ['name', 'title', 'label', 'id', 'Name', 'Title', 'Label', 'ID'];
  for (const field of labelFields) {
    const value = (obj as Record<string, unknown>)[field];
    if (value && typeof value === 'string') {
      return sectionName ? `${sectionName}: ${value}` : value;
    }
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key.toLowerCase().includes('number') || key.toLowerCase().includes('index')) {
      const valueText = stringifyScalar(value);
      return sectionName ? `${sectionName} ${valueText}` : `${key}: ${valueText}`;
    }
  }

  return sectionName ? `${sectionName} ${index + 1}` : `Record ${index + 1}`;
}

function isPureCanvasExport(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const nodes = (data as { nodes?: unknown[] }).nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) return false;
  const first = nodes[0];
  if (typeof first !== 'object' || first === null) return false;
  return 'id' in (first as { id?: unknown }) && 'type' in (first as { type?: unknown });
}

export function importDataToCanvas(filePath: string, fileContent: string): CanvasData {
  const fileName = filePath.toLowerCase();
  const isPureCanvas = fileName.includes('.pure.json');

  let cards: Card[];

  if (fileName.endsWith('.jsonl')) {
    cards = parseJsonl(fileContent);
  } else {
    const data = parseJson(fileContent);

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

export function importJsonToCanvas(data: unknown): CanvasData {
  const cards = parseStructuredJson(data);
  const rainbowColors = generateRainbowGradient(cards.length);
  return solitaireLayout(cards, rainbowColors);
}

export function importJsonlToCanvas(jsonObjects: unknown[]): CanvasData {
  const cards = jsonObjects.map((obj, i) => {
    const label = extractLabel(obj, i);
    const fields = objectToFields(obj);
    return createCard(label, fields);
  });
  const rainbowColors = generateRainbowGradient(cards.length);
  return solitaireLayout(cards, rainbowColors);
}

export function importPureCanvasData(data: unknown): CanvasData {
  const cards = parsePureCanvas(data);
  const rainbowColors = generateRainbowGradient(cards.length);
  return solitaireLayout(cards, rainbowColors);
}

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown;
}
