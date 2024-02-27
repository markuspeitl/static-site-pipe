import * as path from 'path';
import * as fs from 'fs';
import { NullableString } from './util';


export async function* walk(dir) {
    for await (const d of await fs.promises.opendir(dir)) {
        const entry = path.join(dir, d.name);
        if (d.isDirectory()) yield* walk(entry);
        else if (d.isFile()) yield entry;
    }
}


export function isFilePath(resourceUri: NullableString): boolean {
    if (!resourceUri) {
        return false;
    }
    if (resourceUri.includes('\n')) {
        return false;
    }
    if (resourceUri.includes('/')) {
        return true;
    }
    const parsedResourcePath = path.parse(resourceUri);
    if (parsedResourcePath.ext) {
        return true;
    }

    return false;
}

export async function tryReadFile(filePath: string): Promise<string | null> {

    if (!filePath) {
        return null;
    }

    try {
        const buffer = await this.fs.promises.readFile(filePath, 'utf8');
        return buffer;
    }
    catch (error) {
        console.log(`Error reading file: ${filePath}`);
        console.log(error);
        return null;
    }
};

export async function nodeExists(fsNodePath: NullableString): Promise<boolean> {
    if (!fsNodePath) {
        return false;
    }

    try {
        await this.fs.promises.lstat(fsNodePath);
        return true;
    }
    catch (error) {
        console.log(`Error reading file: ${fsNodePath}`);
        return false;
    }
}