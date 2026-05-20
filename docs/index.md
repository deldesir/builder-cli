# 🏠 Builder CLI Documentation — Home

[🏠 Home](index.md) | [🚀 Getting Started](getting-started.md) | [💻 Command Reference](commands-reference.md) | [🏗️ Architecture & Sync](architecture-sync.md) | [🔌 Frappe & Subpaths](frappe-integration.md) | [🛠️ Troubleshooting](troubleshooting.md)

---

## Overview

**Builder CLI** is a highly optimized developer command-line interface designed to establish a seamless, local-first workflow for editing and managing [Frappe Builder](https://github.com/frappe/builder) pages and components. 

By using `builder-cli`, developers can bypass the browser editor and edit site layouts, style variables, scripts, and component structures directly on their local workstation using their preferred editors (e.g., VS Code, Vim) while maintaining continuous, bidirectional synchronization with a remote Frappe server.

```
       +---------------------------------------------+
       |             Local Workstation               |
       |  /workspace/                                |
       |     ├── config.json                         |
       |     ├── pages/                              |
       |     │    └── landing-page/                  |
       |     │         ├── page.json                 |
       |     │         └── blocks/ (recursively)     |
       |     └── components/                         |
       |          └── bento-grid/                    |
       |               └── component.json            |
       +----------------------|----------------------+
                              |
                     Bi-directional Sync
                     (REST API over HTTPS)
                              |
       +----------------------v----------------------+
       |               Frappe Server                 |
       |    Doctypes:                                |
       |       - Builder Page (draft & published)    |
       |       - Builder Component                   |
       +---------------------------------------------+
```

---

## Key Features

*   **Bidirectional Synchronization**: Sync changes to and from the remote server seamlessly via HTTP/HTTPS.
*   **Intelligent Change Tracking**: Utilizes metadata `.last_modified` file checks and system mtimes to prevent unnecessary uploads and resolve sync cycles.
*   **Unified Component Parser**: Patched serialization algorithm that correctly falls back to parse inline layout blocks directly from `component.json` when physical child folders are absent.
*   **Subpath and Proxy Friendly**: Fully verified compatibility under nginx-proxied subpath installations (e.g. `/erp` environments under Internet-in-a-Box setup).
*   **Draft-Publication Workflow**: Pushes changes safely to draft states (`draft_blocks`) to protect production environments, with support for server-side compilation and cache invalidation.

---

## Table of Contents

1.  [🚀 Getting Started](getting-started.md) — Set up, initialize, authenticate, and run your first pull.
2.  [💻 Command Reference](commands-reference.md) — Comprehensive options and behaviors of `init`, `pull`, `push`, and `watch`.
3.  [🏗️ Architecture & Sync](architecture-sync.md) — Dive deep into workspace directory tree structure, mtime comparison logic, and unified component serialization fallback.
4.  [🔌 Frappe & Subpath Integration](frappe-integration.md) — Configuring `/erp` subpath routing, clearing site caches, promoting draft blocks, and resolving concurrency conflicts.
5.  [🛠️ Troubleshooting](troubleshooting.md) — Debugging HTTP 417 (DocumentLockedError), clearing cache, fixing asset references, and resolving sync loops.
