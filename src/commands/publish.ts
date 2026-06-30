import { Command } from "commander";
import { readDir, readFile, fileExists } from "../utils/file";
import { logger } from "../utils/logger";
import FrappeClient from "../utils/frappeClient";
import path from "node:path";

const CONFIG_FILE = "config.json";

/**
 * Collect the Builder Page names tracked in the local `pages/` directory by
 * reading the `name` field out of each `pages/<dir>/page.json`.
 */
export const getLocalPageNames = (pwd: string): string[] => {
    const names: string[] = [];
    const pagesDir = path.join(pwd, "pages");
    if (!fileExists(pagesDir)) {
        return names;
    }
    for (const pageSubdir of readDir(pagesDir)) {
        const jsonPath = path.join(pagesDir, pageSubdir, "page.json");
        if (!fileExists(jsonPath)) {
            continue;
        }
        try {
            const data = JSON.parse(readFile(jsonPath) || "{}");
            if (data.name) {
                names.push(data.name);
            } else {
                logger.warn(`No "name" field in ${jsonPath}. Skipping.`);
            }
        } catch (err) {
            logger.error(
                `Failed to parse ${jsonPath}: ${(err as Error).message}`,
            );
        }
    }
    return names;
};

/**
 * Publish a set of Builder Pages, promoting their pushed `draft_blocks` to the
 * live `blocks` field. Returns the count of pages successfully published.
 *
 * Note: Builder Components have no draft/publish split — their `block` field is
 * always live as soon as it is pushed — so only pages are published here.
 */
export const publishPages = async (
    client: FrappeClient,
    pageNames: string[],
): Promise<number> => {
    let published = 0;
    const results = await Promise.all(
        pageNames.map(async (name) => {
            const route = await client.publishPage(name);
            if (route === null) {
                logger.error(`Failed to publish page: ${name}`);
                return false;
            }
            logger.info(`Published page: ${name}${route ? ` (/${route})` : ""}`);
            return true;
        }),
    );
    published = results.filter(Boolean).length;
    return published;
};

export const publishCommand = new Command("publish")
    .description(
        "Publish pages (promote pushed draft_blocks to the live storefront)",
    )
    .option(
        "--all",
        "Publish every Builder Page on the server, not just locally-tracked pages",
    )
    .action(async (options: { all?: boolean }) => {
        logger.info("Starting publish...");
        const pwd = process.cwd();
        const configPath = path.join(pwd, CONFIG_FILE);
        if (!fileExists(configPath)) {
            logger.error(
                "No configuration found. Please run the init command first.",
            );
            process.exitCode = 1;
            return;
        }

        const config = JSON.parse(readFile(configPath) || "{}");
        const client = new FrappeClient(config.siteUrl, config.authToken);

        const isConnected = await client.testConnection();
        if (!isConnected) {
            logger.error(
                "Failed to connect to the site. Please check your configuration and try again.",
            );
            process.exitCode = 1;
            return;
        }

        let pageNames: string[];
        if (options.all) {
            const pages = await client.getPages();
            pageNames = (pages || []).map((p: { name: string }) => p.name);
        } else {
            pageNames = getLocalPageNames(pwd);
        }

        if (pageNames.length === 0) {
            logger.warn("No pages found to publish.");
            return;
        }

        logger.info(`Publishing ${pageNames.length} page(s)...`);
        const published = await publishPages(client, pageNames);
        logger.info(
            `Publish complete! ${published}/${pageNames.length} page(s) published.`,
        );
        if (published < pageNames.length) {
            process.exitCode = 1;
        }
    });
