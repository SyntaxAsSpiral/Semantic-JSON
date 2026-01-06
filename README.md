# Semantic JSON

Visual-semantic grammar for Canvas, adds 4 visuospatial primitives create shared language between human spatial authoring and AI semantic generation. Compiles to deterministic JSON readable and writable by both.

## What is JSON Canvas?

[JSON Canvas](https://jsoncanvas.org/) is an open file format for infinite canvas data, originally developed for Obsidian Canvas. It promotes longevity, readability, interoperability, and extensibility using the `.canvas` extension and a simple JSON structure with nodes and edges. Infinite canvas tools organize information **spatially** like a digital whiteboard.

## Why This Plugin?

Canvas is a visual authoring tool for structured data—spatial arrangement encodes meaning. By default, Obsidian "scrambles" the z-index array on every save, losing that encoded meaning. This plugin recompiles the canvas, preserving its visual semantics as stable, deterministic JSON across four dimensions:

- **Position** (x, y) → Linear reading sequence (top-left to bottom-right)
- **Containment** (bounding boxes) → Hierarchical structure (groups + children)
- **Color** (node/edge colors) → Semantic taxonomy (red=urgent, blue=reference, etc.)
- **Directionality** (arrow endpoints) → Information flow topology (source → sink)

**Benefits:**

  - **Shared generative grammar**: Humans compose spatially, AI composes semantically, canvas renders identically
  - **Bidirectional authoring**: Template anything in canvas, AI generates semantically valid JSON, structures render instantly, inventing novel compositions using the same visual grammar
  - **Clean diffs + stable semantics**: Git tracks meaningful changes, LLMs output/consume coherent structure, humans see immediate visual feedback

## Features

- **Auto-compile on save**: Seamless workflow—canvas files automatically reorder when saved
- **Hierarchical ordering**: Groups followed immediately by their contents, depth-first traversal
- **Content-based sorting**: Nodes sort by semantic content (text/file path/URL/label) instead of random IDs
- **Color taxonomy**: Optional color grouping preserves visual categories (enabled by default)
- **Flow topology sorting**: Optional directional flow analysis—arrows define execution order, transforming spatial diagrams into sequential narratives (disabled by default)
- **Topology-based edge sorting**: Edges ordered by connected node positions (or flow depth when flow sorting enabled)
- **CLI tool**: Included for batch processing or CI pipelines
- **Spec-compliant**: Pure JSON Canvas extension—no custom properties, works with all Canvas tools

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings
2. Navigate to Community Plugins
3. Search for "Semantic JSON"
4. Click Install, then Enable

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/SyntaxAsSpiral/semantic-json/releases)
2. Extract to `<vault>/.obsidian/plugins/semantic-json/`
3. Reload Obsidian
4. Enable "Semantic JSON" in Community Plugins settings

## Usage

### Commands (via Command Palette)

- **"Compile active canvas"**: Reorders the `.canvas` file in-place (no visual changes in UI, no extra files)
- **"Export canvas to JSON"**: Creates a separate `.json` file alongside the `.canvas`

### Settings

- **Auto-compile on save** (default: enabled): Automatically reorder canvas files when saved
- **Color sort nodes** (default: enabled): Group nodes by color within same spatial position
- **Color sort edges** (default: enabled): Group edges by color within same topology
- **Flow sort nodes** (default: disabled): Sort by directional flow topology instead of spatial position

## Standalone CLI Tool

Full feature parity with the plugin—enables batch processing, CI/CD pipelines, and programmatic canvas compilation.

```bash
# Basic usage (creates .json alongside .canvas)
node cli/canvas-compile.mjs --in <path-to-.canvas>

# In-place compilation
node cli/canvas-compile.mjs --in file.canvas --out file.canvas

# Options
--color-nodes / --no-color-nodes  # Color sorting (default: true)
--color-edges / --no-color-edges  # Edge color sorting (default: true)
--flow-sort / --no-flow-sort      # Flow topology sorting (default: false)
```

## Specification

Full technical specification available in [`semantic-json-spec.md`](./semantic-json-spec.md).

### Compilation Ordering

**Nodes** are reordered hierarchically based on spatial containment:
1. Root orphan nodes (not contained by groups)
2. Root groups, immediately followed by their contents (depth-first)
3. Nested groups follow the same pattern recursively

**Within each scope**, nodes are sorted by (when flow sorting disabled):
- Spatial position (y, x)
- Node type priority (link nodes to bottom like footnotes)
- Color (optional, groups same-colored nodes)
- Content (text/file path/URL/label instead of random IDs)

**When flow sorting enabled:**
- Directional edges create conceptual flow groups
- Nodes sort by topological order (source → intermediate → sink)
- Flow depth overrides type priority—link nodes stay in flow order
- Isolated nodes use standard spatial sorting

**Edges** are sorted by:
- `fromNode` position (y, x) or flow depth
- `toNode` position (y, x) or flow depth
- Color (optional, groups same-colored edges)
- Edge ID (fallback for determinism)

This transforms spatial diagrams into linear narratives that preserve visual semantics, making flow diagrams, system architectures, and knowledge graphs immediately legible to LLMs without spatial reconstruction.

## Examples

See [`examples/conformance-test-card.canvas`](./examples/conformance-test-card.canvas) for a self-documenting test demonstrating:
- Hierarchical group containment
- Spatial grid ordering (3×3 table)
- Nested parent-child groups
- Color-coded nodes and edges
- Directional flow patterns (horizontal green edges, vertical cyan edges)

The test card is pre-sorted in the repo, so opening it in Obsidian and saving will scramble it—demonstrating exactly what this plugin fixes.

## Development

```bash
npm install
npm run dev    # Watch mode
npm run build  # Production build
```

## Contributing

Issues and PRs welcome! Please follow existing code style and include tests for new features.

## License

MIT

---

**Transforms visual canvases into semantic narratives—reading spatial field as language, compiling visual meaning into linear order.**
