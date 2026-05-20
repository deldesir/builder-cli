# 🔌 Frappe & Subpath Integration

[🏠 Home](index.md) | [🚀 Getting Started](getting-started.md) | [💻 Command Reference](commands-reference.md) | [🏗️ Architecture & Sync](architecture-sync.md) | [🔌 Frappe & Subpaths](frappe-integration.md) | [🛠️ Troubleshooting](troubleshooting.md)

---

This guide documents the integration patterns between `builder-cli` and Frappe, including subpath proxies, draft lifecycle publishing, and server-side cache management.

---

## 🔀 1. Subpath Proxies & Proxy Routing

On advanced developer stacks (such as the Internet-in-a-Box configuration), Frappe may run behind an Nginx reverse proxy mapped to a specific subpath base prefix (such as `/erp`).

```
Request: https://your-frappe-site.com/erp/shop
             │
             ▼
      +--------------+
      |  Nginx Proxy | (Strips /erp subpath, forwards to Bench port)
      +------┬-------+
             │
             ▼
      +--------------+
      | Frappe Bench | (Listens on port 8000, site name site.local)
      +--------------+
```

### Path Resolution
To ensure reliable communication through the proxy, `builder-cli`:
*   Uses the fully qualified URL containing the subpath prefix (e.g. `https://your-frappe-site.com/erp`) as the `siteUrl` in `/workspace/config.json`.
*   Directs all API requests dynamically using absolute routing paths:
    ```
    {siteUrl}/api/method/frappe.auth.get_logged_user
    {siteUrl}/api/resource/Builder Page/{name}
    ```
*   Handles cookies and API token handshakes seamlessly across proxied paths.

---

## 📝 2. Draft vs. Published State Lifecycle

To protect production storefronts from accidental breakages during active development, Frappe Builder separates draft designs from live layouts:

```
                  Local Workspace
                         │
                         ▼  (builder push)
               Database: draft_blocks
                         │
                         ▼  (doc.publish() method)
                 Database: blocks
                         │
                         ▼  (server compilation)
               Live Rendered HTML / CSS
```

### The Database Split
1.  **`draft_blocks`**: When you save layout changes in the local workspace and run `builder push`, the CLI updates the page's `draft_blocks` field. This *does not* modify what your customers see on the web.
2.  **`blocks`**: The live storefront renders solely from the compiled `blocks` column.

### Promoting Drafts to Production
To make your pushed changes live on the storefront, the page must be **published**. This is triggered via a whitelisted server-side Python method:

```python
doc = frappe.get_doc("Builder Page", "landing-page")
doc.publish()
frappe.db.commit()
```

The `publish()` method performs three main functions:
*   Promotes `draft_blocks` to the primary `blocks` field.
*   Triggers severe-side compilation of block scripts, custom stylesheet generations, and HTML layouts.
*   Clears the internal draft flag and queues preview generation.

---

## ⚡ 3. Server Caching & Site Cache Clearing

Frappe heavily caches pages and components in its local Redis cache and database tables to ensure low page-load times. 

When you push changes or execute a publish command, the live web server may continue to serve stale, cached layouts. Therefore, after pushing critical edits, you must clear the site cache to trigger an immediate reload of compiled files.

Execute the following command in your bench directory:
```bash
bench --site site.local clear-cache
```

This ensures that the latest compiled CSS stylesheets and updated layout containers are fetched immediately by all web browsers.
