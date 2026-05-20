# 🏗️ Architecture & Sync Details

[🏠 Home](index.md) | [🚀 Getting Started](getting-started.md) | [💻 Command Reference](commands-reference.md) | [🏗️ Architecture & Sync](architecture-sync.md) | [🔌 Frappe & Subpaths](frappe-integration.md) | [🛠️ Troubleshooting](troubleshooting.md)

---

This document outlines the internal architecture of `builder-cli`, the workspace layout design, and the file serialization mechanisms that translate filesystem assets to Frappe resources.

---

## 📂 Workspace Directory Layout

When assets are pulled, they are structured into modular files and folders optimized for file-system navigation:

```
workspace/
├── pages/
│    └── [Page_Name_Or_ID]/
│         ├── page.json              # Main Page metadata (routing, title)
│         ├── head.html              # Custom <head> script overrides
│         ├── body.html              # Custom CSS or body overrides
│         ├── data_script.py         # Page data python controller
│         ├── .last_modified         # Sync baseline timestamp
│         └── blocks/                # Hierarchical layout directory tree
│              └── root/
│                   ├── block.json   # Container block layout settings
│                   └── child_block_1c3r4/
│                        ├── block.json
│                        ├── client_script.js
│                        └── data_script.py
└── components/
     └── [Component_Name_Or_ID]/
          ├── component.json         # Unified layout and metadata representation
          └── .last_modified         # Sync baseline timestamp
```

---

## 🧩 1. The Unified Component Serialization Fallback (Bug Fix)

### The Challenge
A critical design bug existed in the initial release of `builder-cli`. The component sync service (`buildComponent.ts`) was written to expect a full sub-folder tree inside a `blocks/` directory (similar to pages). However, when Frappe Builder serializes and transfers components, it groups all structural information into a single unified JSON field string named `block` inside `component.json`. As a result:
1.  Pulled components lacked a nested `blocks/` directory.
2.  The sync parser returned a `null` block payload.
3.  Pushed components were wiped clean on the server database.

### The Solution
We patched `src/services/buildComponent.ts` to implement a robust, multi-layer fallback:
```typescript
// 1. Try to parse from workspace blocks sub-folders if they exist
const blocksDir = `${componentDir}/blocks/`;
let rootBlock: Block | null = null;
if (fileExists(blocksDir)) {
    const dirContents = readDir(blocksDir);
    if (dirContents && dirContents.length > 0) {
        const componentRootDir = dirContents[0];
        if (fileExists(`${blocksDir}/${componentRootDir}`)) {
            rootBlock = readBlocksRecursively(`${blocksDir}/${componentRootDir}`);
        }
    }
}

// 2. Fallback: If no blocks folder is present, deserialize the block directly from component.json
if (!rootBlock && componentData.block) {
    rootBlock = typeof componentData.block === "string" 
        ? JSON.parse(componentData.block) 
        : componentData.block;
}
```
This ensures components are read and updated seamlessly whether they are unpacked locally or stored as a unified JSON block string.

---

## 🌳 2. Recursive Page and Block Construction

Unlike components, pages are highly nested layout trees. The builder handles this tree-like complexity recursively:

### Page Parser (`src/services/buildPage.ts`)
*   Scans the page directory for secondary overrides (`head.html`, `body.html`, and `data_script.py`).
*   Resolves the page's root block under `/blocks/root/`.
*   Triggers recursive traversal to pack all children blocks together.

### Recursive Explorer (`src/services/blockBuilder.ts`)
1.  **Block Metadata**: Reads `/block.json` for general layout config (classes, styles, element type).
2.  **Child Ordering**: Reads the `children` array inside `block.json`. This array defines the ID list of all structural children (e.g. `["svfpcsy28", "cv0yxhlyx"]`).
3.  **Folder Matching**: Traverses the subfolders in the current directory, finding those whose names end with the matching child ID suffix (e.g. matching folder `Container_svfpcsy28` for ID `svfpcsy28`).
4.  **Integration**: Reads nested `client_script.js` and `data_script.py` files and attaches their plain text contents to the block as `blockClientScript` and `blockDataScript` properties.
5.  **Assembly**: Recursively constructs the tree node by node and returns the complete hierarchical layout array.
