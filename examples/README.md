# 🧪 Examples Index

This folder contains self-documenting examples demonstrating Semantic JSON's compilation and export features.

## 📁 File Index

| File | Type | Purpose |
|------|------|---------|
| [`conformance-test-card.canvas`](./conformance-test-card.canvas) | JSON Canvas | **Primary test file.** Nodes literally describe their expected positions—the file documents itself. |
| [`conformance-test-card.json`](./conformance-test-card.json) | Pure JSON | Exported version with spatial metadata stripped. Compare to `.canvas` to see what gets removed. |
| [`conformance-test-card.png`](./conformance-test-card.png) | Screenshot | Visual reference showing how the test card renders in Obsidian. |
| [`before-after.png`](./before-after.png) | Screenshot | Hero image comparing scrambled vs semantic JSON ordering. |
| [`🩷Catppuccin.pure.json`](./%F0%9F%A9%B7Catppuccin.pure.json) | Pure JSON | Real-world example: Catppuccin color palettes exported for LLM consumption. |

## 🔬 How to Use These Examples

### Test the Conformance Card

1. Copy `conformance-test-card.canvas` into your Obsidian vault
2. Open it in Obsidian Canvas
3. Make any change and save
4. Observe: **Obsidian scrambles the node order**
5. Install Semantic JSON plugin
6. Save again
7. Observe: **Order is restored to semantic sequence**

### Understand the Transformation

Compare these two files side-by-side:

```
conformance-test-card.canvas  →  conformance-test-card.json
         ↓                                ↓
   Full Canvas format              Pure data artifact
   (x, y, width, height)          (only semantic content)
   (color, fromSide, toSide)      (edges simplified)
```

The `.json` is what you'd feed to an LLM or use in a pipeline.

### What the Test Card Tests

- ✅ **Spatial ordering**: Top-left to bottom-right reading sequence
- ✅ **Hierarchical grouping**: Groups followed by their children
- ✅ **Nested groups**: Child groups within parent groups
- ✅ **Color taxonomy**: Edges colored by direction (horizontal vs vertical)
- ✅ **Mixed node types**: Text nodes, link nodes, groups
- ✅ **Edge topology**: Arrows ordered by connected node positions

## 🩷 About the Catppuccin Example

[`🩷Catppuccin.pure.json`](./%F0%9F%A9%B7Catppuccin.pure.json) demonstrates:

- **Unicode filename handling** (the pink heart emoji)
- **Real-world content** (color palette definitions)
- **LLM-ready format** (clean JSON, no rendering metadata)
- **Multiple palette variants** (mocha-frappe, rose, sage, grape, honey, etc.)

This is the kind of output you'd share with an AI assistant or consume in a data pipeline.

## 🔗 Related Methodologies

This self-documenting examples pattern aligns with broader documentation architectures:

- **[Context Engineering Skills](https://github.com/SyntaxAsSpiral/zk-context-vault/blob/master/skills/README.md)** - Dual-format documentation system using similar conformance testing patterns
- **[ZK Context Vault](https://github.com/SyntaxAsSpiral/zk-context-vault)** - Comprehensive agent system documentation following self-documenting principles

## 🚧 Future Examples (Contributions Welcome!)

- [ ] `sample-data.jsonl` — JSONL import demonstration
- [ ] `sample-data.canvas` — Result of JSONL → Canvas import
- [ ] `🩷Catppuccin.canvas` — Source canvas for the pure JSON export
- [ ] `scrambled-example.json` — "Before" state showing what bad ordering looks like

---

← [Back to main README](../README.md)
