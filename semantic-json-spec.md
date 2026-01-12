---
title: JSON Canvas Spec — Semantic JSON Extension
base_spec: JSON Canvas 1.0 (2024-03-11)
extension: Semantic JSON Compilation
version: 0.2.0
author: Zach Battin
tags:
  - specification
  - json-canvas
  - semantic-json
  - anticompiler
status: living-document
---
# JSON Canvas Spec — Semantic JSON Extension

#### I. [[#I. Base Spec|Base Specification]]
#### II. [[#II. ◈ Semantic JSON Extension|Semantic JSON Extension]]
#### III. [[#III. 🎮 Commands & Settings|Commands & Settings]]
####   - [[#🎛️ Plugin Settings]]
####   - [[#📤 Pure JSON Export]]
####   - [[#📥 Import JSON to Canvas]]
####   - [[#📥 Import JSONL to Canvas]]
#### IV. [[#IV. 🍥 The Anticompiler|Philosophy]]

---

## ⚖️ Foundational Constraints

1. **Semantic JSON never infers meaning; it only surfaces meaning explicitly encoded in syntax conventions.**
2. **Semantic JSON will always remain spec compliant with JSON Canvas, neither adding nor removing data, just interpreting and arranging what is there.**

---

## I. Base Spec

 ### JSON Canvas

## ![JSON Canvas](Pasted%20image%2020260107195508.png)

[Full Spec](https://jsoncanvas.org/) 

### Top level

The top level of JSON Canvas contains two arrays:

```yaml
nodes: Node[]  # optional: array of nodes
edges: Edge[]  # optional: array of edges
```

### Nodes

Nodes are objects within the canvas. Nodes may be text (including structured text like Markdown or YAML), files, links, or groups.

Nodes are placed in the array in ascending order by **z-index** in vanilla.

#### Generic node

All nodes include the following attributes:

```yaml
id: string           # required: unique ID for the node
type: NodeType       # required: node type (text | file | link | group)
x: integer           # required: x position in pixels
y: integer           # required: y position in pixels
width: integer       # required: width in pixels
height: integer      # required: height in pixels
color?: CanvasColor  # optional: see Color section
```

#### Text type nodes

Text type nodes store text. Along with generic node attributes, text nodes include the following attribute:

```yaml
text: string  # required: plain text with Markdown syntax
```

#### File type nodes

File type nodes reference other files or attachments, such as images, videos, etc. Along with generic node attributes, file nodes include the following attributes:

```yaml
file: string      # required: path to file within the system
subpath?: string  # optional: subpath to heading/block (starts with #)
```

#### Link type nodes

Link type nodes reference a URL. Along with generic node attributes, link nodes include the following attribute:

```yaml
url: string  # required
```

#### Group type nodes

Group type nodes are used as a visual container for nodes within it. Along with generic node attributes, group nodes include the following attributes:

```yaml
label?: string            # optional: text label for the group
background?: string       # optional: path to background image
backgroundStyle?: string  # optional: rendering style (cover | ratio | repeat)
  # cover:  fills entire width and height
  # ratio:  maintains aspect ratio
  # repeat: repeats as pattern in both directions
```

### Edges

Edges are lines that connect one node to another.

```yaml
id: string             # required: unique ID for the edge
fromNode: string       # required: node id where connection starts
fromSide?: string      # optional: edge start side (top | right | bottom | left)
fromEnd?: string       # optional: endpoint shape (none | arrow), defaults to none
toNode: string         # required: node id where connection ends
toSide?: string        # optional: edge end side (top | right | bottom | left)
toEnd?: string         # optional: endpoint shape (none | arrow), defaults to arrow
color?: CanvasColor    # optional: line color, see Color section
label?: string         # optional: text label for the edge
```

### Color

The `canvasColor` type is used to encode color data for nodes and edges. Colors attributes expect a string. Colors can be specified in hex format e.g. `"#FF0000"`, or using one of the preset colors, e.g. `"1"` for red. Six preset colors exist, mapped to the following numbers:

```yaml
"1": red      # preset color 1
"2": orange   # preset color 2
"3": yellow   # preset color 3
"4": green    # preset color 4
"5": cyan     # preset color 5
"6": purple   # preset color 6
```

Specific values for the preset colors are intentionally not defined so that applications can tailor the presets to their specific brand colors or color scheme.

---

## II. ◈ Semantic JSON Extension

### Before & After: The Transformation

**Problem:** Obsidian scrambles Canvas JSON on every save, discarding semantic order and randomizing both node positions in the array and field order within objects.

### 😵‍💫 Before (Vanilla JSON Canvas)

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

**Solution:** Semantic JSON compiles spatial layout into deterministic order, preserving visual semantics as stable, legible structure.

### 🤓 After (Semantic JSON)

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

#### **Layer 1: Spatial Semantic Compilation** *(implemented)*

The foundation. Surfaces meaning explicitly encoded in Canvas visual syntax:
- `x`, `y` coordinates → Linear reading order
- Bounding box containment → Hierarchical nesting
- Edge directionality → Flow topology
- Color values → Semantic taxonomy

#### **Layer 2: Content Identity Extraction** *(planned)*

Identity key extraction from structured text node content:
- **YAML**: `title`, `name`, `id` fields
- **Markdown**: First header + level (`# Title` → `"Title"`)
- **JSON**: `id`, `name`, `title` keys
- **Code blocks**: Language tag only (not content)

Not parsing. Not interpreting. **Extracting identity keys from existing syntax conventions.**

#### **Layer 3: Fallback Determinism** *(always active)*

Ensures stable, predictable ordering when higher layers don't apply:
- Plain text: Alphabetical sorting (Unicode collation)
- Long content: Stable truncation rules
- No content: ID fallback (lexicographic)

All three layers preserve JSON Canvas spec compliance—no data added, removed, or mutated. Only interpretation and arrangement.

---
### Main Process

### 1) 📦 +📍  Compiled Node Ordering (ZK-INDEX)

#### 👁️‍🗨️ Node Visual Semantics

**Link node placement**: Link nodes function as references/citations, appearing after primary content (like footnotes) when not in a flow group.

**Color taxonomy**: Color grouping (when enabled) preserves visual semantic categories such as:

- 🔴 = urgent/error
- 🟠 = warning
- 🟡 = in-progress
- 🟢 = success/complete
- 🔵 = info/reference
- 🟣 = special/custom

**Flow topology**: When flow sorting is enabled, directional arrows define information flow, transforming spatial diagrams into linear reading order based on dependency graphs. Workflows and pipelines become sequential narratives.

**Reading order**: Top-left to bottom-right spatial interpretation, depth-first through the containment hierarchy (or topological flow order when flow sorting enabled).

**Hierarchical containment**: Spatial containment (bounding boxes) creates explicit nesting. A node is contained by a group if its bounding box (x, y, width, height) falls entirely within the group's bounding box. For overlapping groups, the smallest containing group is chosen. This makes group structure explicit for linear readers without requiring spatial reconstruction.

**Example order**: `orphan-1` → `group-A` → `group-A-child-1` → `group-A-child-2` → `nested-group-B` → `nested-group-B-child-1` → `group-C` → ...

```crystal
# Hierarchical node ordering (depth-first traversal)

class HierarchicalOrdering
  def root_orphan_nodes
    # Not contained by any group
    sort_by: [spatial_or_flow, type, color, content]
  end

  def root_groups
    # Not nested within other groups
    sort_by: [spatial_or_flow, type, color, content]
    followed_immediately_by: [
      non_group_children,    # sorted by rules below
      nested_group_children  # sorted recursively with their contents
    ]
  end
end
```

This creates depth-first traversal: each group appears immediately followed by all its contents before the next sibling group.

#### 💫 Core Sorting Rules

When **flow sorting is disabled** (default), nodes within each scope are sorted by:
```crystal
# Spatial mode sorting (cascading comparison keys)

def sort_nodes(nodes)
  nodes.sort_by do |node|
    [
      node.position.y,      # ascending
      node.position.x,      # ascending
      node.type_priority,   # content nodes (text/file/group) first, links last
      node.color,           # optional: group same colors (uncolored first)
      node.content_key      # alphabetical by semantic content
    ]
  end
end

# Content key extraction by node type
def content_key(node)
  case node.type
  when "text"  then node.text
  when "file"  then File.basename(node.file)
  when "link"  then node.url  # preserves protocol
  when "group" then node.label
  else node.id  # fallback
  end.downcase.strip
end
```

####  🔗 Flow Sorting Rules

When **flow sorting is enabled** (optional, disabled by default), nodes within each scope are sorted by:

**Edge directionality**:
```crystal
# Flow analysis: edge direction semantics

enum EdgeDirection
  ForwardArrow        # fromEnd: none, toEnd: arrow (default)
  ReverseArrow        # fromEnd: arrow, toEnd: none (dependency)
  Bidirectional       # fromEnd: arrow, toEnd: arrow (chain connector)
  NonDirectional      # fromEnd: none, toEnd: none (ignored)
end

# Bidirectional edge resolution (inherits from neighbors)
# → ↔ → becomes → → → (forward chain)
# ← ↔ → becomes ← ← → (split point)
```

**For nodes in flow groups** (connected by directional edges):
```crystal
# Flow mode sorting (topological order takes precedence)

def sort_flow_group_nodes(nodes, flow_group)
  nodes.sort_by do |node|
    [
      flow_group.min_position,    # top-left node (min y, min x)
      node.flow_depth,            # topological order (overrides type priority!)
      node.position.y,            # within same depth
      node.position.x,            # within same depth
      node.color,                 # optional: group same colors
      node.content_key            # alphabetical
    ]
  end
end

# Flow depth assignment (BFS-based topological sort)
class FlowDepth
  SOURCE      = 0              # only outgoing arrows
  INTERMEDIATE = longest_path  # based on longest path from source
  SINK        = max_depth      # only incoming arrows
end
```

**For isolated nodes** (not in any flow group):
```crystal
# Isolated nodes (standard spatial sorting, no flow depth)

def sort_isolated_nodes(nodes)
  nodes.sort_by do |node|
    [
      node.position.y,      # ascending
      node.position.x,      # ascending
      node.type_priority,   # links to bottom (like footnotes)
      node.color,           # optional: group same colors
      node.content_key      # alphabetical
    ]
  end
end
```

#### 🏠 Orphan Node Sorting

**Orphan nodes** are nodes not contained within any group. By default, they sort spatially (by position), but can optionally be grouped and sorted semantically.

**Default behavior** (spatial sorting):
- Orphans sort by position (y, x coordinates) alongside groups
- Maintains original Canvas spatial layout
- Mixed positioning: orphans interspersed with groups based on coordinates

**🏠 Group orphan nodes** (optional, `--group-orphan-nodes`):
- All orphan nodes grouped together at the top of the document
- Within the orphan group, nodes sort semantically (by content) instead of spatially
- Groups still sort spatially and appear after orphans
- Creates clear document structure: orphans → groups → nested content

```crystal
# Group orphan nodes (when enabled)

def group_orphan_nodes(orphan_nodes)
  orphan_nodes.sort_by do |node|
    [
      node.type_priority,   # content nodes before links
      node.color,           # optional: group same colors
      node.content_key      # alphabetical by content
    ]
  end
end

# Document structure with group orphan nodes:
# 1. All orphan nodes (sorted semantically)
# 2. All root groups (sorted spatially)
#    - Group children (sorted semantically within groups)
```

**Use cases:**
- **🏠 Group orphan nodes**: When orphans represent metadata, references, or standalone concepts that should be grouped together
- **Spatial orphan sorting** (default): When orphans are positioned intentionally and should maintain their spatial relationships with groups

### 2)  ↘️ Compiled Edge Ordering

#### 👁️‍🗨️ Edge Visual Semantics

**Spatial topology**: Edges encode directional information flow. They appear in the order a reader would trace them visually (top-to-bottom, left-to-right).

**Color-coded flows**: Edge colors (when enabled) preserve visual flow semantics such as:

- 🟢 = success path / horizontal connections
- 🔴 = error path / critical flow
- 🔵 = vertical connections / downward flow
- 🟡 = alternative path / horizontal flow
- 🟠 = warning path
- 🟣 = special connections

**Flow inheritance**: When flow sorting is enabled, edges follow the topological order of their connected nodes rather than spatial positions. This transforms flow diagrams, system architectures, and dependency graphs into sequential narratives where edges appear in execution/causation order.

**Example**: In a data pipeline `Extract → Transform → Load`, edges appear as: `Extract→Transform`, `Transform→Load` (sequential flow) rather than random ID order.

When **flow sorting is disabled** (default), edges are sorted by **spatial topology**:

```crystal
# Edge ordering: spatial mode (topology-based)

def sort_edges_spatial(edges, node_positions)
  edges.sort_by do |edge|
    from_pos = node_positions[edge.from_node]
    to_pos = node_positions[edge.to_node]

    [
      from_pos.y,       # fromNode y position (ascending)
      from_pos.x,       # fromNode x position (ascending)
      to_pos.y,         # toNode y position (ascending)
      to_pos.x,         # toNode x position (ascending)
      edge.color,       # optional: group same colors (uncolored first)
      edge.id           # fallback: lexicographic determinism
    ]
  end
end
```

When **flow sorting is enabled** (optional, disabled by default), edges inherit their connected nodes' flow order:

```crystal
# Edge ordering: flow mode (inherits topological depth)

def sort_edges_flow(edges, flow_groups, node_positions)
  edges.sort_by do |edge|
    from_depth = flow_groups[edge.from_node]&.depth || Float::INFINITY
    to_depth = flow_groups[edge.to_node]&.depth || Float::INFINITY

    # Spatial fallback for isolated nodes
    from_pos = node_positions[edge.from_node]
    to_pos = node_positions[edge.to_node]

    [
      from_depth,       # fromNode flow depth (topological order)
      to_depth,         # toNode flow depth (topological order)
      from_pos.y,       # spatial fallback: fromNode y
      from_pos.x,       # spatial fallback: fromNode x
      to_pos.y,         # spatial fallback: toNode y
      to_pos.x,         # spatial fallback: toNode x
      edge.color,       # optional: group same colors
      edge.id           # fallback: lexicographic determinism
    ]
  end
end
```

## III. 🎮 **Commands & Settings**

### 🎛️ Plugin Settings

The following sorting options can be configured in plugin settings:

- **Auto-compile on save** (default: enabled): Automatically compile canvas files when saved
- **Color sort nodes** (default: enabled): Group nodes by color within same position
- **Color sort edges** (default: enabled): Group edges by color within same topology
- **Flow sort nodes** (default: disabled): Sort by directional flow topology instead of spatial position
- **🏠 Group orphan nodes** (default: disabled): Group orphan nodes first before sorting spatially
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
- **Labeled edge relationships**: Embedded directly in nodes via `via` property

#### 🔗 Labeled Edge Embedding

Labeled edges are automatically embedded into connected nodes as directional `from` and `to` arrays, preserving flow semantics while creating self-contained relationship data.

**Transformation behavior:**

**Labeled edges** (edges with `label` property):
- Embedded into connected nodes as directional arrays
- `from` array: incoming relationships (what this node receives)
- `to` array: outgoing relationships (what this node sends)
- Each entry: `{"node": "target_id", "label": "relationship_name"}`
- Preserves directional flow semantics
- Removed from main `edges` array (no duplication)

**Unlabeled edges** (edges without `label` property):
- Follow existing behavior (stripped or preserved based on flow settings)
- Remain in main `edges` array when preserved

**Example transformation:**

```json
// Before: Traditional edge array
{
  "nodes": [
    {"id": "A", "type": "text", "text": "Start Process"},
    {"id": "B", "type": "text", "text": "End Process"}
  ],
  "edges": [
    {"id": "edge1", "fromNode": "A", "toNode": "B", "label": "triggers"},
    {"id": "edge2", "fromNode": "A", "toNode": "B"}
  ]
}

// After: Labeled edges embedded with directionality, unlabeled preserved
{
  "nodes": [
    {
      "id": "A",
      "type": "text", 
      "text": "Start Process",
      "to": [{"node": "B", "label": "triggers"}]
    },
    {
      "id": "B",
      "type": "text",
      "text": "End Process", 
      "from": [{"node": "A", "label": "triggers"}]
    }
  ],
  "edges": [
    {"id": "edge2", "fromNode": "A", "toNode": "B"}
  ]
}
```

**Benefits:**
- **Self-contained nodes**: Each node carries its relationship context
- **Semantic preservation**: Relationship labels maintained and accessible
- **Directional flow**: Clear distinction between incoming and outgoing relationships
- **Efficient traversal**: Easy to navigate relationships in either direction
- **Cleaner structure**: Reduces edge array size, focuses on meaningful connections
- **LLM-friendly**: Relationships co-located with node content for better context

#### 📊 Edge Processing Rules

**Edge stripping behavior:**

When **flow sorting is enabled** OR **strip edges when flow-sorted** is enabled:
- Unlabeled edges are automatically removed from pure JSON exports
- Edge topology is **compiled into node sequence order** (when flow sorting enabled)
- The directed graph becomes a sequential narrative
- Relationships are implicit in array position (nodes appear in execution/dependency order)

When **flow sorting is disabled** AND **strip edges when flow-sorted** is disabled:
- Unlabeled edges are preserved in pure JSON exports
- Graph topology remains explicit
- Relationships require edges array for interpretation

**Rationale:** When flow sorting compiles edge topology into node sequence order, edges become presentation scaffolding—their semantic meaning (source → intermediate → sink) is already encoded in the linear array position. Stripping edges produces minimal data artifacts where relationships are implicit in ordering rather than explicit in graph structure.

**Use cases:**
- **Labeled relationship networks**: Knowledge graphs, semantic models, workflow diagrams
- **Flow-sorted exports**: Sequential workflows, execution plans, dependency lists (edges stripped by default)
- **Spatial exports**: Network diagrams, relationship maps (edges preserved by default)

### 📥 Import JSON to Canvas

The **"Import JSON to Canvas"** command creates visual scaffolding from pure JSON data structures, generating Canvas nodes with spatial layout.

**Input:** Pure JSON (objects, arrays, primitives)
**Output:** Valid `.canvas` file with visual representation

### 📥 Import JSONL to Canvas

The **"Import JSONL to Canvas"** command creates visual scaffolding from JSONL (JSON Lines) data, where each line contains a separate JSON object. Each object becomes a separate record group in the canvas.

**Input:** JSONL file (multiple JSON objects, one per line)
**Output:** Valid `.canvas` file with visual representation of all records

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

**JSONL-specific layout:**
- Each JSON object becomes a "Record N" group
- Records are arranged in a grid with monitor-friendly aspect ratio (approximately 16:9)
- Grid dimensions are automatically calculated based on record count
- Alternating colors for visual separation
- All transformation rules apply within each record group

**Generated Canvas metadata:**

All imported nodes receive:
- `x`, `y`: Spatial position (auto-calculated grid layout)
- `width`, `height`: Node dimensions (based on content size)
- `color`: Optional (can apply taxonomy colors based on data type, alternating for JSONL records)
- `id`: Deterministic (derived from JSON path: `root.users.0.name`)

**Spatial layout algorithm:**

1. **Hierarchical positioning**: Parent groups positioned first
2. **Grid-based arrangement**: Children laid out in predictable grid
3. **Depth offset**: Nested groups indented/offset for visual hierarchy
4. **Collision avoidance**: Nodes never overlap
5. **JSONL grid layout**: Records arranged in monitor-friendly grid with optimal aspect ratio

**Use cases:**
- Visualize JSON data structures (API responses, config files, etc.)
- Visualize JSONL datasets (logs, streaming data, batch records)
- Author structured data visually in Canvas, export as clean JSON
- Round-trip editing: JSON/JSONL → Canvas (visual edit) → JSON

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

The difference isn't capability—it's **cognitive load**. Vanilla JSON Canvas asks both humans and models to mentally compile spatial coordinates into reading order. Semantic JSON does that work once, deterministically, preserving the result as structure.

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
