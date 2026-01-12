# Implementation Plan: Semantic JSON Canvas

## Overview

This implementation plan covers the existing TypeScript-based Obsidian plugin and CLI tool for semantic JSON Canvas compilation. The system transforms Canvas files from scrambled JSON into semantically ordered, human and LLM-readable documents while maintaining full JSON Canvas specification compliance.

## Tasks

- [ ] 1. Core Compilation Engine Implementation
  - Implement the main `compileCanvasAll` function with validation and normalization
  - Create multi-dimensional sorting algorithm (spatial, flow, color, content)
  - Build hierarchical containment detection using bounding box analysis
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 1.1 Write property test for spatial ordering consistency
  - **Property 1: Spatial Ordering Consistency**
  - **Validates: Requirements 1.1, 1.3, 1.4**

- [ ]* 1.2 Write property test for hierarchical traversal preservation
  - **Property 2: Hierarchical Traversal Preservation**
  - **Validates: Requirements 1.2, 3.3, 3.4**

- [ ]* 1.3 Write property test for data preservation invariant
  - **Property 3: Data Preservation Invariant**
  - **Validates: Requirements 1.5**

- [ ] 2. Flow Topology Analysis System
  - [ ] 2.1 Implement flow group detection with connected component analysis
    - Build adjacency graphs for directional edge analysis
    - Detect connected components using undirected graph traversal
    - _Requirements: 2.1, 2.2_

  - [ ] 2.2 Implement BFS-based topological sorting for flow depth assignment
    - Create topological ordering algorithm with cycle handling
    - Assign flow depths using longest path from source nodes
    - _Requirements: 2.2, 2.4_

  - [ ]* 2.3 Write property test for flow topology ordering
    - **Property 4: Flow Topology Ordering**
    - **Validates: Requirements 2.1, 2.2, 2.4**

  - [ ]* 2.4 Write property test for edge direction recognition
    - **Property 5: Edge Direction Recognition**
    - **Validates: Requirements 2.5**

- [ ] 3. Hierarchical Containment System
  - [ ] 3.1 Implement precise bounding box containment detection
    - Create geometric containment checking algorithm
    - Handle overlapping groups with smallest-area resolution
    - _Requirements: 3.1, 3.2_

  - [ ] 3.2 Build parent-child mapping for depth-first traversal
    - Create hierarchical structure mapping
    - Support nested group structures with recursive processing
    - _Requirements: 3.3, 3.4_

  - [ ]* 3.3 Write property test for containment detection accuracy
    - **Property 6: Containment Detection Accuracy**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 3.4 Write property test for orphan node handling
    - **Property 7: Orphan Node Handling**
    - **Validates: Requirements 3.5**

- [ ] 4. Multi-Dimensional Sorting Implementation
  - [ ] 4.1 Implement color-based sorting with configuration support
    - Create color normalization and comparison functions
    - Support both preset colors (1-6) and hex color values
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 4.2 Implement content key extraction for semantic sorting
    - Extract content keys from different node types (text, file, link, group)
    - Normalize content for consistent alphabetical sorting
    - _Requirements: 1.4_

  - [ ]* 4.3 Write property test for color sorting behavior
    - **Property 8: Color Sorting Behavior**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 5. Edge Topology Sorting System
  - [ ] 5.1 Implement spatial and flow-based edge sorting
    - Sort edges by connected node positions in spatial mode
    - Sort edges by topological depth in flow mode
    - _Requirements: 5.1, 5.2_

  - [ ] 5.2 Implement edge color sorting and metadata preservation
    - Group edges by color within same topology when enabled
    - Preserve all edge metadata during compilation
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ]* 5.3 Write property test for edge topology sorting
    - **Property 9: Edge Topology Sorting**
    - **Validates: Requirements 5.1, 5.2, 5.4**

  - [ ]* 5.4 Write property test for edge metadata preservation
    - **Property 10: Edge Metadata Preservation**
    - **Validates: Requirements 5.3, 5.5**

- [ ] 6. Checkpoint - Ensure core compilation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Pure JSON Export System
  - [ ] 7.1 Implement metadata stripping for clean data export
    - Remove spatial metadata (x, y, width, height)
    - Remove visual metadata (color, background, backgroundStyle)
    - Preserve content fields (id, type, text, file, url, label)
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 7.2 Implement labeled edge embedding system
    - Separate labeled and unlabeled edges
    - Create bidirectional relationship arrays (from/to) in connected nodes
    - Maintain directional flow semantics
    - _Requirements: 6.4_

  - [ ] 7.3 Implement conditional edge stripping
    - Remove unlabeled edges when flow sorting enabled or stripEdgesWhenFlowSorted true
    - Preserve labeled edges as embedded relationships
    - _Requirements: 6.5_

  - [ ]* 7.4 Write property test for pure JSON transformation
    - **Property 11: Pure JSON Transformation**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [ ]* 7.5 Write property test for conditional edge stripping
    - **Property 12: Conditional Edge Stripping**
    - **Validates: Requirements 6.5**

- [ ] 8. Enhanced Import System
  - [ ] 8.1 Implement JSON structure transformation
    - Convert objects to Canvas groups with child text nodes
    - Convert arrays to indexed groups with length labels
    - Convert primitives to formatted text nodes
    - _Requirements: 7.1, 7.4, 7.5_

  - [ ] 8.2 Implement JSONL grid layout system
    - Calculate monitor-friendly aspect ratios (16:9 to 16:10)
    - Arrange records in optimal grid configuration
    - Apply rainbow gradient coloring system
    - _Requirements: 7.2_

  - [ ] 8.3 Implement unified import with auto-detection
    - Detect format based on file extension and content structure
    - Support both .json and .jsonl files with fallback detection
    - Handle parsing errors with descriptive messages
    - _Requirements: 7.3_

  - [ ]* 8.4 Write property test for JSON import transformation
    - **Property 13: JSON Import Transformation**
    - **Validates: Requirements 7.1, 7.4, 7.5**

  - [ ]* 8.5 Write property test for JSONL import layout
    - **Property 14: JSONL Import Layout**
    - **Validates: Requirements 7.2**

  - [ ]* 8.6 Write property test for format auto-detection
    - **Property 15: Format Auto-Detection**
    - **Validates: Requirements 7.3**

- [ ] 9. Visual Feature Systems
  - [ ] 9.1 Implement hierarchical color mutation system
    - Create HSL color manipulation functions (hexToHsl, hslToHex, mutateColor)
    - Generate depth-based color variations with hue shifts
    - Apply progressive saturation and lightness adjustments
    - _Requirements: 7.1_

  - [ ] 9.2 Implement rainbow gradient color system
    - Create cyclic hue progression through 7 base colors
    - Add variation for multiple cycles to avoid repetition
    - Apply to JSONL records for visual separation
    - _Requirements: 7.2_

- [ ] 10. Configuration and Settings Management
  - [ ] 10.1 Implement plugin settings interface
    - Create settings tab with toggle controls for all options
    - Support autoCompile, colorSortNodes, colorSortEdges, flowSortNodes
    - Support semanticSortOrphans and stripEdgesWhenFlowSorted
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 10.2 Implement configuration-dependent behavior
    - Apply settings to control sorting algorithms
    - Handle orphan node grouping based on configuration
    - Control edge stripping based on flow sorting settings
    - _Requirements: 8.3, 8.4_

  - [ ]* 10.3 Write property test for configuration-dependent sorting
    - **Property 16: Configuration-Dependent Sorting**
    - **Validates: Requirements 8.3, 8.4**

- [ ] 11. Validation and Error Handling
  - [ ] 11.1 Implement comprehensive input validation
    - Validate node and edge ID uniqueness and completeness
    - Check edge-to-node reference integrity
    - Normalize IDs with whitespace trimming and type coercion
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [ ] 11.2 Implement descriptive error reporting
    - Provide specific error messages with failure details
    - Include context information (node positions, conflicting IDs)
    - Handle malformed Canvas structures gracefully
    - _Requirements: 9.4_

  - [ ]* 11.3 Write property test for comprehensive validation
    - **Property 17: Comprehensive Validation**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 12. Plugin Integration and Commands
  - [ ] 12.1 Implement Obsidian plugin commands
    - Create "Compile active canvas" command with file processing
    - Create "Export as pure JSON" command with metadata stripping
    - Create unified "Import to canvas" command with auto-detection
    - _Requirements: Plugin integration_

  - [ ] 12.2 Implement auto-compilation on save
    - Register file modification event handler
    - Implement compilation with change detection
    - Handle compilation errors with user notifications
    - _Requirements: 8.1_

  - [ ] 12.3 Implement legacy import commands
    - Maintain "Import JSON to canvas" and "Import JSONL to canvas" commands
    - Ensure backward compatibility with existing workflows
    - _Requirements: 10.5_

- [ ] 13. CLI Tool Implementation
  - [ ] 13.1 Implement command-line interface
    - Support unified --import command with auto-detection
    - Support --strip-metadata flag for pure JSON export
    - Support all configuration flags (--color-nodes, --flow-sort, etc.)
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 13.2 Implement batch processing capabilities
    - Handle multiple file processing with error recovery
    - Maintain legacy --from-json and --from-jsonl commands
    - Provide progress feedback and error reporting
    - _Requirements: 10.4, 10.5_

- [ ] 14. Output Format Consistency
  - [ ] 14.1 Implement deterministic JSON serialization
    - Use 2-space indentation for optimal diff readability
    - Include trailing newlines for POSIX compliance
    - Maintain consistent key ordering across compilations
    - _Requirements: 11.1, 11.2, 11.4, 11.5_

  - [ ]* 14.2 Write property test for deterministic output format
    - **Property 18: Deterministic Output Format**
    - **Validates: Requirements 13.1, 13.2, 13.4, 13.5**

- [ ] 15. Final Integration and Testing
  - [ ] 15.1 Wire all components together
    - Integrate compilation engine with plugin commands
    - Connect import/export systems with CLI tools
    - Ensure proper error propagation and handling
    - _Requirements: All requirements integration_

  - [ ]* 15.2 Write integration tests
    - Test end-to-end workflows (import → compile → export)
    - Test plugin command integration with Obsidian
    - Test CLI tool functionality with various inputs
    - _Requirements: Integration testing_

- [ ] 16. Smart Content-Aware Sorting Implementation
  - [ ] 16.1 Implement content type detection and parsing
    - Create YAML frontmatter detection and title/name extraction
    - Create Markdown header detection with hierarchy-aware sorting
    - Create JSON object detection and key extraction (id/name/title)
    - Create code block detection with language tag extraction
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ] 16.2 Implement smart sort key generation
    - Create getSmartSortKey function with content type routing
    - Implement configurable YAML key field priority
    - Implement graceful degradation to plain text fallback
    - Add content parsing settings to plugin configuration
    - _Requirements: 11.4, 11.5_

  - [ ]* 16.3 Write property test for smart content key extraction
    - **Property 19: Smart Content Key Extraction**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**

  - [ ]* 16.4 Write property test for content format auto-detection
    - **Property 20: Content Format Auto-Detection**
    - **Validates: Requirements 11.4, 11.5**

- [x] 17. LLM-Based Semantic ID System Implementation
  - [x] 17.1 Implement LLM configuration and settings
    - Add LLM provider settings to plugin configuration interface
    - Support multiple providers (LMStudio, Ollama, OpenRouter, OpenAI, Anthropic)
    - Create provider-specific default configurations and validation
    - Implement API key management for cloud providers
    - _Requirements: 12.5_

  - [x] 17.2 Implement LLM service integration
    - Create LLM client with multi-provider support using Obsidian's requestUrl
    - Implement request/response handling with proper error management
    - Create structured prompt for canvas analysis with complete node content
    - Handle LLM response parsing and validation
    - _Requirements: 12.1, 12.2_

  - [x] 17.3 Implement semantic ID assignment command
    - Create "Assign Semantic IDs" command in plugin interface
    - Extract all node content and send to LLM without token limits
    - Process LLM response to extract taxonomy and ID mappings
    - Implement fallback to generic kebab-case IDs when LLM fails or returns no taxonomy
    - _Requirements: 12.1, 12.3_

  - [x] 17.4 Implement canvas rewriting with reference updates
    - Update all node IDs to semantic format from LLM response
    - Update all edge fromNode/toNode references to match new IDs
    - Preserve graph connectivity during ID transformation
    - Include optional taxonomy metadata in canvas output
    - _Requirements: 12.4_

  - [x]* 17.5 Write property test for LLM-based semantic ID assignment
    - **Property 21: LLM-Based Semantic ID Assignment**
    - **Validates: Requirements 12.1, 12.2, 12.4**

  - [ ]* 17.6 Write property test for reference consistency
    - **Property 22: Reference Consistency After ID Assignment**
    - **Validates: Requirements 12.3, 12.5**

- [ ] 18. Final Integration and Testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Final Integration and Testing
  - [ ] 18.1 Wire all components together
    - Integrate smart content parsing with compilation engine
    - Integrate LLM-based semantic ID system with canvas rewriting
    - Connect new features with plugin commands and CLI tools
    - Ensure proper error propagation and handling
    - _Requirements: All requirements integration_

  - [ ]* 18.2 Write integration tests
    - Test end-to-end workflows with smart content parsing
    - Test LLM-based semantic ID assignment with various canvas types
    - Test plugin command integration with new features
    - Test CLI tool functionality with enhanced capabilities
    - _Requirements: Integration testing_

- [ ] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation is based on existing TypeScript codebase
- Focus on maintaining backward compatibility while adding new features
- Smart content parsing elevates semantic-json to "lingua franca" for structured data
- LLM-based semantic ID system makes each canvas self-describing with flexible taxonomy
- Fallback to generic kebab-case IDs ensures robustness when LLM analysis fails
- Multi-provider LLM support enables both local and cloud-based analysis