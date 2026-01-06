# ◈ Semantic JSON

JSON Canvas adds 4 visuospatial primitives to the JSON format. This plugin makes them grammatical for human visual authoring and AI generation by compiling Canvas files into deterministic, semantically legible JSON artifacts for agentic workflows and human–AI collaboration.

## What is JSON Canvas?

[JSON Canvas](https://jsoncanvas.org/) is an open file format for infinite canvas data, originally developed for Obsidian Canvas. It promotes longevity, readability, interoperability, and extensibility using the `.canvas` extension and a simple JSON structure with nodes and edges. Infinite canvas tools organize information **spatially** like a digital whiteboard.

## 🎯 Why This Plugin?

By default, Obsidian "scrambles" the JSON array in Canvas files on every save, discarding richly encoded meaning and forcing readers to reconstruct intent. This plugin recompiles the z-index, preserving its visual semantics as stable, deterministic JSON across four dimensions:

- 📍 **Position** (x, y) → Linear reading sequence (top-left to bottom-right)
- 📦 **Containment** (bounding boxes) → Hierarchical structure (groups + children)
- 🎨 **Color** (node/edge colors) → Semantic taxonomy (red=urgent, blue=reference, etc.)
- ➡️ **Directionality** (arrow endpoints) → Information flow topology (source → sink)

### Benefits

- 🤝 Obsidian Canvas becomes an easier, more intuitive JSON editor for both human and AI authors and readers.
- 💬 JSON Canvas becomes **lingua franca** for the shared visuospatial grammar humans and AI already use natively as subtext for meaning. 

## ⚡ Features

- **Auto-compile on save**: Seamless workflow—canvas files never scramble.
- **Intuitive JSON Editing**: Watch your no-code JSON structures self-assemble in real-time IDE
- **CLI tool**: Included for batch processing or CI pipelines
- **Spec-compliant**: Pure JSON Canvas extension—no custom properties, works with all Canvas tools
- **Diff stability**: Git **only** tracks meaningful changes, LLMs output/consume coherent structure, humans see legible visual feedback.

## 📥 Installation

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

## 🚀 Usage

### Commands (via Command Palette)

- **"Compile active canvas"**: Recompiles the `.canvas` file in-place (no visual changes in UI, no extra files)
- **"Export canvas to JSON"**: Creates a separate `.json` file alongside the `.canvas`

### Settings

- **Auto-compile on save** (default: enabled): Automatically reorder canvas files when saved
- **Color sort nodes** (default: enabled): Group nodes by color within same spatial position
- **Color sort edges** (default: enabled): Group edges by color within same topology
- **Flow sort nodes** (default: disabled): Sort by directional flow topology instead of spatial position

## 💻 Standalone CLI Tool

Enables batch processing, CI/CD pipelines, and programmatic canvas compilation.

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

## 📖 Specification

Full technical specification available in [`semantic-json-spec.md`](./semantic-json-spec.md).

### Compilation Process

- **Hierarchical ordering**: Groups followed immediately by their contents, depth-first traversal
- **Content-based sorting**: Nodes sort by semantic content (text/file path/URL/label) instead of random IDs
- **Color taxonomy**: Optional color grouping preserves visual categories (enabled by default)
- **Flow topology sorting**: Optional directional flow analysis—arrows define execution order, transforming spatial diagrams into sequential narratives (disabled by default)
- **Topology-based edge sorting**: Edges ordered by connected node positions (or flow depth when flow sorting enabled)

This transforms spatial diagrams into linear narratives that preserve visual semantics, making flow diagrams, system architectures, and knowledge graphs immediately legible to LLMs without spatial reconstruction.

## 🧪 Examples

See [`examples/conformance-test-card.canvas`](./examples/conformance-test-card.canvas) for a self-documenting test. The test card is pre-sorted in the repo, so opening it in Obsidian and saving will scramble—demonstrating exactly what this plugin fixes.

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
