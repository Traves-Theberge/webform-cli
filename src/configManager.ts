import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const configFilePath = path.join(os.homedir(), '.webformrc.json');

export async function setConfig(key: string, value: string): Promise<void> {
    try {
        const config = await getConfigData();
        config[key] = value;
        await fs.writeFile(configFilePath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error setting configuration:', error);
        throw error;
    }
}

export async function getConfig(key: string): Promise<string | undefined> {
    try {
        const config = await getConfigData();
        return config[key];
    } catch (error) {
        console.error('Error getting configuration:', error);
        throw error;
    }
}

async function getConfigData(): Promise<Record<string, any>> {
    try {
        const data = await fs.readFile(configFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
            // If the config file does not exist, return an empty object
            return {};
        }
        console.error('Error reading configuration file:', error);
        throw error;
    }
}