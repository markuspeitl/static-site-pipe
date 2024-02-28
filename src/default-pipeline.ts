import { GlobalConfig, IResourceProvider } from './global-config';
import { addPipeLine, getAllPipeLines, getNewPipeLine, getPipeLine, getPipeLineFromFn } from './pipeline-provider';
import { PipeLine, PipeLinesDict } from './pipeline-processing';
import { ItemArrayOrNull, NullableArray, NullableString } from './utils/util';
import { runGraphNode } from './pipeline-graph';
import { createPipeLineGraph, PipeLineInfo } from './pipeline-connect';

const chainExplicitSample = {
    source: 'pipe1',
    pipe1: {
        next: 'pipe2'
    },
    pipe2: {
        next: 'pipe2'
    },
    pipe3: {
        next: 'pipe3'
    },
    pipe4: {
        next: 'sink'
    },
    sink: 'default'
};
const chainImplicitSample = {
    items: [
        'pipe1',
        'pipe2',
        'pipe3',
        'pipe4',
    ]
};

const distributeImplicitSample = {
    parallel: {
        dir: {

        },
        file: {

        },
        template: {

        }
    }
};

//default source -> connected to all child pipelines
//default sink -> ??

// If no connection 'type' is defined, then connect 'start' to all subpipelines
// If not specified otherwise through 'start'
const defaultStartEdgeType: 'branch' | 'distribute' | 'dist' | 'first' = 'branch';


/*type NodeReferences = ItemArrayOrNull<string>;
export interface GraphMeta {
    start?: NodeReferences;
    type?: string;
    next?: NodeReferences;
}
type GraphMetaTypes = NodeReferences | string;
export interface ChainGraph {
    [ key: string ]: Array<string>;
}
type GraphKeyValue = PipeGraphEdges | GraphMetaTypes | any;
export interface PipeGraphEdges extends GraphMeta {
    [ key: string ]: GraphKeyValue;
}
export type GraphSubEdgesDict = Record<string, GraphEdges | null>;*/

export type NodeReferences = ItemArrayOrNull<string>;
export type GraphTypeOptions = 'branch' | 'distribute' | 'dist' | 'first' | 'last' | null | undefined;
export type NextReferenceOption = 'default' | 'sibling' | 'exit' | 'parent' | 'null' | string | undefined;

export interface GraphMeta {
    id?: string;
    start?: NodeReferences;
    type?: GraphTypeOptions;
    next?: NodeReferences;

    //Non data property --> computed
    parent?: PipeGraphEdges;
}

export type LinkGraphValue = string | PipeGraphEdges | ChainGraphEdges;

export interface PipeGraphEdges extends GraphMeta {
    graph?: PipeGraphEdgesDict;
}
export type ChainItems = Array<LinkGraphValue>;
export interface ChainGraphEdges extends GraphMeta {
    items?: ChainItems;
}
export type PipeGraphEdgesDict = {
    [ pipeLineId: string ]: LinkGraphValue;
};


function chainEdges(items: ChainItems, nextAfter?: string | string[]) {

    let next: string | string[] = 'default';
    if (nextAfter) {
        next = nextAfter;
    }

    return {
        items: items, //Has .items -> special pipeline chain -> items are auto connected in series without having to define 'next' for every element
        next,
    };
}

//Adding 'graph' subproperty makes this somewhat difficult to read, but makes it so it can be properly typed
//Note the edges information is discarded during the connection process (it is meta data) and will be represented through references for the actual pipelines.
export const defaultPipeLineGraphEdges: PipeGraphEdges = {
    start: [ 'dir', 'file', 'template' ], //Start defines the entrypoint into the pipeline
    //type: 'dist',
    graph: {
        dir: {
            start: 'chain',
            graph: {
                chain: chainEdges(
                    [
                        'walkDir',
                        {
                            id: 'filterIgnoredFiles',
                            next: [ 'print', 'null' ],
                        },
                        'printDirFiles',
                    ],
                    'dir.end'
                ),
            },
            next: 'file',
        },
        file: {
            start: 'chain',
            graph: {
                chain: chainEdges(
                    [
                        'printFile',
                        {
                            id: 'writeAsset',
                            next: [ 'print', 'null' ],
                        },
                        'readFile',
                    ]
                )
            },
            next: 'template'
        },
        template: {
            start: 'chain',
            graph: {
                chain: chainEdges(
                    [
                        'printTemplate',
                        'preParseTransform',
                        //parseTemplate: {}
                    ],
                    'parsing'
                ),
                //branches get passed the data coming out of the subchain
                parsing: {
                    start: [ 'markdown', 'typescript', 'liquid', 'nunjucks' ],
                    graph: {
                        markdown: {
                            next: 'default' // Branch behaviours: find first, process + exit, find first, process + pass to next match
                        },
                        typescript: {
                            next: 'default'
                        },
                        liquid: {
                            next: 'default'
                        },
                        nunjucks: {
                            next: 'default'
                        },
                    },
                    next: 'default'
                },
            },
            next: 'compiled'
        },
        compiled: {
            start: 'minify',
            graph: {
                minify: {
                    type: 'distribute', //optional property for setting the implicit 'start' node connection type: 'branch','distribute' connects start to all subpipelines
                    graph: {
                        cssMinify: {
                            next: 'default' || 'exitparent',
                        },
                        htmlMinify: {
                            next: 'default' || 'exitparent',
                        }
                    }
                },
            },
            next: 'writeCompiled'
        },
        writeCompiled: {
            start: 'writeBuffer',
            graph: {
                writeBuffer: {
                    next: 'reloadResources'
                },
                reloadResources: {
                    next: 'default'
                }
            },
            next: 'print'
        },
        print: {

        },
    },
    next: undefined
};

/*export const defaultPipeLineGraphEdges: GraphEdges = {
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
};*/

export type IoFunction = (input: any) => Promise<any>;
export type PipeOrFn = PipeLine | IoFunction;

function toPipeLine(fn: IoFunction | PipeLine): PipeLine | null {
    if ((fn as PipeLine).process) {
        return fn as PipeLine;
    }

    if (!fn) {
        return null;
    }
    return getPipeLineFromFn(fn as IoFunction);
}

function resolvePipeLineFunctions(pool: Record<string, PipeOrFn>): PipeLinesDict {

    const resolvedPool: PipeLinesDict = {};
    for (const key in pool) {
        const item = toPipeLine(pool[ key ]);
        if (item) {
            resolvedPool[ key ] = item;
        }
    }
    return resolvedPool;
}

function createSimplePipeLine(id: string, isTargetOf: (input: any) => Promise<boolean>, chainStagesPipePool: Record<string, PipeOrFn>, globalConfig: GlobalConfig): PipeLine | null {

    //const getPipeLine: (id: string) => PipeLine = globalConfig.getPipeLine;

    if (globalConfig.getNewPipeLine) {
        const getNewPipeLine: (id: string) => PipeLine = globalConfig.getNewPipeLine;

        const pipeLine: PipeLine = getNewPipeLine(id);

        const graphEdges: PipeGraphEdges = {
            graph: {
                chain: {
                    items: [
                        ...Object.keys(chainStagesPipePool)
                    ]
                }
            }
        };

        const pipeLinePool: PipeLinesDict = resolvePipeLineFunctions(chainStagesPipePool);

        const pipeLineInfo: PipeLineInfo | null = createPipeLineGraph(id, graphEdges, pipeLinePool, globalConfig);
        if (pipeLineInfo) {
            return pipeLineInfo?.entry;
        }
    }

    return null;


    /*if (typeof pipeLine === 'object' && pipeLine.subchain !== undefined) {
        pipeLine.isTargetOf = isTargetOf;

        for (const key in stages) {
            const currentPipeLine = stages[ key ];
            pipeLine.subchain[ key ] = currentPipeLine;
        }
    }*/
}

function initDirToFilesPipeLine(globalConfig: GlobalConfig): PipeLine | null {

    if (!globalConfig?.fsProvider) {
        throw new Error("Can not initialized directory pipeline -> missing fsProvider on globalConfig");
    }

    const fsProvider: IResourceProvider = globalConfig?.fsProvider;
    const pipeLine: PipeLine | null = createSimplePipeLine(
        'dir',
        async (input: any) => {
            if (!input || typeof input !== 'string') {
                return false;
            }
            const isResourceUri = await fsProvider.isResourceUri(input);
            const uriResourceExists = await fsProvider.exists(input);

            return isResourceUri && uriResourceExists;
        },
        {
            walk: async (dirResourceUri: string) => {

                return fsProvider.getNodeResources(dirResourceUri);

                /*for await (const dirFilesSet of walk(input)) {
    
                }
    
                const filePaths: Promise<NullableArray<string>> = await fsProvider.getNodeResources(dirResourceUri);
                return filePaths;*/
            },
            print: async (input: any) => {
                console.log(input);
                return input;
            },
        },
        globalConfig
    );

    return pipeLine;
}

function initFilesToBuffersPipeLine(globalConfig: GlobalConfig): PipeLine | null {

    if (!globalConfig?.fsProvider) {
        throw new Error("Can not initialized files pipeline -> missing fsProvider on globalConfig");
    }

    const fsProvider: IResourceProvider = globalConfig.fsProvider;
    const pipeLine: PipeLine | null = createSimplePipeLine(
        'file',
        async (input: any) => {
            if (!input || typeof input !== 'string') {
                return false;
            }
            const isResourceUri = await fsProvider.isResourceUri(input);
            const uriResourceExists = await fsProvider.exists(input);

            return isResourceUri && uriResourceExists;
        },
        {
            printFile: async (input: any) => {
                console.log(input);
                return input;
            },
            readFile: async (input: any) => {
                return await fsProvider.readResource(input);
            },
        },
        globalConfig
    );

    return pipeLine;
}

export function initializeDefaultPipeLines(globalConfig: GlobalConfig): PipeLinesDict {
    const dirPipeLine: PipeLine | null = initDirToFilesPipeLine(globalConfig);
    const filePipeLine: PipeLine | null = initFilesToBuffersPipeLine(globalConfig);

    if (!dirPipeLine || !filePipeLine) {
        throw new Error('Failes to initialized dirPipeLine or filePipeLine');
    }

    addPipeLine(dirPipeLine);
    addPipeLine(filePipeLine);
    addPipeLine(filePipeLine, 'template');

    return getAllPipeLines();

    //return getPipeLine;
}

/*export function initConnectPipeLineGraph(pipeLineGraphEdges: GraphEdges, globalConfig: GlobalConfig): PipeLine | null {
    const getPipeLine: (id: string) => PipeLine = initializeDefaultPipeLines(globalConfig);
    return connectPipeLineGraph(pipeLineGraphEdges, globalConfig);
}*/

export async function process(input: any, options: any): Promise<any> {
    //let graph = options.graph;
    //const defaultPipeLineGraph: PipeLineGraph | null = getDefaultPipeLineGraph(options);

    const defaultPipeLineGraph: PipeLine | null | undefined = getPipeLine('default');

    return await runGraphNode(defaultPipeLineGraph, input);
}