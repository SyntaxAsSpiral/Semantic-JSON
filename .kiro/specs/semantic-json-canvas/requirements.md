# Requirements Document

## Introduction

The Semantic JSON Canvas plugin transforms Obsidian Canvas files from scrambled, position-randomized JSON into semantically ordered, human and LLM-readable documents. This system acts as an "anticompiler" that surfaces spatial meaning explicitly encoded in Canvas visual syntax, creating stable Git diffs and coherent document structure while maintaining full JSON Canvas spec compliance. 

The system now includes advanced content intelligence through smart content-aware sorting that recognizes YAML, Markdown, JSON, and code structures, plus emergent type systems that infer locally-appropriate taxonomies and assign semantic node IDs. This positions semantic-json as a true "lingua franca" for structured data across formats, making each canvas self-describing with coherent type systems.

The plugin includes both Obsidian integration and standalone CLI tools for batch processing.

## Glossary

- **Canvas**: Obsidian's visual workspace format using JSON Canvas specification
- **Semantic_JSON**: Compiled JSON Canvas with deterministic ordering based on spatial semantics
- **Anticompiler**: System that inverts compilation by making machine-dense data human-legible
- **Flow_Topology**: Directional information flow encoded in edge arrows and topological sorting
- **Orphan_Nodes**: Nodes not contained within any group
- **Pure_JSON**: Exported JSON with Canvas-specific metadata stripped for clean data artifacts
- **Hierarchical_Coloring**: Depth-based color mutations for nested structures
- **Rainbow_Gradient**: Color system for JSONL records using hue cycling
- **Smart_Content_Parsing**: Intelligent extraction of semantic keys from YAML, Markdown, JSON, and code content
- **Emergent_Type_System**: Locally-inferred taxonomy generated from canvas content patterns
- **Semantic_ID**: Node identifier encoding inferred type and content hash (type::variant::hash)
- **Type_Taxonomy**: Coherent classification system specific to individual canvas content

## Requirements

### Requirement 1: Spatial Semantic Compilation

**User Story:** As a Canvas user, I want my Canvas files to maintain semantic order based on visual layout, so that the JSON structure reflects the intended reading flow and remains stable across saves.

#### Acceptance Criteria

1. WHEN a Canvas file is compiled, THE Semantic_JSON SHALL order nodes by spatial position (top-to-bottom, left-to-right)
2. WHEN nodes are contained within groups, THE Semantic_JSON SHALL create hierarchical nesting with depth-first traversal
3. WHEN nodes have the same spatial position, THE Semantic_JSON SHALL sort by type priority (content nodes before links)
4. WHEN nodes have identical position and type, THE Semantic_JSON SHALL sort alphabetically by content key
5. THE Semantic_JSON SHALL preserve all original Canvas data without adding or removing fields

### Requirement 2: Flow Topology Processing

**User Story:** As a workflow designer, I want directional arrows to define information flow order, so that my process diagrams become sequential narratives in the compiled JSON.

#### Acceptance Criteria

1. WHEN flow sorting is enabled, THE Semantic_JSON SHALL analyze edge directionality to determine topological order
2. WHEN nodes are connected by directional edges, THE Semantic_JSON SHALL sort by flow depth using BFS-based topological sorting
3. WHEN edges have bidirectional arrows, THE Semantic_JSON SHALL resolve direction based on neighboring edge patterns
4. WHEN nodes are isolated from flow groups, THE Semantic_JSON SHALL fall back to spatial sorting
5. THE Semantic_JSON SHALL support forward arrows (default), reverse arrows, and bidirectional edges

### Requirement 3: Hierarchical Containment

**User Story:** As a knowledge organizer, I want spatial containment to create explicit nesting, so that group structures are preserved in linear reading order.

#### Acceptance Criteria

1. WHEN a node's bounding box falls entirely within a group's bounding box, THE Semantic_JSON SHALL treat it as contained
2. WHEN nodes overlap multiple groups, THE Semantic_JSON SHALL assign to the smallest containing group by area
3. WHEN groups are nested, THE Semantic_JSON SHALL create recursive hierarchical structure with depth-first traversal
4. WHEN processing group contents, THE Semantic_JSON SHALL sort children semantically before moving to next sibling group
5. THE Semantic_JSON SHALL handle orphan nodes according to the semanticSortOrphans configuration setting

### Requirement 4: Color Taxonomy Preservation

**User Story:** As a visual thinker, I want color coding to be preserved in the compiled order, so that semantic categories remain grouped together.

#### Acceptance Criteria

1. WHEN color sorting is enabled, THE Semantic_JSON SHALL group nodes by color within same spatial position
2. WHEN nodes have preset colors (1-6) or hex colors, THE Semantic_JSON SHALL sort by color value
3. WHEN nodes are uncolored, THE Semantic_JSON SHALL place them before colored nodes
4. WHEN color sorting is disabled, THE Semantic_JSON SHALL ignore color in sorting decisions
5. THE Semantic_JSON SHALL apply color sorting to both nodes and edges independently based on settings

### Requirement 5: Edge Compilation and Topology

**User Story:** As a systems architect, I want edge relationships to follow logical flow order, so that connection diagrams read as coherent sequences.

#### Acceptance Criteria

1. WHEN compiling edges in spatial mode, THE Semantic_JSON SHALL sort by fromNode position then toNode position
2. WHEN compiling edges in flow mode, THE Semantic_JSON SHALL sort by topological depth of connected nodes
3. WHEN edges have labels, THE Semantic_JSON SHALL preserve label information in compiled order
4. WHEN edges have colors and color sorting is enabled, THE Semantic_JSON SHALL group by color within same topology
5. THE Semantic_JSON SHALL maintain edge directionality metadata (fromEnd, toEnd, fromSide, toSide)

### Requirement 6: Pure JSON Export with Labeled Edge Embedding

**User Story:** As a data analyst, I want to export clean JSON without Canvas metadata, so that I can use the structured data in other systems while preserving semantic order and relationships.

#### Acceptance Criteria

1. WHEN exporting pure JSON, THE Semantic_JSON SHALL strip spatial metadata (x, y, width, height)
2. WHEN exporting pure JSON, THE Semantic_JSON SHALL strip visual metadata (color, background, backgroundStyle)
3. WHEN exporting pure JSON, THE Semantic_JSON SHALL preserve node structure (id, type, text, file, url, label)
4. WHEN labeled edges exist, THE Semantic_JSON SHALL embed them as directional arrays (from/to) in connected nodes
5. WHEN flow sorting is enabled or stripEdgesWhenFlowSorted is true, THE Semantic_JSON SHALL remove unlabeled edges from export

### Requirement 7: Enhanced Import System with Visual Features

**User Story:** As a data visualizer, I want to import JSON and JSONL files as Canvas structures with enhanced visual features, so that I can visually edit structured data and export it back to clean JSON.

#### Acceptance Criteria

1. WHEN importing JSON files, THE Semantic_JSON SHALL create hierarchical group structures with depth-based color mutations
2. WHEN importing JSONL files, THE Semantic_JSON SHALL arrange records in monitor-friendly grid layout with rainbow gradient coloring
3. WHEN importing via unified command, THE Semantic_JSON SHALL auto-detect format based on file extension and content structure
4. WHEN importing objects, THE Semantic_JSON SHALL convert keys to child text nodes within group containers
5. WHEN importing arrays, THE Semantic_JSON SHALL convert elements to child nodes with array indexing and length labels

### Requirement 8: Configuration Management and Auto-Compilation

**User Story:** As a plugin user, I want configurable sorting options and automatic compilation, so that I can customize the behavior for different use cases and maintain consistency.

#### Acceptance Criteria

1. WHEN autoCompile is enabled, THE Semantic_JSON SHALL automatically compile Canvas files on save
2. WHEN colorSortNodes is enabled, THE Semantic_JSON SHALL group nodes by color within spatial positions
3. WHEN flowSortNodes is enabled, THE Semantic_JSON SHALL use topological order instead of spatial position
4. WHEN semanticSortOrphans is enabled, THE Semantic_JSON SHALL collect orphan nodes at document top with semantic sorting
5. WHEN stripEdgesWhenFlowSorted is enabled, THE Semantic_JSON SHALL remove unlabeled edges from pure JSON exports

### Requirement 9: Validation and Error Handling

**User Story:** As a Canvas author, I want clear error messages for invalid Canvas structures, so that I can fix issues and ensure successful compilation.

#### Acceptance Criteria

1. WHEN nodes have duplicate IDs, THE Semantic_JSON SHALL throw descriptive error with conflicting IDs
2. WHEN edges reference non-existent nodes, THE Semantic_JSON SHALL throw error with invalid node references
3. WHEN nodes have empty or missing IDs, THE Semantic_JSON SHALL throw error indicating missing ID
4. WHEN Canvas structure is malformed, THE Semantic_JSON SHALL provide specific validation failure details
5. THE Semantic_JSON SHALL normalize node IDs by trimming whitespace and coercing types to strings

### Requirement 10: CLI Tool Integration

**User Story:** As a developer, I want command-line tools for batch processing and CI/CD integration, so that I can automate Canvas compilation and data processing workflows.

#### Acceptance Criteria

1. WHEN using the unified --import command, THE CLI SHALL auto-detect JSON/JSONL format and create optimized Canvas layouts
2. WHEN using --strip-metadata flag, THE CLI SHALL export pure JSON without Canvas-specific metadata
3. WHEN processing Canvas files, THE CLI SHALL support all plugin configuration options via command-line flags
4. WHEN batch processing multiple files, THE CLI SHALL handle errors gracefully and continue processing
5. THE CLI SHALL maintain backward compatibility with legacy --from-json and --from-jsonl commands

### Requirement 11: Smart Content-Aware Sorting

**User Story:** As a knowledge worker using structured content, I want text nodes to be sorted by their semantic content rather than raw text, so that YAML templates, Markdown headers, and JSON data are organized intelligently.

#### Acceptance Criteria

1. WHEN a text node contains YAML frontmatter, THE Semantic_JSON SHALL extract title/name fields for sorting keys
2. WHEN a text node contains Markdown headers, THE Semantic_JSON SHALL extract the first header and use hierarchy-aware sorting
3. WHEN a text node contains JSON data, THE Semantic_JSON SHALL extract id/name/title fields for semantic ordering
4. WHEN smart content parsing is enabled, THE Semantic_JSON SHALL auto-detect content format and gracefully degrade to plain text
5. THE Semantic_JSON SHALL provide configuration options for YAML key field priority and content parsing behavior

### Requirement 12: LLM-Based Semantic ID Assignment

**User Story:** As a Canvas author, I want to use an LLM to analyze my canvas content and assign semantic IDs with optional taxonomy, so that my canvas becomes self-describing with meaningful identifiers.

#### Acceptance Criteria

1. WHEN the "Assign Semantic IDs" command is executed, THE Semantic_JSON SHALL send all node content to the configured LLM without token limits
2. WHEN the LLM returns a structured response, THE Semantic_JSON SHALL apply the taxonomy and semantic ID mappings to the canvas
3. WHEN the LLM fails or returns no taxonomy, THE Semantic_JSON SHALL assign generic sequential kebab-case IDs (node-001, node-002, etc.)
4. WHEN semantic IDs are assigned, THE Semantic_JSON SHALL update all edge references to maintain graph connectivity
5. THE Semantic_JSON SHALL provide LLM configuration options for multiple providers (local and cloud) through the Obsidian settings interface

### Requirement 13: Output Format Consistency and Determinism

**User Story:** As a version control user, I want consistent JSON formatting and deterministic output, so that Git diffs show only meaningful changes and remain readable.

#### Acceptance Criteria

1. THE Semantic_JSON SHALL use 2-space indentation for optimal diff readability
2. THE Semantic_JSON SHALL include trailing newlines for POSIX compliance
3. THE Semantic_JSON SHALL use UTF-8 encoding for universal compatibility
4. THE Semantic_JSON SHALL maintain deterministic key ordering for consistent serialization
5. THE Semantic_JSON SHALL produce identical output for identical input across multiple compilations