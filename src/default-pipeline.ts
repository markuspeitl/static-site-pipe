import { processWithPipelineGraph, PipeLineEntry, PipeLineGraph } from './processing-pipeline';
import { ArrayAndNull, Nullable, NullableArray, NullableString } from './util';

const basePipelineOptions: PipeLineGraph = {
    dir: {
        id: 'dir',
        isTargetOf: () => true,
        process: () => ''
    },
    file: {
        id: 'file',
        isTargetOf: () => true,
        process: () => ''
    },
    template: {
        id: 'template',
        isTargetOf: () => true,
        process: () => ''
    }
};



//Dependency injection as a means to abstract filesystem (for non node environments or if the files are stored remotely)
export interface IResourceProvider {
    getNodeResources(ancestorNodeResourceUri: NullableString): Promise<NullableArray<string>>;
    //readFile(filePath: string): Promise<string>;
    readResource(resourceUri: NullableString): Promise<NullableString>;
    isResourceUri(resourceUri: NullableString): Promise<boolean>;
    exists(resourceUri: NullableString): Promise<boolean>;
    //writeFile(path: string, content: string);
    //watchDirForChanges(dirPath: string);
}

function isTypeOrItemType(value: any | any[], matchType: string): boolean {
    let foundDefined = undefined;

    if (Array.isArray(value)) {

        for (const elem of value) {
            if (elem !== undefined) {
                foundDefined = elem;
            }
            else if (matchType === 'undefined') {
                return true;
            }

            if (foundDefined) {
                break;
            }
        }
    }
    else {
        foundDefined = value;
    }

    if (foundDefined && typeof value === matchType) {
        return true;
    }

    return false;
}

function getDirToFilesPipeline(fsProvider: IResourceProvider): PipeLineEntry {
    const dirPipeLine = basePipelineOptions.dir;

    if (typeof dirPipeLine === 'object' && dirPipeLine.partialPipelines !== undefined) {
        dirPipeLine.isTargetOf = async (input: any) => {
            if (!input || typeof input !== 'string') {
                return false;
            }
            const isResourceUri = await fsProvider.isResourceUri(input);
            const uriResourceExists = await fsProvider.exists(input);

            return isResourceUri && uriResourceExists;
        };
        dirPipeLine.partialPipelines.walk = async (dirResourceUri: string) => {

            return fsProvider.getNodeResources(dirResourceUri);

            /*for await (const dirFilesSet of walk(input)) {

            }

            const filePaths: Promise<NullableArray<string>> = await fsProvider.getNodeResources(dirResourceUri);
            return filePaths;*/
        };
        dirPipeLine.partialPipelines.print = async (input: any) => {
            console.log(input);
            return input;
        };
    }

    return dirPipeLine;
}

function getFilesToBuffersPipeline(fsProvider: IResourceProvider): PipeLineEntry {
    const pipeLine = basePipelineOptions.file;

    if (typeof pipeLine === 'object' && pipeLine.partialPipelines !== undefined) {
        pipeLine.isTargetOf = async (input: any) => {
            if (!input || typeof input !== 'string') {
                return false;
            }
            const isResourceUri = await fsProvider.isResourceUri(input);
            const uriResourceExists = await fsProvider.exists(input);

            return isResourceUri && uriResourceExists;
        };
        pipeLine.partialPipelines.printFile = async (input: any) => {
            console.log(input);
            return input;
        };
        pipeLine.partialPipelines.readFile = async (input: any) => {
            return await fsProvider.readResource(input);
        };
    }

    return pipeLine;
}

export function connectPipelines(pipe1: PipeLineEntry, pipe2: PipeLineEntry) {
    if (typeof pipe1 === 'object' && pipe1.nextAfter !== undefined) {
        pipe1.nextAfter = pipe2;
    }
}

export function chainPipelines(...pipeLines: PipeLineEntry[]) {
    if (pipeLines.length <= 2) {
        return;
    }

    for (let index = 1; index < pipeLines.length; index++) {
        const currentPipeline = pipeLines[ index ];
        connectPipelines(pipeLines[ index - 1 ], currentPipeline);
    }
}

export function getDefaultPipeLineGraph(options: any): PipeLineGraph {
    const pipeLineGraph = basePipelineOptions;
    const dirPipeLine = getDirToFilesPipeline(options.fsProvider);
    const filePipeline = getFilesToBuffersPipeline(options.fsProvider);
    const templatePipeline = pipeLineGraph.template;

    chainPipelines(dirPipeLine, filePipeline, templatePipeline);

    return pipeLineGraph;
}

export async function process(input: any, options: any): Promise<any> {
    //let graph = options.graph;
    const defaultPipeLineGraph: PipeLineGraph | null = getDefaultPipeLineGraph(options);

    return await processWithPipelineGraph(input, defaultPipeLineGraph, options);
}