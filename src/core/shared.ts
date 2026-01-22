import type { CanvasEdge, CanvasNode } from './types';

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function normalizedId(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

export function getNodeSortKey(node: CanvasNode): string {
  const type = node?.type;

  if (type === 'text' && typeof node.text === 'string') {
    return node.text.toLowerCase().trim();
  }

  if (type === 'file' && typeof node.file === 'string') {
    const filename = node.file.split('/').pop() || node.file;
    return filename.toLowerCase().trim();
  }

  if (type === 'link' && typeof node.url === 'string') {
    return node.url.toLowerCase().trim();
  }

  if (type === 'group' && typeof node.label === 'string') {
    return node.label.toLowerCase().trim();
  }

  return normalizedId(node?.id).toLowerCase();
}

export function getNodeTypePriority(node: CanvasNode): number {
  const type = node?.type;
  if (type === 'link') return 1;
  return 0;
}

export function getNodeColor(node: CanvasNode): string {
  const color = node?.color;
  if (typeof color === 'string') {
    return color.toLowerCase();
  }
  return '';
}

export function getEdgeColor(edge: CanvasEdge): string {
  const color = edge?.color;
  if (typeof color === 'string') {
    return color.toLowerCase();
  }
  return '';
}

export function isDirectionalEdge(edge: CanvasEdge): boolean {
  const fromEnd = edge?.fromEnd;
  const toEnd = edge?.toEnd;
  if (fromEnd === 'arrow' || toEnd === 'arrow') return true;
  if (toEnd === undefined && fromEnd !== 'arrow') return true;
  return false;
}

export function isContainedBy(node: CanvasNode, group: CanvasNode): boolean {
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

export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: number;
  let s: number;
  const l = (max + min) / 2;

  if (max === min) {
    h = 0;
    s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        h = 0;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

export function hslToHex(h: number, s: number, l: number): string {
  let hue = h / 360;
  let sat = s / 100;
  let light = l / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  let r: number;
  let g: number;
  let b: number;
  if (sat === 0) {
    r = g = b = light;
  } else {
    const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
    const p = 2 * light - q;
    r = hue2rgb(p, q, hue + 1 / 3);
    g = hue2rgb(p, q, hue);
    b = hue2rgb(p, q, hue - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function mutateColor(hex: string, hueShift: number, satMult: number, lightMult: number): string {
  let [h, s, l] = hexToHsl(hex);

  h = (h + hueShift) % 360;
  if (h < 0) h += 360;

  s = Math.max(0, Math.min(100, s * satMult));
  l = Math.max(0, Math.min(100, l * lightMult));

  return hslToHex(h, s, l);
}

export function generateRainbowGradient(count: number): string[] {
  const colors: string[] = [];
  const baseHues = [0, 30, 60, 120, 180, 240, 300];

  for (let i = 0; i < count; i++) {
    const hueIndex = i % baseHues.length;
    const cyclePosition = Math.floor(i / baseHues.length);

    const hueVariation = cyclePosition * 15;
    const baseHue = baseHues[hueIndex] ?? 0;
    const finalHue = (baseHue + hueVariation) % 360;

    const saturation = 65 + (i % 3) * 10;
    const lightness = 70 + (i % 4) * 5;

    colors.push(hslToHex(finalHue, saturation, lightness));
  }

  return colors;
}

export function generateHierarchicalColors(baseColor: string, depth: number): string[] {
  const colors = [baseColor];

  for (let i = 1; i <= depth; i++) {
    const hueShift = i * 25;
    const satReduction = 0.85 - i * 0.1;
    const lightIncrease = 1.1 + i * 0.05;

    const mutatedColor = mutateColor(baseColor, hueShift, satReduction, lightIncrease);
    colors.push(mutatedColor);
  }

  return colors;
}
