
# JSON Canvas Spec — Semantic JSON Extension

Base: JSON Canvas 1.0 (2024-03-11)
Extension: Semantic JSON Compilation

## 📑 Contents

I. **[[#I. Base Spec|Base Specification]]**

II. **◈ [[#II. ◈ Semantic JSON Extension|Semantic JSON Extension]]**

III. **[[#III. 🎮 Commands & Settings|Commands & Settings]]**
  - [[#🎛️ Plugin Settings]]
  - [[#📤 Pure JSON Export]]
  - [[#📥 Import JSON to Canvas]]

IV. ** [[#IV. 🍥 The Anticompiler]]**

---

## ⚖️ Foundational Constraints

1. **Semantic JSON never infers meaning; it only surfaces meaning explicitly encoded in syntax conventions.**
2. **Semantic JSON will always remain spec compliant with JSON Canvas, neither adding nor removing data, just interpreting and arranging what is there.**

---

## I. Base Spec

 ### JSON Canvas

## ![JSON Canvas](Pasted%20image%2020260107195508.png)

[Full Spec](https://jsoncanvas.org/) 

## Top level

The top level of JSON Canvas contains two arrays:

- `nodes` (optional, array of nodes)
- `edges` (optional, array of edges)

### Nodes

Nodes are objects within the canvas. Nodes may be text (including structured text like Markdown or YAML), files, links, or groups.

Nodes are placed in the array in ascending order by **z-index** by default.

#### Generic node

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

#### Text type nodes

Text type nodes store text. Along with generic node attributes, text nodes include the following attribute:

- `text` (required, string) in plain text with Markdown syntax.

#### File type nodes

File type nodes reference other files or attachments, such as images, videos, etc. Along with generic node attributes, file nodes include the following attributes:

- `file` (required, string) is the path to the file within the system.
- `subpath` (optional, string) is a subpath that may link to a heading or a block. Always starts with a `#`.

#### Link type nodes

Link type nodes reference a URL. Along with generic node attributes, link nodes include the following attribute:

- `url` (required, string)

#### Group type nodes

Group type nodes are used as a visual container for nodes within it. Along with generic node attributes, group nodes include the following attributes:

- `label` (optional, string) is a text label for the group.
- `background` (optional, string) is the path to the background image.
- `backgroundStyle` (optional, string) is the rendering style of the background image. Valid values:
    - `cover` fills the entire width and height of the node.
    - `ratio` maintains the aspect ratio of the background image.
    - `repeat` repeats the image as a pattern in both x/y directions.

### Edges

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

### Color

The `canvasColor` type is used to encode color data for nodes and edges. Colors attributes expect a string. Colors can be specified in hex format e.g. `"#FF0000"`, or using one of the preset colors, e.g. `"1"` for red. Six preset colors exist, mapped to the following numbers:

- `"1"` red
- `"2"` orange
- `"3"` yellow
- `"4"` green
- `"5"` cyan
- `"6"` purple

Specific values for the preset colors are intentionally not defined so that applications can tailor the presets to their specific brand colors or color scheme.

---

## II. ◈ Semantic JSON Extension

### Before & After: The Transformation

**Problem:** Obsidian scrambles Canvas JSON on every save, discarding semantic order and randomizing both node positions in the array and field order within objects.

**Solution:** Semantic JSON compiles spatial layout into deterministic order, preserving visual semantics as stable, legible structure.

### 😵‍💫 Before (Obsidian's output)

Real-world example: A Cavapoos information canvas saved in Obsidian.

```json
{
  "nodes": [
    {"id":"appearance","type":"text","text":"## Appearance\n\n- Size: Small to medium (9-14 inches tall)\n...","x":100,"y":400,"width":300,"height":200,"color":"#FFD166"},
    {"id":"temperament","type":"text","text":"## Temperament\n\n- Friendly and affectionate\n...","x":450,"y":400,"width":300,"height":200,"color":"#06D6A0"},
    {"id":"health","type":"text","text":"## Health Considerations\n\n- Inherited conditions from parent breeds\n...","x":100,"y":650,"width":300,"height":200,"color":"#EF476F"},
    {"id":"history","type":"text","text":"## History & Origin\n\n- Developed in the 1990s\n...","x":1180,"y":850,"width":300,"height":200,"color":"#540D6E"},
    {"id":"care","type":"text","text":"## Care Requirements\n\n- Grooming: Regular brushing\n...","x":1030,"y":400,"width":300,"height":350,"color":"#118AB2"},
    {"id":"adoption","type":"text","text":"## Adoption & Cost\n\nCavapoos typically cost $1,500-$4,000...","x":120,"y":1030,"width":500,"height":150,"color":"#F77F00"},
    {"id":"training","type":"text","text":"## Training & Exercise\n\n- Highly trainable due to intelligence\n...","x":700,"y":663,"width":300,"height":375,"color":"#073B4C"},
    {"id":"resources","type":"link","url":"https://www.akc.org/expert-advice/dog-breeds/cavapoo-breed-facts-temperament-traits/","x":120,"y":1340,"width":500,"height":320,"color":"#2196F3"},
    {"id":"title","type":"text","text":"# Cavapoos\n\nA comprehensive guide to the Cavalier King Charles Spaniel and Poodle mix","x":300,"y":-140,"width":500,"height":180,"color":"#FF6B6B"},
    {"id":"overview","type":"text","text":"## Overview\n\nCavapoos are a crossbreed between a Cavalier King Charles Spaniel and a Poodle...","x":350,"y":100,"width":500,"height":180,"color":"#4ECDC4"}
  ]
}
```

**Issues:**
- ❌ **Title appears at the END** (y=-140, but position 9/10 in array!)
- ❌ Overview last despite being at top of canvas
- ❌ Random sections scattered: "appearance" → "temperament" → "health" → "history" → "care" → "adoption" → "training"
- ❌ Field order is chaotic (`text` before `id`, `color` at the end sometimes, `x` before `y`)
- ❌ Impossible to read as a document—requires mental reconstruction of spatial layout
- ❌ Git diffs show massive object repositioning on every save
- ❌ LLMs receive incoherent structure: "Here's appearance... now temperament... oh wait, here's the title at the end"

### 🤓 After (Semantic JSON compilation)

```json
{
  "nodes": [
    {
      "id": "title",
      "type": "text",
      "x": 300,
      "y": -140,
      "width": 500,
      "height": 180,
      "color": "#FF6B6B",
      "text": "# Cavapoos\n\nA comprehensive guide to the Cavalier King Charles Spaniel and Poodle mix"
    },
    {
      "id": "overview",
      "type": "text",
      "x": 350,
      "y": 100,
      "width": 500,
      "height": 180,
      "color": "#4ECDC4",
      "text": "## Overview\n\nCavapoos are a crossbreed between a Cavalier King Charles Spaniel and a Poodle..."
    },
    {
      "id": "appearance",
      "type": "text",
      "x": 100,
      "y": 400,
      "width": 300,
      "height": 200,
      "color": "#FFD166",
      "text": "## Appearance\n\n- Size: Small to medium (9-14 inches tall)\n..."
    },
    {
      "id": "temperament",
      "type": "text",
      "x": 450,
      "y": 400,
      "width": 300,
      "height": 200,
      "color": "#06D6A0",
      "text": "## Temperament\n\n- Friendly and affectionate\n..."
    },
    {
      "id": "care",
      "type": "text",
      "x": 1030,
      "y": 400,
      "width": 300,
      "height": 350,
      "color": "#118AB2",
      "text": "## Care Requirements\n\n- Grooming: Regular brushing\n..."
    },
    {
      "id": "training",
      "type": "text",
      "x": 700,
      "y": 663,
      "width": 300,
      "height": 375,
      "color": "#073B4C",
      "text": "## Training & Exercise\n\n- Highly trainable due to intelligence\n..."
    },
    {
      "id": "health",
      "type": "text",
      "x": 100,
      "y": 650,
      "width": 300,
      "height": 200,
      "color": "#EF476F",
      "text": "## Health Considerations\n\n- Inherited conditions from parent breeds\n..."
    },
    {
      "id": "history",
      "type": "text",
      "x": 1180,
      "y": 850,
      "width": 300,
      "height": 200,
      "color": "#540D6E",
      "text": "## History & Origin\n\n- Developed in the 1990s\n..."
    },
    {
      "id": "adoption",
      "type": "text",
      "x": 120,
      "y": 1030,
      "width": 500,
      "height": 150,
      "color": "#F77F00",
      "text": "## Adoption & Cost\n\nCavapoos typically cost $1,500-$4,000..."
    },
    {
      "id": "resources",
      "type": "link",
      "x": 120,
      "y": 1340,
      "width": 500,
      "height": 320,
      "color": "#2196F3",
      "url": "https://www.akc.org/expert-advice/dog-breeds/cavapoo-breed-facts-temperament-traits/"
    }
  ]
}
```

**Benefits:**
- ✅ **Title first!** Spatial order preserved (y=-140 → y=1340)
- ✅ Document flows naturally: Title → Overview → Appearance → Temperament → Care → Training → Health → History → Adoption → Resources
- ✅ Consistent field order: `id` → `type` → `x` → `y` → `width` → `height` → `color` → `text`/`url`
- ✅ Stable Git diffs—only changed fields show up as modifications
- ✅ **LLMs read it as a coherent document** without spatial reconstruction
- ✅ Array position encodes visual reading order (top-to-bottom, left-to-right)
- ✅ Humans can parse the JSON and understand the canvas structure immediately

**Key insight:** The transformation preserves *all* Canvas data while compiling spatial semantics into linear order. The "scrambled" version and "compiled" version are functionally identical for rendering, but only the compiled version is semantically legible as a document.

---

### ◈ Compilation

Semantic JSON extends the base JSON Canvas spec with intelligently **compiled ordering** of the z-index array for stable, deterministic serialization. This enables:
- Stable diffs for version control
- Low cognitive load, token friendly LLM ingestion
- Visuospatial encoding (visual field semantics → logical order)

**Visual dimensions encoded:**
- **Position** (x, y) → Linear reading sequence
- **Containment** (bounding boxes) → Hierarchical structure
- **Color** (node/edge colors) → Semantic taxonomy/categories
- **Directionality** (arrow endpoints) → Information flow topology

The plugin reads the canvas as a **visual language**, where position, containment, color, and directional flow all carry semantic meaning that gets compiled into stable, linear JSON order.

### 🏛️ Architectural Layers

Semantic JSON operates through three explicit layers, each with clear boundaries and responsibilities:

**Layer 1: Spatial Semantic Compilation** *(implemented)*

The foundation. Surfaces meaning explicitly encoded in Canvas visual syntax:
- `x`, `y` coordinates → Linear reading order
- Bounding box containment → Hierarchical nesting
- Edge directionality → Flow topology
- Color values → Semantic taxonomy

**Layer 2: Content Identity Extraction** *(future)*

Identity key extraction from structured text node content:
- **YAML**: `title`, `name`, `id` fields
- **Markdown**: First header + level (`# Title` → `"Title"`)
- **JSON**: `id`, `name`, `title` keys
- **Code blocks**: Language tag only (not content)

Not parsing. Not interpreting. **Extracting identity keys from existing syntax conventions.**

**Layer 3: Fallback Determinism** *(always active)*

Ensures stable, predictable ordering when higher layers don't apply:
- Plain text: Alphabetical sorting (Unicode collation)
- Long content: Stable truncation rules
- No content: ID fallback (lexicographic)

All three layers preserve JSON Canvas spec compliance—no data added, removed, or mutated. Only interpretation and arrangement.

### 📦+📍  Compiled Node Ordering

Nodes are reordered **hierarchically** based on spatial containment:

1. **Root orphan nodes** (not contained by any group)
   - Sorted using the rules below (spatial/flow + type + color + content)

2. **Root groups** (not nested within other groups)
   - Sorted using the rules below (spatial/flow + type + color + content)
   - Immediately followed by their **contained nodes**:
     - Non-group children first (sorted by rules below)
     - Nested group children (sorted by rules below), each followed recursively by their contents

This creates depth-first traversal: each group appears immediately followed by all its contents before the next sibling group.

####  💫 Sorting Rules

When **flow sorting is disabled** (default), nodes within each scope are sorted by:
1. **Spatial position**: y (ascending), then x (ascending)
2. **Node type priority**: Link nodes always sort to bottom (like footnotes), content nodes (text/file/group) sort first
3. **Color** (optional, enabled by default): Nodes with same color group together (preserves visual semantic categories)
   - Uncolored nodes appear first
   - Colored nodes sort alphabetically by color value (hex or preset number)
   - Can be disabled in plugin settings
4. **Content**: Sorted alphabetically by semantic content:
   - **Text nodes**: sorted by text content
   - **File nodes**: sorted by filename (basename, not full path)
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

#### 👁️ Visual Semantics

**Link node placement**: Link nodes function as references/citations, appearing after primary content (like footnotes) when not in a flow group.

**Color taxonomy**: Color grouping (when enabled) preserves visual semantic categories:
- 🔴 = urgent/error
- 🟠 = warning
- 🟡 = in-progress
- 🟢 = success/complete
- 🔵 = info/reference
- 🟣 = special/custom

**Flow topology**: When flow sorting is enabled, directional arrows define information flow, transforming spatial diagrams into linear reading order based on dependency graphs. Workflows and pipelines become sequential narratives.

**Hierarchical containment**: Spatial containment (bounding boxes) creates explicit nesting. A node is contained by a group if its bounding box (x, y, width, height) falls entirely within the group's bounding box. For overlapping groups, the smallest containing group is chosen. This makes group structure explicit for linear readers without requiring spatial reconstruction.

**Example order**: `orphan-1` → `group-A` → `group-A-child-1` → `group-A-child-2` → `nested-group-B` → `nested-group-B-child-1` → `group-C` → ...

**Reading order**: Top-left to bottom-right spatial interpretation, depth-first through the containment hierarchy (or topological flow order when flow sorting enabled).

### ↘️ Compiled Edge Ordering

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

#### ➡️ Edge Visual Semantics

**Spatial topology**: Edges encode directional information flow. They appear in the order a reader would trace them visually (top-to-bottom, left-to-right).

**Color-coded flows**: Edge colors (when enabled) preserve visual flow semantics:
- 🟢 = success path / horizontal connections
- 🔴 = error path / critical flow
- 🔵 = vertical connections / downward flow
- 🟡 = alternative path / horizontal flow
- 🟠 = warning path
- 🟣 = special connections

**Flow inheritance**: When flow sorting is enabled, edges follow the topological order of their connected nodes rather than spatial positions. This transforms flow diagrams, system architectures, and dependency graphs into sequential narratives where edges appear in execution/causation order.

**Example**: In a data pipeline `Extract → Transform → Load`, edges appear as: `Extract→Transform`, `Transform→Load` (sequential flow) rather than random ID order.

## III. 🎮 **Commands & Settings**

### 🎛️ Plugin Settings

The following sorting options can be configured in plugin settings:

- **Auto-compile on save** (default: enabled): Automatically compile canvas files when saved
- **Color sort nodes** (default: enabled): Group nodes by color within same position
- **Color sort edges** (default: enabled): Group edges by color within same topology
- **Flow sort nodes** (default: disabled): Sort by directional flow topology instead of spatial position
- **Strip edges from pure JSON when flow-sorted** (default: enabled): Remove edges from pure JSON exports when flow topology is compiled into node sequence order

### 📤 Pure JSON Export

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

## 📥 Import JSON to Canvas

The **"Import JSON to Canvas"** command creates visual scaffolding from pure JSON data structures, generating Canvas nodes with spatial layout.

**Input:** Pure JSON (objects, arrays, primitives)
**Output:** Valid `.canvas` file with visual representation

**Transformation rules:**

**Objects** → Group nodes
- Keys become child text nodes
- Object label = extracted identity key (if Layer 2 enabled) or `{...}` (fallback)
- Nested objects = nested groups
- Spatial layout: horizontal or vertical based on depth

**Arrays** → Group nodes
- Elements become child nodes (groups for objects, text for primitives)
- Array label = `[array_name]` or `[...]` if anonymous
- Spatial layout: vertical stacking by default

**Primitives** (strings, numbers, booleans, null) → Text nodes
- Value rendered as Markdown text
- Node label = value (truncated if long)

**Generated Canvas metadata:**

All imported nodes receive:
- `x`, `y`: Spatial position (auto-calculated grid layout)
- `width`, `height`: Node dimensions (based on content size)
- `color`: Optional (can apply taxonomy colors based on data type)
- `id`: Deterministic (derived from JSON path: `root.users.0.name`)

**Spatial layout algorithm:**

1. **Hierarchical positioning**: Parent groups positioned first
2. **Grid-based arrangement**: Children laid out in predictable grid
3. **Depth offset**: Nested groups indented/offset for visual hierarchy
4. **Collision avoidance**: Nodes never overlap

**Use cases:**
- Visualize JSON data structures (API responses, config files, etc.)
- Author structured data visually in Canvas, export as clean JSON
- Round-trip editing: JSON → Canvas (visual edit) → JSON

**Reversibility:** Import then export (with metadata stripping) should produce semantically equivalent JSON, though formatting may differ (whitespace, key order).

### 📐 Validation Rules

Compilation enforces strict validation:
- All nodes must have unique, non-empty `id`
- All edges must have unique, non-empty `id`
- Edges must reference existing node IDs in `fromNode` and `toNode`
- Node IDs are normalized (trimmed whitespace, string coercion for numbers/booleans)

Invalid canvases throw descriptive errors during compilation.

#### Serialization Format

Compiled output uses stable JSON formatting:
- 2-space indentation (optimal for diffs)
- Trailing newline (POSIX compliance)
- UTF-8 encoding (universal compatibility)
- Deterministic key ordering (consistent serialization)

This format is optimized for:
- **Git diffs**: Minimal line changes, easy to review
- **LLM ingestion**: Token-efficient, semantically ordered
- **Human readability**: Consistent structure, predictable layout, real-time feedback

---

## IV. 🍥 The Anticompiler


#####  What This Is (And Isn't)

Semantic JSON is an **anticompiler** — a system that inverts the classical compilation process.

A classical compiler does this:

> **Human-legible → machine-legible**
> ambiguity ↓
> constraint ↑
> degrees of freedom ↓

Semantic JSON does the reverse:

> **Machine-dense → human-legible**
> opacity ↓
> semantic surface ↑
> affordances ↑

It **decompresses intent** rather than freezing it.
It does not "execute."
It **reveals**.

### ⇅ The Structural Inversion

A compiler:
- Collapses alternatives into one path
- Erases provenance
- Optimizes away explanation
- Targets determinism

An anticompiler:
- Restores structure
- Makes implicit relations explicit
- Preserves semantic neighborhoods
- Targets **interpretability across minds** (human + model)

It performs a **partial inverse of compilation** without requiring lossless round-tripping. It's not reconstructing the original source, but a **usable cognitive representation**.

### 🤖 Why This Matters for LLMs

Canvas files already contain all the metadata needed to reconstruct spatial intent—coordinates, colors, edge topology. An LLM *can* trace through the raw `.canvas` format and understand the visual structure.

But what's clearer for humans is clearer for models too.

Semantic JSON:
- 🏷️ **Restores naming** — IDs become memorable, not random hashes
- 🌳 **Restores hierarchy** — Spatial clustering → sequential grouping
- 🔗 **Restores local context** — Related nodes appear adjacent in reading order
- 📊 **Reduces token entropy** — Predictable structure = better compression *without* reducing meaning

The difference isn't capability—it's **cognitive load**. Raw Canvas asks both humans and models to mentally compile spatial coordinates into reading order. Semantic JSON does that work once, deterministically, preserving the result as structure.

### 🌀 The Wyrd Framing

> A compiler binds symbol to causality.
> An anticompiler **unbinds causality back into symbol**.

Where the compiler says:
> "This must now mean exactly one thing."

The anticompiler replies:
> "Let me show you what was compressed, assumed, or forgotten."

This is **semantic unzipping**:
- JSON as ossified ritual form
- Expanded into a surface where humans can *think again*
- And LLMs can *reason instead of hallucinate*

---

*A compiler makes thought executable; an anticompiler makes execution thinkable again.*