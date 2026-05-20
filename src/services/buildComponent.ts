import { readFile, fileExists, readDir } from "../utils/file";
import { Block, readBlocksRecursively } from "./blockBuilder";

interface Component {
    componentData: Record<string, unknown>;
    block: Block | null;
}

const buildComponent = async (componentDir: string): Promise<Component> => {
    // Read component.json
    const componentJsonPath = `${componentDir}/component.json`;
    const componentJsonContent = readFile(componentJsonPath);
    const componentData = componentJsonContent ? JSON.parse(componentJsonContent) : {};


    // Read blocks recursively if blocks directory exists, otherwise fallback to componentData.block
    const blocksDir = `${componentDir}/blocks/`;
    let rootBlock: Block | null = null;
    if (fileExists(blocksDir)) {
        const dirContents = readDir(blocksDir);
        if (dirContents && dirContents.length > 0) {
            const componentRootDir = dirContents[0]; // Component can have only one root block
            if (fileExists(`${blocksDir}/${componentRootDir}`)) {
                rootBlock = readBlocksRecursively(`${blocksDir}/${componentRootDir}`);
            }
        }
    }

    if (!rootBlock && componentData.block) {
        rootBlock = typeof componentData.block === "string" ? JSON.parse(componentData.block) : componentData.block;
    }

    return {
        componentData,
        block: rootBlock,
    };
};

export default buildComponent;