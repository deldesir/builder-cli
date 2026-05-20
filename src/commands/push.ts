import { Command } from "commander";
import { readDir, fileExists } from "../utils/file";
import { logger } from "../utils/logger";
import FrappeClient from "../utils/frappeClient";
import { PushQueue } from "../queues/PushQueue";
import path from "node:path";
import fs from "node:fs";

const CONFIG_FILE = "config.json";

export const pushCommand = new Command("push")
  .description("Push local changes to remote")
  .action(async () => {
    logger.info("Starting push of local changes...");
    const pwd = process.cwd();
    const configPath = path.join(pwd, CONFIG_FILE);
    if (!fileExists(configPath)) {
      logger.error("No configuration found. Please run the init command first.");
      return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const client = new FrappeClient(config.siteUrl, config.authToken);

    const isConnected = await client.testConnection();
    if (!isConnected) {
      logger.error("Failed to connect to the site. Please check your configuration and try again.");
      return;
    }

    const pagesDir = path.join(pwd, "pages");
    const componentsDir = path.join(pwd, "components");

    const pushQueueForPages = new PushQueue(client, "Page", 0);
    const pushQueueForComponents = new PushQueue(client, "Component", 0);

    if (fileExists(pagesDir)) {
      const pageDirs = readDir(pagesDir);
      for (const pageSubdir of pageDirs) {
        const pagePath = path.join(pagesDir, pageSubdir);
        const jsonPath = path.join(pagePath, "page.json");
        if (fileExists(jsonPath)) {
          pushQueueForPages.add(pagePath, jsonPath);
        }
      }
    }

    if (fileExists(componentsDir)) {
      const componentDirs = readDir(componentsDir);
      for (const componentSubdir of componentDirs) {
        const componentPath = path.join(componentsDir, componentSubdir);
        const jsonPath = path.join(componentPath, "component.json");
        if (fileExists(jsonPath)) {
          pushQueueForComponents.add(componentPath, jsonPath);
        }
      }
    }

    logger.info("Syncing changed pages...");
    await pushQueueForPages.flush();

    logger.info("Syncing changed components...");
    await pushQueueForComponents.flush();

    logger.info("Push complete!");
  });