---
name: graphify
description: >-
  Turn any codebase, documentation, schemas, and notes into a queryable knowledge graph.
  Use this skill when the user wants to run graphify, analyze codebase architecture, map
  dependencies, inspect cross-file connections, or query knowledge graphs.
---

# Graphify Skill

Turn any folder of code, docs, and assets into an interactive knowledge graph, audit report, and queryable structure.

## Command Execution

If `graphify` is directly available in PATH:
```bash
graphify <path> [flags]
```

If installed via `uv` / `uvx` without PATH configuration:
```bash
uvx --from graphifyy graphify <path> [flags]
```

## Common Workflows

### 1. Build Full Knowledge Graph
Run against the current repository / folder:
```bash
graphify .
```
Or for deeper semantic and implicit dependency extraction:
```bash
graphify . --mode deep
```

### 2. Incremental Update
Re-extract only modified or new files, merging them into the existing graph:
```bash
graphify . --update
```

### 3. Querying the Graph
- **BFS traversal / broad context:**
  ```bash
  graphify query "<question>"
  ```
- **Trace shortest path between two concepts/modules:**
  ```bash
  graphify path "<NodeA>" "<NodeB>"
  ```
- **Explain a specific node:**
  ```bash
  graphify explain "<NodeName>"
  ```

## Generated Outputs

All outputs are saved in `graphify-out/`:
- **`graph.html`**: Interactive web visualization of the graph (open in any browser).
- **`GRAPH_REPORT.md`**: Comprehensive architectural audit highlighting central nodes, clusters, and unusual couplings.
- **`graph.json`**: Graph data format for persistent caching and GraphRAG queries.
- **`obsidian/`**: Markdown vault with wikilinks compatible with Obsidian.
