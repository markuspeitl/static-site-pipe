import { addPipeline, getPipeline } from './pipeline-provider';
import { processWithPipelineGraph, PipeLineEntry, PipeLineGraph, IProcessingPipeline } from './processing-pipeline';
import { ArrayAndNull, Nullable, NullableArray, NullableString } from './util';

/*const basePipelineOptions: PipeLineGraph = {
    dir: {
        id: 'dir',
        isTargetOf: async () => true,
        process: () => ''
    },
    file: {
        id: 'file',
        isTargetOf: async () => true,
        process: () => ''
    },
    template: {
        id: 'template',
        isTargetOf: async () => true,
        process: () => ''
    }
};*/


export interface GraphEdges {
    subchain?: GraphSubEdgesDict;
    branches?: GraphSubEdgesDict;
    next?: string;
}
export type GraphSubEdgesDict = Record<string, GraphEdges | null>;

const pipeLineGraphEdges: GraphEdges = {
    subchain: {},
    branches: {
        dir: {
            subchain: {
                walkDir: null, // For now any pipelines/fns of the subchain/branches must have a unique name
                printDirFiles: null, //Disallow duplicates while registering (when wanting to modify behaviour you can always manually add a namespace, 
                filterIgnoredFiles: { //or replace existing with a combined pipeline which has the previous pipeline and the new pipeline as stages)
                    //next: 'exitparent' //removed as this would ignore all files of the dir
                },
            },
            branches: undefined,
            next: 'file' || 'default'
        },
        //changed watched files would be reemitted here (no need to handle dir changes, -> if a dir is renamed -> its contents change)
        file: {
            subchain: {
                printFile: null,
                copyAsset: {
                    next: 'exitparent' // --> parent == file -> end main processing pipeline
                },
                readFile: null,
                writeAsset: {
                    next: 'exitparent'
                },
            },
            //Branches do all get passed the same data from parent pipeline and are activated if they are enabled (through isTargetOf)
            branches: undefined,
            next: 'template' || 'default'
        },
        template: {
            subchain: {
                printTemplate: null,
                //parseTemplate: {}
                preParseTransform: null
            },
            //branches get passed the data coming out of the subchain
            branches: {
                markdown: {
                    next: 'default' || 'exitparent' // Branch behaviours: find first, process + exit, find first, process + pass to next match
                },
                typescript: {
                    next: 'default' || 'exitparent'
                },
                liquid: {
                    next: 'default' || 'exitparent'
                },
                nunjucks: {
                    next: 'default' || 'exitparent'
                }
            },
            next: 'compiled'
        },
        compiled: {
            branches: {
                minify: {
                    branches: {
                        cssMinify: {
                            next: 'default' || 'exitparent',
                        },
                        htmlMinify: {
                            next: 'default' || 'exitparent',
                        }
                    }
                }
            },
            next: 'writeCompiled'
        },
        writeCompiled: {}
    },
    next: undefined,
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

export function getNewPipeline(id: string): IProcessingPipeline {
    return {
        id: id,
        isTargetOf: async () => true,
        process: () => ''
    };
}

function initDirToFilesPipeline(globalConfig: Record<string, any>): IProcessingPipeline {
    const pipeLine: IProcessingPipeline = getNewPipeline('dir');
    const fsProvider: IResourceProvider = globalConfig.fsProvider;

    if (typeof pipeLine === 'object' && pipeLine.partialPipelines !== undefined) {
        pipeLine.isTargetOf = async (input: any) => {
            if (!input || typeof input !== 'string') {
                return false;
            }
            const isResourceUri = await fsProvider.isResourceUri(input);
            const uriResourceExists = await fsProvider.exists(input);

            return isResourceUri && uriResourceExists;
        };
        pipeLine.partialPipelines.walk = async (dirResourceUri: string) => {

            return fsProvider.getNodeResources(dirResourceUri);

            /*for await (const dirFilesSet of walk(input)) {

            }

            const filePaths: Promise<NullableArray<string>> = await fsProvider.getNodeResources(dirResourceUri);
            return filePaths;*/
        };
        pipeLine.partialPipelines.print = async (input: any) => {
            console.log(input);
            return input;
        };
    }

    return pipeLine;
}

function initFilesToBuffersPipeline(globalConfig: Record<string, any>): IProcessingPipeline {
    const pipeLine: IProcessingPipeline = getNewPipeline('file');

    const fsProvider: IResourceProvider = globalConfig.fsProvider;

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

/*export function getDefaultPipeLineGraph(options: any): PipeLineGraph {
    //const pipeLineGraph = basePipelineOptions;
    const dirPipeLine = getDirToFilesPipeline(options.fsProvider);
    const filePipeline = getFilesToBuffersPipeline(options.fsProvider);
    const templatePipeline = pipeLineGraph.template;

    chainPipelines(dirPipeLine, filePipeline, templatePipeline);

    return pipeLineGraph;
}*/



export function initializeDefaultPipelines(globalConfig: Record<string, any>) {
    const dirPipeLine: IProcessingPipeline = initDirToFilesPipeline(globalConfig);
    const filePipeline: IProcessingPipeline = initFilesToBuffersPipeline(globalConfig);
    addPipeline(dirPipeLine);
    addPipeline(filePipeline);
    addPipeline(filePipeline, 'template');

    return getPipeline;
}

export function iterateDictConnect(edgesDict: GraphSubEdgesDict | null | undefined, globalConfig: Record<string, any>, defaultConnType: string = 'next', currentKey = "default"): void {
    if (!edgesDict) {
        return;
    }
    for (const edgeTargetKey in edgesDict) {
        connectPipelineGraph(edgesDict[ edgeTargetKey ], globalConfig, edgeTargetKey);
    }
}

export function connectPipelineGraph(pipeLineGraphEdges: GraphEdges | null, globalConfig: Record<string, any>, currentKey = "default") {

    if (!pipeLineGraphEdges) {
        return;
    }

    const pipeLineProvider: (id: string) => PipeLineEntry = globalConfig.getPipeline;
    const currentPipeEdges: GraphEdges = pipeLineGraphEdges;

    iterateDictConnect(currentPipeEdges.subchain, globalConfig, 'next', currentKey);
    iterateDictConnect(currentPipeEdges.branches, globalConfig, 'exitparent', currentKey);

    if (currentPipeEdges.next) {

    }


    /*subchain?: GraphSubEdgesDict;
    branches?: GraphSubEdgesDict;
    next?: string;*/

    //getPipeline('dir')
}

export function initConnectPipelineGraph(pipeLineGraphEdges: GraphEdges, globalConfig: Record<string, any>) {
    const getPipeline: (id: string) => PipeLineEntry = initializeDefaultPipelines(globalConfig);
    connectPipelineGraph(pipeLineGraphEdges, globalConfig);
}

export async function process(input: any, options: any): Promise<any> {
    //let graph = options.graph;
    //const defaultPipeLineGraph: PipeLineGraph | null = getDefaultPipeLineGraph(options);

    const defaultPipeLineGraph: IProcessingPipeline | null | undefined = getPipeline('default');

    return await processWithPipelineGraph(input, defaultPipeLineGraph, options);
}