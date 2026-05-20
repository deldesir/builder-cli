# 🛠️ Troubleshooting Guide

[🏠 Home](index.md) | [🚀 Getting Started](getting-started.md) | [💻 Command Reference](commands-reference.md) | [🏗️ Architecture & Sync](architecture-sync.md) | [🔌 Frappe & Subpaths](frappe-integration.md) | [🛠️ Troubleshooting](troubleshooting.md)

---

This troubleshooting guide provides solutions for common error conditions, locking issues, and metadata conflicts encountered when using `builder-cli`.

---

## 🔒 1. Resolving `DocumentLockedError` (HTTP 417)

### Symptoms
When pushing updates, the CLI reports an HTTP 417 Expectation Failed error, and the console/server logs display:
```
frappe.exceptions.DocumentLockedError: This document is currently locked and queued for execution. Please try again after some time.
```

### Root Cause
During document save operations, Frappe places a weak file-based concurrency lock on the server disk to prevent race conditions during long-running background tasks. 
*   **Signature Lock Path**: `{bench_dir}/sites/{site_name}/locks/{sha224_signature_hash}.lock`
*   If a previous sync was interrupted, aborted, or timed out, the lock file remains on disk indefinitely, blocking all future updates to that specific Page or Component.

### Resolution
1.  **Calculate the Signature Hash**:
    Compute the sha224 signature of the document identifier (formatted as `"{Doctype}:{Name}"`):
    ```bash
    python3 -c "import hashlib; print(hashlib.sha224(b'Builder Component:1t7ojnv1t7ojnv1t').hexdigest())"
    # Output: e1e87704ec4aadf67c48467571b4a3d37c1422ff3bd9cf855e825dc9
    ```
2.  **Delete the Lock File**:
    Log onto your Frappe server and delete the matching lock file under the active site's locks directory:
    ```bash
    sudo -u frappe rm /home/frappe/frappe-bench/sites/site.local/locks/e1e87704ec4aadf67c48467571b4a3d37c1422ff3bd9cf855e825dc9.lock
    ```
3.  **Retry Sync**:
    Execute the push command again. The resource is now unlocked and will update.

---

## 🔄 2. Resolving Timestamp Concurrency Conflicts (HTTP 417)

### Symptoms
The push logs show a standard HTTP 417 expectation failed error without a DocumentLockedError stack trace.

### Root Cause
Frappe checks the `last_known_server_mtime` field submitted by the CLI against the database `modified` column. If a developer modified the page in the browser or via another terminal since the local workspace's last pull, the server rejects the update to prevent overwriting newer work.

### Resolution
If you are confident that your local changes should overwrite the server:
1.  **Query the Server Timestamp**:
    Get the actual `modified` timestamp from the database:
    ```bash
    bench --site site.local execute "print(frappe.db.get_value('Builder Component', '1t7ojnv1t7ojnv1t', 'modified'))"
    # Output: 2026-05-20 12:50:05.887243
    ```
2.  **Update Your Local Sync Baseline**:
    Copy this exact timestamp string into the component or page's `.last_modified` file inside your workspace (replacing the old timestamp).
3.  **Touch & Push**:
    Touch the primary configuration file to mark it as modified and run push:
    ```bash
    touch workspace/components/My_Component/component.json
    builder push
    ```

---

## 🕳️ 3. Restoring Wiped Components (Null Block Data)

### Symptoms
After running an old version of `builder-cli`, your components on the server appear blank or display empty layouts, and database inspection shows `block: "null"`.

### Root Cause
Older CLI versions lacked the fallback parser patch and attempted to compile layout components by reading a `blocks/` directory. Since pulled workspaces only possess the unified `component.json` block property, the CLI built an empty structural layout and wrote `"null"` over the server document during sync.

### Resolution
1.  **Update the CLI**: Make sure you have pulled the latest changes from the `deldesir/builder-cli` fork and compiled it (`npm run build`).
2.  **Repopulate & Re-push**:
    Touch the local `component.json` file in the workspace to make sure the filesystem marks it as changed, then run the sync:
    ```bash
    touch workspace/components/[Component_Folder]/component.json
    builder push
    ```
    The updated CLI fallback parser will now read the unified block directly from your local `component.json` copy and push the complete, restored layout back to the database.
