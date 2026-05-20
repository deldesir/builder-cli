# 🚀 Getting Started

[🏠 Home](index.md) | [🚀 Getting Started](getting-started.md) | [💻 Command Reference](commands-reference.md) | [🏗️ Architecture & Sync](architecture-sync.md) | [🔌 Frappe & Subpaths](frappe-integration.md) | [🛠️ Troubleshooting](troubleshooting.md)

---

This guide walks you through setting up `builder-cli`, initializing a local workspace, authenticating against your remote Frappe server, and pulling your existing Builder assets to your machine.

## Prerequisites

Before setting up `builder-cli`, make sure you have:
1.  **Node.js**: Version 18.x or newer (check with `node -v`).
2.  **Frappe Server**: An active Frappe instance with the **Builder** app installed (e.g. `https://your-frappe-site.com/erp`).
3.  **Frappe API Credentials**: An Administrator or developer account with API Access keys (API Key and API Secret) generated in your user profile on the Frappe Desk.

---

## 🛠️ Step-by-Step Installation

### 1. Clone Your Fork
First, clone the forked repository to your development machine:
```bash
git clone https://github.com/deldesir/builder-cli.git
cd builder-cli
```

### 2. Install Dependencies
Install all required npm dependencies:
```bash
npm install
```

### 3. Compile the Codebase
Build the TypeScript files into the compiled JavaScript output inside the `dist/` directory:
```bash
npm run build
```

### 4. Create a Global Link (Optional)
To make the `builder` command globally accessible on your command line, run:
```bash
npm link
```
*(Alternatively, you can run the CLI locally using `node /absolute/path/to/builder-cli/dist/index.js` or via the dev-runtime using `npx tsx src/index.ts`.)*

---

## ⚙️ Initializing a Workspace

Workspaces are directories on your machine where `builder-cli` tracks your local files and server metadata.

### Step 1: Create a Workspace Directory
Create a dedicated workspace folder and navigate into it:
```bash
mkdir my-builder-workspace
cd my-builder-workspace
```

### Step 2: Run `init`
Execute the initialization wizard:
```bash
builder init
```

The CLI wizard will prompt you for:
1.  **Site URL**: The target URL of your Frappe site (e.g. `https://your-frappe-site.com/erp`).
2.  **API Key**: The API Key generated from your Frappe user profile.
3.  **API Secret**: The API Secret associated with the API Key.

Once completed, the CLI creates a `config.json` file in your workspace directory:
```json
{
  "siteUrl": "https://your-frappe-site.com/erp",
  "siteName": "site.local",
  "authToken": "a0c4079e61e2d5b:94874af0e888315"
}
```

> [!WARNING]
> Keep your `config.json` secure. Do not commit it to public version control as it contains admin-level API keys.

---

## 📥 Your First Pull

Once configured, populate your workspace with all pages and components currently defined on your Frappe server.

Run the pull command:
```bash
builder pull
```

The CLI will connect to your remote Frappe instance, scan all `Builder Page` and `Builder Component` documents, and download them recursively into your workspace:

```
my-builder-workspace/
├── config.json
├── pages/
│    └── landing-page/
│         ├── page.json
│         ├── .last_modified
│         └── blocks/
│              └── root/ ...
└── components/
     └── Hero_-_White_BG_-_Webshop_1t7ojnv1t7ojnv1t/
          ├── component.json
          └── .last_modified
```

Each page and component directory contains a `.last_modified` file containing the server's database-level modification timestamp at the time of download. This file acts as our tracking baseline for future change detection.
