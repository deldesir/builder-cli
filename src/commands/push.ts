import { Command } from "commander";
import { readDir, fileExists } from "../utils/file";
import { logger } from "../utils/logger";
import FrappeClient from "../utils/frappeClient";
import { PushQueue } from "../queues/PushQueue";
import { getLocalPageNames, publishPages } from "./publish";
import path from "node:path";
import fs from "node:fs";

const CONFIG_FILE = "config.json";

export const pushCommand = new Command("push")
  .description("Push local changes to remote")
  .option(
    "--force",
    "Push every page/component unconditionally, ignoring the .last_modified mtime check (use for git-seeded deploys)",
  )
  .option(
    "--publish",
    "After pushing, publish pages so the changes go live (promote draft_blocks -> blocks)",
  )
  .action(async (options: { force?: boolean; publish?: boolean }) => {
    logger.info("Starting push of local changes...");
    const pwd = process.cwd();
    const configPath = path.join(pwd, CONFIG_FILE);
    if (!fileExists(configPath)) {
      logger.error("No configuration found. Please run the init command first.");
      process.exitCode = 1;
      return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const client = new FrappeClient(config.siteUrl, config.authToken);

    const isConnected = await client.testConnection();
    if (!isConnected) {
      logger.error("Failed to connect to the site. Please check your configuration and try again.");
      process.exitCode = 1;
      return;
    }

    const pagesDir = path.join(pwd, "pages");
    const componentsDir = path.join(pwd, "components");

    const pushQueueForPages = new PushQueue(client, "Page", 0, options.force);
    const pushQueueForComponents = new PushQueue(client, "Component", 0, options.force);

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

    if (options.publish) {
      const pageNames = getLocalPageNames(pwd);
      if (pageNames.length > 0) {
        logger.info(`Publishing ${pageNames.length} page(s)...`);
        const published = await publishPages(client, pageNames);
        logger.info(
          `Publish complete! ${published}/${pageNames.length} page(s) published.`,
        );
        if (published < pageNames.length) {
          process.exitCode = 1;
        }
      } else {
        logger.warn("No pages found to publish.");
      }
    }
  });