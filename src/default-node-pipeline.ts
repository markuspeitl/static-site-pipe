import * as path from 'path';
//import * as fs from 'fs';
import fs from "fs";
import { NullableString, ArrayAndNull, NullableArray } from './utils/util';
import { IResourceProvider, GlobalConfig } from './global-config';
import { defaultPipeLineGraphEdges, initializeDefaultPipeLines } from "./default-pipeline";
import { isFilePath, nodeExists, tryReadFile, walk } from "./utils/node-util";
import { PipeLine, PipeLinesDict } from './pipeline-processing';
import { PipeGraphEdges, PipeLineInfo, createPipeLineGraph } from './pipeline-connect';
//Apparently a bit more stable fs implementation: https://www.npmjs.com/package/graceful-fs
//var fs = require('graceful-fs')
//string to slug
//https://www.npmjs.com/package/@sindresorhus/slugify
//https://www.npmjs.com/package/slugify
//https://www.npmjs.com/package/bcp-47-normalize
// file watching
//https://www.npmjs.com/package/chokidar 
//Cross platform process spawning:
//https://www.npmjs.com/package/cross-spawn
//Colored debug logs:
//https://www.npmjs.com/package/debug

// Dependencies:
// - sorting: https://www.npmjs.com/package/toposort
// - https://www.npmjs.com/package/dependency-graph

// https://www.npmjs.com/package/dependency-tree might be a better options - supports JS, TS, CSS, Sass, .etc
// https://github.com/dependents/node-dependency-tree

//Globbing:
//https://www.npmjs.com/package/glob (a tiyny bit slower than fast-glob, but a bit more correct)
// https://www.npmjs.com/package/fast-glob - fast and very small
// https://www.npmjs.com/package/is-glob check if is glob (through should not be needed with a good implementation)


//Front matter parser (de facto standard for node):
//https://www.npmjs.com/package/gray-matter

//Maybe: https://www.npmjs.com/package/assetgraph - https://www.npmjs.com/package/hyperlink

//Unrelated (might be useful for visualizing component deps):
//visualize and validate deps: https://libraries.io/npm/dependency-cruiser

//Markdown to html parser (supports plugins):
//https://www.npmjs.com/package/markdown-it
//Liquid parser
//https://www.npmjs.com/package/liquidjs


//Get js global scope vars from js string:
//https://www.npmjs.com/package/node-retrieve-globals

//Windows style paths to unix + clean up
//https://www.npmjs.com/package/normalize-path

//Recursive copying - not too fond of this:
//https://www.npmjs.com/package/recursive-copy

//Language code mapping formats: example English --> en, eng, .etc (old through 7years)
//https://www.npmjs.com/package/langs
//https://www.npmjs.com/package/iso-639-1

//Json data localization i18n
//https://www.npmjs.com/package/@cospired/i18n-iso-languages
//https://www.npmjs.com/package/i18n
//Airbnb solution (interesting features -> seems a bit bloat though)
//https://www.npmjs.com/package/node-polyglot
// I don't trust this lots of marketing, big claims, bloat and boasting
//https://www.i18next.com/

//Logging colors
//https://www.npmjs.com/package/kleur
//https://www.npmjs.com/package/chalk

//Datetime parsing and formatting
//https://www.npmjs.com/package/luxon

//Javascript color manipulation -> like sass:color
//https://www.npmjs.com/package/moo-color

//Lexer + tokenizer
//https://www.npmjs.com/package/moo
//Can be passed to a parser to transform into data structure:
//https://nearley.js.org/

//Create ast of html:
//https://www.npmjs.com/package/posthtml-parser

//html minifyier (kinda large 1.16MB)
//https://www.npmjs.com/package/htmlnano

//Html transformations & parsing
//https://www.npmjs.com/package/posthtml

//HTML:
//More low level (no selector logic -> manual transversal and selection of nodes)
//parse5
//htmlparser2 - streaming parsing -> stream event based
//somwhat higher level - jquery like manipulation
//cheerio
//jsdom - virtual browser env
//https://stackoverflow.com/questions/11398419/trying-to-use-the-domparser-with-node-js

//Transverse json tree and iterate over every node (small pure js)
//https://github.com/ljharb/js-traverse/blob/main/index.js


export class NodeFsProvider implements IResourceProvider {

    private fs: any;
    constructor (fs: any) {
        this.fs = fs;
    }
    async isResourceUri(resourceUri: NullableString): Promise<boolean> {
        return isFilePath(resourceUri);
    }

    async getNodeResources(dirPath: NullableString): Promise<NullableArray<string>> {

        if (!dirPath || !this.fs.existsSync(dirPath)) {
            //return null;
            return [];
        }

        const dirFilePaths: ArrayAndNull<string> = [];

        try {
            const stat: fs.Stats = await this.fs.promises.lstat(dirPath);
            if (stat.isFile()) {
                return [ dirPath ];
            }
        }
        catch (error) {
            console.log(`Error reading dir: ${dirPath}`);
            console.log(error);
            return null;
        }

        for await (const filePath of walk(dirPath)) {
            //https://stackoverflow.com/questions/32478698/what-is-the-different-between-stat-fstat-and-lstat-functions-in-node-js
            try {
                const stat: fs.Stats = await this.fs.promises.lstat(filePath);
                if (stat.isFile()) {
                    dirFilePaths.push(filePath);
                }
            }
            catch (error) {
                console.log(`Error reading file: ${filePath}`);
                console.log(error);
                dirFilePaths.push(null);
            }

        }

        return dirFilePaths;
    }
    async readResource(filePath: NullableString) {
        if (!filePath) {
            return null;
        }
        //const readFileBuffers: string | null | Array<string | null> = await multiplyIfArrayAsync(readFile, filePaths);
        return tryReadFile(filePath);
    }
    async exists(filePath: NullableString) {
        //const existStates: boolean[] = await multiplyIfArrayAsync(fileExists, filePaths);
        return nodeExists(filePath);
    }
}



export function getNodeFsProvider(): IResourceProvider {
    return new NodeFsProvider(fs);
}

export function getDefaultNodeConfig(): GlobalConfig {
    const globalConfig: GlobalConfig = {
        fsProvider: getNodeFsProvider()
    };

    return globalConfig;
}

export function getDefaultNodePipeLineGraph(globalConfig?: GlobalConfig): PipeLineInfo | null {
    if (!globalConfig) {
        globalConfig = {};
    }
    Object.assign(getDefaultNodeConfig(), globalConfig);

    const defaultGraphEdges: PipeGraphEdges = defaultPipeLineGraphEdges;

    const pipeLinesPool: PipeLinesDict = initializeDefaultPipeLines(globalConfig);

    return createPipeLineGraph('default', defaultGraphEdges, pipeLinesPool, globalConfig);

    //let graph = options.graph;
    //const defaultPipeLineGraph: PipeLineGraph | null = getDefaultPipeLineGraph(options);

    //return defaultPipeLineGraph;
}

/*export async function process(input: any, options: any): Promise<any> {
    return await processWithPipeLineGraph(input, defaultPipeLineGraph, options);
}*/