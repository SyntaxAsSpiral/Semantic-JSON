# Semantic JSON

**Obsidian plugin that compiles Canvas files to semantic JSON for enhanced human and AI readability, universal ingestion, and stable version control.**

## What is JSON Canvas?

[JSON Canvas](https://jsoncanvas.org/) is an open file format for infinite canvas data, originally developed for Obsidian Canvas. It promotes longevity, readability, interoperability, and extensibility using the `.canvas` extension and a simple JSON structure with nodes and edges. Infinite canvas tools organize information **spatially** like a digital whiteboard.

## Why This Plugin?

By default, Obsidian "scrambles" `.canvas` file entries on every save. This plugin encodes them into a stable, semantically legible structure without affecting:
- **Git diffs**: Produces clean, predictable diffs (no noise from reordering)
- **Hashing**: Deterministic output ensures stable content signatures
- **Obsidian visibility**: Canvas displays identically—only the underlying JSON changes

## Features

- **Hierarchical ordering**: Groups appear before their contained nodes, depth-first traversal
- **Topology-based edge sorting**: Edges ordered by spatial information flow (fromNode → toNode position)
- **Enhanced readability**: Linear JSON output preserves spatial semantics for both human review and AI processing
- **Auto-compile**: Optionally reorder on save for seamless workflows
- **Universal ingestion**: Canvas as agnostic schema for heterogeneous data sources

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

- **"Compile active canvas"**: Reorders the `.canvas` file in-place (seamless, no extra files)
- **"Export canvas to .json"**: Creates a separate `.json` file alongside the `.canvas`

### Settings

- **Auto-compile**: Enable to automatically reorder on every save (in-place, no extra files)

## CLI Tool

A standalone CLI tool is included for batch processing or CI pipelines:

```bash
node cli/canvas-compile.mjs --in <path-to-.canvas> [--out <path-to-.json>]
```

See [`cli/canvas-compile.mjs`](./cli/canvas-compile.mjs) for usage details.

## Specification

Full technical specification available in [`semantic-json-spec.md`](./semantic-json-spec.md).

### Compilation Ordering

**Nodes** are reordered hierarchically based on spatial containment:
1. Root orphan nodes (not contained by any group) - sorted by y, x, id
2. Root groups - sorted by y, x, id, immediately followed by their contained nodes
3. Nested groups appear depth-first after non-group siblings

**Edges** are sorted by spatial topology:
1. By `fromNode` position (y, then x)
2. Then by `toNode` position (y, then x)
3. Fallback to `id` for deterministic ordering

This encodes information flow and spatial relationships, making flow diagrams and system architectures immediately legible to LLMs reading the JSON.

## Examples

See [`examples/conformance-test-card.canvas`](./examples/conformance-test-card.canvas) for a test case demonstrating hierarchical ordering.

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

**Bridges visual authoring with readable semantic structures for humans and machines alike.**
