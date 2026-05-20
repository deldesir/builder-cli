# 💻 Command Reference

[🏠 Home](index.md) | [🚀 Getting Started](getting-started.md) | [💻 Command Reference](commands-reference.md) | [🏗️ Architecture & Sync](architecture-sync.md) | [🔌 Frappe & Subpaths](frappe-integration.md) | [🛠️ Troubleshooting](troubleshooting.md)

---

This reference page outlines the available commands, options, and internal operations of the `builder-cli` utility.

---

## 🔑 1. `builder init`

Initializes a new local workspace and authenticates it with a remote Frappe site.

### Usage
```bash
builder init
```

### Internal Behavior
1.  Loads an interactive inquirer wizard asking for the site credentials.
2.  Queries the remote API endpoint `/api/method/frappe.auth.get_logged_user` to test credentials:
    *   Adds an `Authorization: token {API_KEY}:{API_SECRET}` header to the request.
3.  If successful, it fetches the server config and creates `/workspace/config.json`.
4.  Creates initial directory layouts (`/pages` and `/components`) inside the workspace.

---

## 📥 2. `builder pull`

Downloads all active `Builder Page` and `Builder Component` records from the remote Frappe instance into the local workspace, overwriting existing local files.

### Usage
```bash
builder pull
```

### Internal Behavior
1.  **Component Syncing**:
    *   Queries `api/resource/Builder Component` to get a list of all component documents.
    *   Fetches each component document individually, writing its properties (like layout and styling) to a local `/components/{ComponentName}/component.json` block.
    *   Creates a `/components/{ComponentName}/.last_modified` file containing the precise modified timestamp returned from the database.
2.  **Page Syncing**:
    *   Queries `api/resource/Builder Page` to get all page documents.
    *   Downloads page metadata (`page.json`) and extracts the hierarchical page layout structure.
    *   Recursively maps the nested page structure, writing individual element settings into separated `/blocks/` subfolders for modular offline access.
    *   Records the page's modified timestamp in `.last_modified`.

---

## 📤 3. `builder push`

Scans the local workspace for any modifications, compiles the updated blocks, and pushes them to the remote Frappe instance.

### Usage
```bash
builder push
```

### Change Detection Algorithm
For each component or page in the workspace, `push` performs an optimized timestamp check:
1.  Retrieves the local filesystem modification time (`mtime`) of `component.json` or `page.json`.
2.  Reads the timestamp stored in the `.last_modified` file (representing the server state at the last sync).
3.  **No Action**: If `mtime` $\le$ `.last_modified`, the item is skipped.
4.  **Sync Required**: If `mtime` $>$ `.last_modified`, the CLI aggregates and compiles all child files (e.g. block JSON overrides, CSS files, scripts) and calls the Frappe REST API to update the document.

> [!NOTE]
> The `push` command executes page syncs first, followed by component syncs, utilizing asynchronous task queues (`PushQueue`) to execute concurrent updates in parallel.

---

## 👁️ 4. `builder watch`

Establishes an active development loop, listening for any file save events inside your workspace and syncing those changes instantly to the remote server.

### Usage
```bash
builder watch
```

### Key Mechanisms
*   **FS Listener**: Utilizes the `chokidar` library to monitor `/pages` and `/components` directories.
*   **Debouncing**: Groups rapid succession file edits (such as saving multiple files at once or editor auto-saves) using a default 1000ms debounce queue to avoid hammering the REST API.
*   **Incremental Syncs**: Watches specifically for changes under child paths and resolves them up to the parent page or component boundary before queuing a push.
*   **Automatic Handshakes**: Keeps a socket connection open for instant updates when available.
