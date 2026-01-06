# JSON Canvas Spec — Semantic JSON Extension

Base: JSON Canvas 1.0 (2024-03-11)
Extension: Semantic JSON Compilation

## Top level

The top level of JSON Canvas contains two arrays:

- `nodes` (optional, array of nodes)
- `edges` (optional, array of edges)

## Nodes

Nodes are objects within the canvas. Nodes may be text, files, links, or groups.

Nodes are placed in the array in ascending order by z-index. The first node in the array should be displayed below all other nodes, and the last node in the array should be displayed on top of all other nodes.

### Generic node

All nodes include the following attributes:

- `id` (required, string) is a unique ID for the node.
- `type` (required, string) is the node type.
    - `text`
    - `file`
    - `link`
    - `group`
- `x` (required, integer) is the `x` position of the node in pixels.
- `y` (required, integer) is the `y` position of the node in pixels.
- `width` (required, integer) is the width of the node in pixels.
- `height` (required, integer) is the height of the node in pixels.
- `color` (optional, `canvasColor`) is the color of the node, see the Color section.

### Text type nodes

Text type nodes store text. Along with generic node attributes, text nodes include the following attribute:

- `text` (required, string) in plain text with Markdown syntax.

### File type nodes

File type nodes reference other files or attachments, such as images, videos, etc. Along with generic node attributes, file nodes include the following attributes:

- `file` (required, string) is the path to the file within the system.
- `subpath` (optional, string) is a subpath that may link to a heading or a block. Always starts with a `#`.

### Link type nodes

Link type nodes reference a URL. Along with generic node attributes, link nodes include the following attribute:

- `url` (required, string)

### Group type nodes

Group type nodes are used as a visual container for nodes within it. Along with generic node attributes, group nodes include the following attributes:

- `label` (optional, string) is a text label for the group.
- `background` (optional, string) is the path to the background image.
- `backgroundStyle` (optional, string) is the rendering style of the background image. Valid values:
    - `cover` fills the entire width and height of the node.
    - `ratio` maintains the aspect ratio of the background image.
    - `repeat` repeats the image as a pattern in both x/y directions.

## Edges

Edges are lines that connect one node to another.

- `id` (required, string) is a unique ID for the edge.
- `fromNode` (required, string) is the node `id` where the connection starts.
- `fromSide` (optional, string) is the side where this edge starts. Valid values:
    - `top`
    - `right`
    - `bottom`
    - `left`
- `fromEnd` (optional, string) is the shape of the endpoint at the edge start. Defaults to `none` if not specified. Valid values:
    - `none`
    - `arrow`
- `toNode` (required, string) is the node `id` where the connection ends.
- `toSide` (optional, string) is the side where this edge ends. Valid values:
    - `top`
    - `right`
    - `bottom`
    - `left`
- `toEnd` (optional, string) is the shape of the endpoint at the edge end. Defaults to `arrow` if not specified. Valid values:
    - `none`
    - `arrow`
- `color` (optional, `canvasColor`) is the color of the line, see the Color section.
- `label` (optional, string) is a text label for the edge.

## Color

The `canvasColor` type is used to encode color data for nodes and edges. Colors attributes expect a string. Colors can be specified in hex format e.g. `"#FF0000"`, or using one of the preset colors, e.g. `"1"` for red. Six preset colors exist, mapped to the following numbers:

- `"1"` red
- `"2"` orange
- `"3"` yellow
- `"4"` green
- `"5"` cyan
- `"6"` purple

Specific values for the preset colors are intentionally not defined so that applications can tailor the presets to their specific brand colors or color scheme.

---

## Semantic JSON Compilation

Semantic JSON extends the base JSON Canvas spec with **compiled ordering** of z-index array for stable, deterministic serialization. This enables:
- Stable diffs for version control
- Predictable LLM ingestion
- Visuospatial encoding (visual field semantics → logical order)

**Visual dimensions encoded:**
- **Position** (x, y) → Linear reading sequence
- **Containment** (bounding boxes) → Hierarchical structure
- **Color** (node/edge colors) → Semantic taxonomy/categories
- **Directionality** (arrow endpoints) → Information flow topology

The plugin reads the canvas as a **visual language**, where position, containment, color, and directional flow all carry semantic meaning that gets compiled into stable, linear JSON order.

### Compiled Node Ordering

Nodes are reordered **hierarchically** based on spatial containment:

1. **Root orphan nodes** (not contained by any group)
   - Sorted using the rules below (spatial/flow + type + color + content)

2. **Root groups** (not nested within other groups)
   - Sorted using the rules below (spatial/flow + type + color + content)
   - Immediately followed by their **contained nodes**:
     - Non-group children first (sorted by rules below)
     - Nested group children (sorted by rules below), each followed recursively by their contents

This creates depth-first traversal: each group appears immediately followed by all its contents before the next sibling group.

#### Sorting Rules

When **flow sorting is disabled** (default), nodes within each scope are sorted by:
1. **Spatial position**: y (ascending), then x (ascending)
2. **Node type priority**: Link nodes always sort to bottom (like footnotes), content nodes (text/file/group) sort first
3. **Color** (optional, enabled by default): Nodes with same color group together (preserves visual semantic categories)
   - Uncolored nodes appear first
   - Colored nodes sort alphabetically by color value (hex or preset number)
   - Can be disabled in plugin settings
4. **Content**: Sorted alphabetically by semantic content:
   - **Text nodes**: sorted by text content
   - **File nodes**: sorted by file path
   - **Link nodes**: sorted by raw URL (preserves protocol)
   - **Group nodes**: sorted by label
   - Falls back to node ID if no content available

When **flow sorting is enabled** (optional, disabled by default), nodes within each scope are sorted by:

**For nodes in flow groups** (connected by directional edges):
1. **Flow group position**: Flow groups (connected components) sort by their top-left node (min y, min x)
   - Actual group boundaries contain flow groups (cross-group edges are ignored)
2. **Flow depth**: Within a flow group, sort **exclusively** by topological order
   - Source nodes (only outgoing arrows): depth 0
   - Intermediate nodes: depth based on longest path from source
   - Sink nodes (only incoming arrows): highest depth
   - **Flow depth overrides node type priority**: Link nodes appear in flow order, not pushed to bottom
3. **Spatial position**: Within same flow depth, sort by y (ascending), then x (ascending)
4. **Color** (optional, enabled by default): Within same flow depth and position, group same-colored nodes
5. **Content**: Within same depth/position/color, sort alphabetically by semantic content

**For isolated nodes** (not in any flow group):
1. **Spatial position**: y (ascending), then x (ascending)
2. **Node type priority**: Link nodes sort to bottom (like footnotes)
3. **Color** (optional, enabled by default): Groups same-colored nodes together
4. **Content**: Alphabetical by semantic content

**Edge directionality**:
- **Forward arrow** (`fromEnd: none`, `toEnd: arrow`): Standard directional flow (default)
- **Reverse arrow** (`fromEnd: arrow`, `toEnd: none`): Reverse flow (dependency)
- **Bidirectional** (`fromEnd: arrow`, `toEnd: arrow`): Chain connector that inherits direction from neighbors
  - `→ ↔ →` becomes `→ → →` (forward chain)
  - `← ↔ →` becomes `← ← →` (split point)
- **Non-directional** (`fromEnd: none`, `toEnd: none`): Ignored for flow analysis

#### Visual Semantics

**Link node placement**: Link nodes function as references/citations, appearing after primary content (like footnotes) when not in a flow group.

**Color taxonomy**: Color grouping (when enabled) preserves visual semantic categories:
- Red = urgent/error
- Orange = warning
- Yellow = in-progress
- Green = success/complete
- Cyan = info/reference
- Purple = special/custom

**Flow topology**: When flow sorting is enabled, directional arrows define information flow, transforming spatial diagrams into linear reading order based on dependency graphs. Workflows and pipelines become sequential narratives.

**Hierarchical containment**: Spatial containment (bounding boxes) creates explicit nesting. A node is contained by a group if its bounding box (x, y, width, height) falls entirely within the group's bounding box. For overlapping groups, the smallest containing group is chosen. This makes group structure explicit for linear readers without requiring spatial reconstruction.

**Example order**: `orphan-1` → `group-A` → `group-A-child-1` → `group-A-child-2` → `nested-group-B` → `nested-group-B-child-1` → `group-C` → ...

**Reading order**: Top-left to bottom-right spatial interpretation, depth-first through the containment hierarchy (or topological flow order when flow sorting enabled).

### Compiled Edge Ordering

When **flow sorting is disabled** (default), edges are sorted by **spatial topology**:

1. **fromNode position**: Sort by fromNode's y position (ascending), then x position (ascending)
2. **toNode position**: Sort by toNode's y position (ascending), then x position (ascending)
3. **Color** (optional, enabled by default): Group edges with same color together
   - Uncolored edges appear first
   - Colored edges sort alphabetically by color value (hex or preset number)
   - Can be disabled in plugin settings
4. **Edge ID**: Fallback to ID (lexicographic) for deterministic ordering

When **flow sorting is enabled** (optional, disabled by default), edges inherit their connected nodes' flow order:

1. **fromNode flow depth**: If fromNode is in a flow group, sort by its flow depth (topological order)
2. **toNode flow depth**: If toNode is in a flow group, sort by its flow depth (topological order)
3. **Spatial fallback**: For edges between isolated nodes (not in flow groups), use spatial positions (y, x)
4. **Color** (optional, enabled by default): Group edges with same color together
5. **Edge ID**: Fallback to ID for deterministic ordering

#### Edge Visual Semantics

**Spatial topology**: Edges encode directional information flow. They appear in the order a reader would trace them visually (top-to-bottom, left-to-right).

**Color-coded flows**: Edge colors (when enabled) preserve visual flow semantics:
- Green = success path / horizontal connections
- Red = error path / critical flow
- Cyan = vertical connections / downward flow
- Yellow = alternative path / horizontal flow
- Orange = warning path
- Purple = special connections

**Flow inheritance**: When flow sorting is enabled, edges follow the topological order of their connected nodes rather than spatial positions. This transforms flow diagrams, system architectures, and dependency graphs into sequential narratives where edges appear in execution/causation order.

**Example**: In a data pipeline `Extract → Transform → Load`, edges appear as: `Extract→Transform`, `Transform→Load` (sequential flow) rather than random ID order.

### Compilation Settings

The following sorting options can be configured in plugin settings:

- **Auto-compile on save** (default: enabled): Automatically compile canvas files when saved
- **Color sort nodes** (default: enabled): Group nodes by color within same position
- **Color sort edges** (default: enabled): Group edges by color within same topology
- **Flow sort nodes** (default: disabled): Sort by directional flow topology instead of spatial position
- **Strip edges from pure JSON when flow-sorted** (default: enabled): Remove edges from pure JSON exports when flow topology is compiled into node sequence order

### Pure JSON Export

The **"Export as pure JSON"** command strips Canvas-specific metadata to produce clean data artifacts while preserving compiled semantic structure.

**Stripped fields:**
- Spatial metadata: `x`, `y`, `width`, `height`
- Visual metadata: `color`, `fromSide`, `toSide`, `toEnd`, `fromEnd`
- Rendering metadata: `background`, `backgroundStyle`

**Preserved fields:**
- Node structure: `id`, `type`, `text`, `file`, `url`, `label`
- Graph topology: `edges` array with `id`, `fromNode`, `toNode`, `label`
- Compiled ordering: Hierarchical and flow-based sequence

**Edge stripping behavior:**

When **flow sorting is enabled** AND **strip edges when flow-sorted** is enabled (default):
- Edges are automatically removed from pure JSON exports
- Edge topology is **compiled into node sequence order**
- The directed graph becomes a sequential narrative
- Relationships are implicit in array position (nodes appear in execution/dependency order)

When **flow sorting is disabled** OR **strip edges when flow-sorted** is disabled:
- Edges are preserved in pure JSON exports
- Graph topology remains explicit
- Relationships require edges array for interpretation

**Rationale:** When flow sorting compiles edge topology into node sequence order, edges become presentation scaffolding—their semantic meaning (source → intermediate → sink) is already encoded in the linear array position. Stripping edges produces minimal data artifacts where relationships are implicit in ordering rather than explicit in graph structure.

**Use cases:**
- Flow-sorted exports: Sequential workflows, execution plans, dependency lists (edges stripped by default)
- Spatial exports: Knowledge graphs, network diagrams, relationship maps (edges preserved by default)

### Validation Rules

Compilation enforces strict validation:
- All nodes must have unique, non-empty `id`
- All edges must have unique, non-empty `id`
- Edges must reference existing node IDs in `fromNode` and `toNode`
- Node IDs are normalized (trimmed whitespace, string coercion for numbers/booleans)

Invalid canvases throw descriptive errors during compilation.

### Serialization Format

Compiled output uses stable JSON formatting:
- 2-space indentation (optimal for diffs)
- Trailing newline (POSIX compliance)
- UTF-8 encoding (universal compatibility)
- Deterministic key ordering (consistent serialization)

This format is optimized for:
- **Git diffs**: Minimal line changes, easy to review
- **LLM ingestion**: Token-efficient, semantically ordered
- **Human readability**: Consistent structure, predictable layout, real-time feedback
