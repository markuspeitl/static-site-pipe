import { GlobalConfig, IResourceProvider } from './global-config';
import { GraphEdges, connectPipeLineGraph } from './pipeline-connect';
import { addPipeLine, getNewPipeLine, getPipeLine } from './pipeline-provider';
import { processWithPipeLineGraph, PipeLineEntry, PipeLine, PipeLinesDict } from './processing-pipeline';
import { NullableArray, NullableString } from './util';

export const defaultPipeLineGraphEdges: GraphEdges = {
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

function createSimplePipeLine(id: string, isTargetOf: (input: any) => Promise<boolean>, stages: PipeLinesDict, globalConfig: GlobalConfig) {

    //const getPipeLine: (id: string) => PipeLineEntry = globalConfig.getPipeLine;
    const getNewPipeLine: (id: string) => PipeLine = globalConfig.getNewPipeLine;
    const pipeLine: PipeLine = getNewPipeLine(id);

    if (typeof pipeLine === 'object' && pipeLine.subchain !== undefined) {
        pipeLine.isTargetOf = isTargetOf;

        for (const key in stages) {
            const currentPipeLine = stages[ key ];
            pipeLine.subchain[ key ] = currentPipeLine;
        }
    }

    return pipeLine;
}

function initDirToFilesPipeLine(globalConfig: GlobalConfig): PipeLine {

    const fsProvider: IResourceProvider = globalConfig.fsProvider;
    const pipeLine: PipeLine = createSimplePipeLine(
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

function initFilesToBuffersPipeLine(globalConfig: GlobalConfig): PipeLine {

    const fsProvider: IResourceProvider = globalConfig.fsProvider;
    const pipeLine: PipeLine = createSimplePipeLine(
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

export function initializeDefaultPipeLines(globalConfig: GlobalConfig) {
    const dirPipeLine: PipeLine = initDirToFilesPipeLine(globalConfig);
    const filePipeLine: PipeLine = initFilesToBuffersPipeLine(globalConfig);
    addPipeLine(dirPipeLine);
    addPipeLine(filePipeLine);
    addPipeLine(filePipeLine, 'template');

    return getPipeLine;
}

export function initConnectPipeLineGraph(pipeLineGraphEdges: GraphEdges, globalConfig: GlobalConfig) {
    const getPipeLine: (id: string) => PipeLineEntry = initializeDefaultPipeLines(globalConfig);
    connectPipeLineGraph(pipeLineGraphEdges, globalConfig);
}

export async function process(input: any, options: any): Promise<any> {
    //let graph = options.graph;
    //const defaultPipeLineGraph: PipeLineGraph | null = getDefaultPipeLineGraph(options);

    const defaultPipeLineGraph: PipeLine | null | undefined = getPipeLine('default');

    return await processWithPipeLineGraph(input, defaultPipeLineGraph, options);
}